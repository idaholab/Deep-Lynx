<template>
  <v-dialog v-model="dialog" width="40%" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createNode.createNode")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createNode.formTitle")}}</span>
        <error-banner :message="errorMessage"></error-banner>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col :cols="12">
              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-autocomplete
                    v-model="metatype"
                    :rules="[v => !!v || $t('createNode.metatypeRequired')]"
                    :single-line="false"
                    :loading="metatypesLoading"
                    :items="originMetatypes"
                    :search-input.sync="originSearch"
                    item-text="name"
                    return-object
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createNode.metatype')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-col :cols="12" v-if="Object.keys(metatype).length !== 0">
                  <v-checkbox 
                    v-model="optional"
                    :label="'Show Optional Fields'"
                  ></v-checkbox>
                  <v-col :cols="12">
                    <v-data-table
                        :items="metatype.keys"
                        :disable-pagination="true"
                        :hide-default-footer="true"
                        v-if="optional === true"
                    >
                      <template v-slot:[`item`]="{ item }">
                        <v-text-field v-model="item['default_value']"><template v-slot:label>{{item["name"]}}</template></v-text-field>
                      </template>
                    </v-data-table>
                  </v-col>
                </v-col>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createNode.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("createNode.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text :disabled="!valid" @click="newNode()">{{$t("createNode.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeT, PropertyT} from "@/api/types";

@Component
export default class CreateNodeDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  metatypesLoading = false
  dialog = false
  valid = false
  optional = false
  originSearch = ""
  metatype: any = {}
  propertyValue = ""
  
  property = {}
  
  properties: PropertyT[] = []
  originMetatypes: MetatypeT[] = []

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(!this.dialog) this.reset()
  }

  @Watch('originSearch', {immediate: true})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal, loadKeys: true, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
          this.metatypesLoading = false
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('metatype', {immediate: true})
  onMetatypeSelect(){
    if (this.metatype.id !== undefined && this.metatype.id !== null)
      this.$client.listMetatypeKeys(this.containerID, this.metatype.id)
      .then((keys) => {
        this.metatype.keys = keys
      })
  }

  newNode() {
    if (this.metatype.id !== undefined && this.metatype.id !== null){
      this.setProperties()
      this.$client.createNode(this.containerID,
        {
          "container_id": this.containerID,
          "data_source_id": this.dataSourceID,
          "metatype_id": this.metatype.id,
          "properties": this.property,
        }
      )
          .then(results => {
            this.dialog = false
            this.$emit('nodeCreated', results[0])
          })
          .catch(e => this.errorMessage = this.$t('createNode.errorCreatingAPI') as string + e)
    }
  }

  // Fill the property object with values from the metatype keys before sending the createNode query
  setProperties() {
    const property: { [key: string]: any } = {}
    this.metatype.keys.forEach( (key: any) => {
      if (String(key.default_value).toLowerCase() === "true") {
        key.default_value = true
      } else if (String(key.default_value).toLowerCase() === "false" ) {
         key.default_value = false
      } else if (String(key.default_value) === "") {
        key.default_value = null
      } else if (String(key.default_value) === "null") {
        key.default_value = null
      }
      property[key.property_name] = key.default_value
    }) 
    this.property = property
  }

  reset() {
    this.metatype = {}
  }
}

</script>
