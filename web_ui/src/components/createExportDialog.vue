<template>
  <v-dialog v-model="dialog" max-width="500px" @click:outside="errorMessage = ''; dialog = false">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createExport.createExport")}}</v-btn>
    </template>

    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createExport.formTitle")}}</span>
      </v-card-title>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-container>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-select
                    :items="destinationTypes"
                    @input="selectDestinationType"
                    :label="$t('createExport.destinationType')"
                    return-object
                    item-text="name"
                    required
                >
                  <template slot="append-outer"><info-tooltip :message="$t('createExport.destinationHelp')"></info-tooltip> </template>
                </v-select>

                <v-select
                    v-if="adapters.length > 0"
                    :items="adapters"
                    @input="selectAdapter"
                    :label="$t('createExport.adapter')"
                    required
                >
                  <template slot="append-outer"><info-tooltip :message="$t('createExport.adapterHelp')"></info-tooltip> </template>
                </v-select>

                <div v-if="adapter  === 'gremlin'">
                  <h3>{{$t('createExport.gremlinConfiguration')}}</h3>
                  <v-text-field
                      v-model="gremlinConfig.traversal_source"
                      required
                  >
                    <template v-slot:label>{{$t('createExport.traversalSource')}} <small style="color:red" >*</small></template>
                    <template slot="append-outer"><info-tooltip :message="$t('createExport.traversalSourceHelp')"></info-tooltip> </template>
                  </v-text-field>

                  <v-row>
                   <v-col :cols="6">
                     <v-text-field
                         v-model="gremlinConfig.user"
                         required
                     >
                       <template v-slot:label>{{$t('createExport.user')}}</template>
                       <template slot="append-outer"><info-tooltip :message="$t('createExport.userHelp')"></info-tooltip> </template>
                     </v-text-field>
                   </v-col>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="gremlinConfig.key"
                          required
                      >
                        <template v-slot:label>{{$t('createExport.key')}}</template>
                        <template slot="append-outer"><info-tooltip :message="$t('createExport.keyHelp')"></info-tooltip> </template>
                      </v-text-field>
                    </v-col>
                  </v-row>
                  <v-text-field
                      v-model="gremlinConfig.endpoint"
                      required
                  >
                    <template v-slot:label>{{$t('createExport.endpoint')}} <small style="color:red" >*</small></template>
                    <template slot="append-outer"><info-tooltip :message="$t('createExport.endpointHelp')"></info-tooltip> </template>
                  </v-text-field>
                  <v-text-field
                      v-model="gremlinConfig.port"
                      required
                  >
                    <template v-slot:label>{{$t('createExport.port')}} <small style="color:red" >*</small></template>
                    <template slot="append-outer"><info-tooltip :message="$t('createExport.portHelp')"></info-tooltip> </template>
                  </v-text-field>
                  <v-text-field
                      v-model="gremlinConfig.path"
                      required
                  >
                    <template v-slot:label>{{$t('createExport.path')}}</template>
                    <template slot="append-outer"><info-tooltip :message="$t('createExport.pathHelp')"></info-tooltip> </template>
                  </v-text-field>
                  <v-text-field
                      v-model="gremlinConfig.writes_per_second"
                      required
                      type="number"
                  >
                    <template v-slot:label>{{$t('createExport.writes')}} <small style="color:red" >*</small></template>
                    <template slot="append-outer"><info-tooltip :message="$t('createExport.writesHelp')"></info-tooltip> </template>
                  </v-text-field>
                </div>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createExport.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("home.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="createExport" >{{$t("home.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from "vue-property-decorator"
import {ExportT, GremlinExportConfigT} from "@/api/types";

type destination = {
  name: string;
  adapters: string[];
}

@Component
export default class CreateExportDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  @Watch("dialog" ,{immediate: true})
  onDialogChange() {
    if(!this.dialog) {
      this.reset()
    }
  }


  errorMessage = ""
  dialog= false
  valid = true
  select = ""
  select_auth = ""
  destinationTypes: destination[] = [
    {name: "AWS Neptune", adapters: ["gremlin"]},
    {name: "Neo4J", adapters: ["gremlin"]},
    {name: "CosmosDB", adapters: ["gremlin"]},
    {name: "JanusGraph", adapters: ["gremlin"]},
    {name: "TinkerPop Enabled System", adapters: ["gremlin"]}
  ]
  // this will be dynamically filled in based on the destination_type selection
  adapters: string[] = []

  destination_type = ""
  adapter = ""
  gremlinConfig: GremlinExportConfigT = {
    traversal_source: "",
    user: "",
    key: "",
    endpoint: "",
    port: "", // port is a string due to the type expected by DL also being a string
    path: "",
    writes_per_second: 100, // sane default
  }

  selectDestinationType(destinationType: destination) {
    this.adapters = destinationType.adapters as string[]
    this.destination_type = destinationType.name
  }

  selectAdapter(adapter: string) {
    this.adapter = adapter
  }

  reset() {
    this.destination_type = ""
    this.adapter = ""
    this.gremlinConfig = {
      traversal_source: "",
      user: "",
      key: "",
      endpoint: "",
      port: "", // port is a string due to the type expected by DL also being a string
      path: "",
      writes_per_second: 100, // sane default
    }
  }

  createExport() {
    this.$client.createExport(this.containerID, {
      destination_type: this.destination_type,
      adapter: this.adapter,
      config: this.gremlinConfig // TODO: create a way to manage more adapter config types
    } as ExportT)
    .then(result => {
      if(!result) {
        this.errorMessage = this.$t('createExport.errorCreatingAPI') as string
      } else {
        this.dialog = false

        this.$emit('exportCreated', result)
        this.reset()
      }
    })
    .catch(e => this.errorMessage = this.$t('createExport.errorCreatingAPI') as string + e)
  }

}
</script>
