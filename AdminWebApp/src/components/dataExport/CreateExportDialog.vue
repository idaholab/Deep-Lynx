<template>
  <v-dialog v-model="dialog" max-width="500px" @click:outside="errorMessage = ''; dialog = false">
    <template v-slot:activator="{ on }">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("exports.create")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("exports.createNew")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-select
                  :items="destinationTypes"
                  @input="selectDestinationType"
                  :label="$t('exports.destinationType')"
                  return-object
                  item-text="name"
                  required
              >
                <template slot="append-outer"><info-tooltip :message="$t('help.exportDestination')"></info-tooltip> </template>
              </v-select>

              <v-select
                  v-if="adapters.length > 0"
                  :items="adapters"
                  @input="selectAdapter"
                  :label="$t('exports.protocol')"
                  required
              >
                <template slot="append-outer"><info-tooltip :message="$t('help.exportProtocol')"></info-tooltip> </template>
              </v-select>

              <div v-if="adapter  === 'gremlin'">
                <h3>{{$t('exports.gremlinConfiguration')}}</h3>
                <v-text-field
                    v-model="gremlinConfig.traversal_source"
                    required
                >
                  <template v-slot:label>{{$t('exports.traversal')}} <small style="color:red" >*</small></template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.exportTraversal')"></info-tooltip> </template>
                </v-text-field>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="gremlinConfig.user"
                        required
                    >
                      <template v-slot:label>{{$t('general.username')}}</template>
                      <template slot="append-outer"><info-tooltip :message="$t('help.exportUsername')"></info-tooltip> </template>
                    </v-text-field>
                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="gremlinConfig.key"
                        required
                    >
                      <template v-slot:label>{{$t('general.password')}}</template>
                      <template slot="append-outer"><info-tooltip :message="$t('help.exportPassword')"></info-tooltip> </template>
                    </v-text-field>
                  </v-col>
                </v-row>
                <v-text-field
                    v-model="gremlinConfig.endpoint"
                    required
                >
                  <template v-slot:label>{{$t('general.endpoint')}} <small style="color:red" >*</small></template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.exportEndpoint')"></info-tooltip> </template>
                </v-text-field>
                <v-text-field
                    v-model="gremlinConfig.port"
                    required
                >
                  <template v-slot:label>{{$t('general.port')}} <small style="color:red" >*</small></template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.exportPort')"></info-tooltip> </template>
                </v-text-field>
                <v-text-field
                    v-model="gremlinConfig.path"
                    required
                >
                  <template v-slot:label>{{$t('general.path')}}</template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.exportPath')"></info-tooltip> </template>
                </v-text-field>
                <v-text-field
                    v-model="gremlinConfig.writes_per_second"
                    required
                    type="number"
                >
                  <template v-slot:label>{{$t('exports.wps')}} <small style="color:red" >*</small></template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.exportWrites')"></info-tooltip> </template>
                </v-text-field>
              </div>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="createExport" >{{$t("general.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ExportT, GremlinExportConfigT} from "@/api/types";

  type destination = {
    name: string;
    adapters: string[];
  }

  interface CreateExportDialogModel {
    errorMessage: string,
    dialog: boolean,
    valid: boolean,
    select: string,
    select_auth: string
    destination_type: string
    adapters: string[]
    adapter: string
    gremlinConfig: GremlinExportConfigT
  }

  export default Vue.extend ({
    name: 'CreateExportDialog',

    props: {
      containerID: {type: String, required: true},
      icon: {type: Boolean, required: false},
    },

    data: (): CreateExportDialogModel => ({
      errorMessage: "",
      dialog: false,
      valid: true,
      select: "",
      select_auth: "",
      destination_type: "",
      adapters: [],
      adapter: "",
      gremlinConfig: {
        kind: "gremlin",
        traversal_source: "",
        user: "",
        key: "",
        endpoint: "",
        port: "", // port is a string due to the type expected by DL also being a string
        path: "",
        writes_per_second: 100, // sane default
      }
    }),

    computed: {
      destinationTypes(): {name: string, adapters: string[]}[] {
        return [
          {name: this.$t('exports.neptune') as string, adapters: ["gremlin"]},
          {name: this.$t('exports.neo4j') as string, adapters: ["gremlin"]},
          {name: this.$t('exports.cosmo') as string, adapters: ["gremlin"]},
          {name: this.$t('exports.janus') as string, adapters: ["gremlin"]},
          {name: this.$t('exports.tinkerPop') as string, adapters: ["gremlin"]}
        ]
      },
    },

    watch: {
      dialog: {
        handler: 'onDialogChange',
        immediate: true
      }
    },

    methods: {
      onDialogChange() {
        if(!this.dialog) {
          this.reset()
        }
      },
      selectDestinationType(destinationType: destination) {
        this.adapters = destinationType.adapters as string[]
        this.destination_type = destinationType.name
      },
      selectAdapter(adapter: string) {
        this.adapter = adapter
      },
      reset() {
        this.destination_type = ""
        this.adapter = ""
        this.gremlinConfig = {
          kind: "gremlin",
          traversal_source: "",
          user: "",
          key: "",
          endpoint: "",
          port: "", // port is a string due to the type expected by DL also being a string
          path: "",
          writes_per_second: 100, // sane default
        }
      },
      createExport() {
        this.$client.createExport(this.containerID, {
          destination_type: this.destination_type,
          adapter: this.adapter,
          config: this.gremlinConfig
        } as ExportT)
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('errors.errorCommunicating') as string
          } else {
            this.dialog = false

            this.$emit('exportCreated', result)
            this.reset()
          }
        })
        .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      }
    }
  });
</script>