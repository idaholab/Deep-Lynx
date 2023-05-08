<template>
    <v-card class="pt-1 pb-3 px-2">
        <v-card-title>
        <span class="headline text-h3">{{$t("createNode.formTitle")}}</span>
        </v-card-title>
        <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
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
                <v-col :cols="12" v-if="metatype && Object.keys(metatype).length !== 0">
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
                        <div v-if="item['data_type'] === 'enumeration'">
                          <v-combobox
                              v-model="item['default_value']"
                              :label="item['name']"
                              :items="item['options']"
                          ></v-combobox>
                        </div>

                        <div v-if="item['data_type'] === 'boolean'">
                          <v-select
                              v-model="item['default_value']"
                              :label="item['name']"
                              :items="booleanOptions"
                          ></v-select>
                        </div>
                        <div v-if="item['data_type'] !== 'enumeration' && item['data_type'] !== 'boolean'">
                          <v-text-field 
                              v-if="item['data_type'] === 'number'||item['data_type'] === 'float'"
                              v-model="item['default_value']"
                              type="number"
                              :label="item['name']"
                          ></v-text-field>
                          <v-text-field
                              v-else
                              v-model="item['default_value']"
                              :label="item['name']"
                              :disabled="item['data_type'] === 'file'"
                          ></v-text-field>
                        </div>
                    </template>
                    </v-data-table>
                </v-col>
                </v-col>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('createNode.requiredField')}}</p>
            </v-col>
        </v-row>
        </v-card-text>
        <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="close()" >{{$t("createNode.cancel")}}</v-btn>
        <v-btn color="primary" text :disabled="!valid" @click="newNode()">{{$t("createNode.save")}}</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeT, PropertyT, NodeT, MetatypeKeyT} from "@/api/types";

@Component
export default class CreateNodeDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  @Prop({required: false, default: false})
  dialog!: boolean;

  errorMessage = ""
  metatypesLoading = false
  valid = false
  optional = false
  originSearch = ""
  metatype: any = {}
  propertyValue = ""
  booleanOptions = [true, false]

  property = {}

  properties: PropertyT[] = []
  originMetatypes: MetatypeT[] = []


  @Watch('originSearch', {immediate: true})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal, loadKeys: true, ontologyVersion: this.$store.getters.currentOntologyVersionID})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
          this.metatypesLoading = false
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('metatype', {immediate: true})
  onMetatypeSelect(){

    if (this.metatype?.id !== undefined && this.metatype?.id !== null)
      this.$client.listMetatypeKeys(this.containerID, this.metatype.id)
      .then((keys) => {
        this.metatype.keys = keys
    })
  }

  newNode() {
    if (this.metatype.id !== undefined && this.metatype.id !== null){
      this.setProperties()
      this.$client.createOrUpdateNode(this.containerID,
        {
          "container_id": this.containerID,
          "data_source_id": this.dataSourceID,
          "metatype_id": this.metatype.id,
          "properties": this.property,
        }
      )
          .then((results: NodeT[]) => {
            const node = results[0]
            node.metatype_name = this.metatype.name

            this.$emit('nodeCreated', node)
            this.close()
          })
          .catch(e => this.errorMessage = this.$t('createNode.errorCreatingAPI') as string + e)
    }
  }

  // Fill the property object with values from the metatype keys before sending the createNode query
  setProperties() {
    const property: { [key: string]: any } = {}
    this.metatype.keys.forEach( (key: MetatypeKeyT) => {
      
      if (String(key.default_value).toLowerCase() === "true") {
        key.default_value = true
      } else if (String(key.default_value).toLowerCase() === "false" ) {
        key.default_value = false
      } else if (String(key.default_value) === "" || String(key.default_value) === "null") {
        key.default_value = undefined
      }

      if(key.data_type === "number") {
        key.default_value = parseInt(key.default_value as string, 10)
      }

      if(key.data_type === "float") {
        key.default_value = parseFloat(key.default_value as string)
      }

      property[key.property_name] = key.default_value
    })
    this.property = property
  }

  reset() {
    this.metatype = {}
  }

  close() {
    this.reset()
    this.$emit('close')
  }
}

</script>
