<template>
    <v-dialog v-model="dialog" @click:outside="close" max-width="60%">
      <template v-slot:activator="{ on }">
        <v-icon
            v-if="icon"
            small
            class="mr-2"
            v-on="on"
        >mdi-pencil</v-icon>
        <v-btn v-if="!icon" style="max-width: fit-content" color="primary" dark class="mt-2" v-on="on">{{$t("nodes.edit")}}</v-btn>
      </template>

      <v-card class="pt-1 pb-3 px-2" v-if="selectedNode">
        <v-card-title>
          <span class="headline text-h3">{{$t('general.edit')}} {{nodeName}} ({{selectedNode.metatype.name}})</span>
        </v-card-title>
        <v-card-text>
          <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
          <v-row>
            <v-col :cols="12">
              <v-data-table
                  :headers="headers()"
                  :items="nodeProperties"
                  :disable-pagination="true"
                  :hide-default-footer="true"
                  class="elevation-1"
              >
                <template v-slot:top>
                  <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t('properties.properties')}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>

                    <!-- Add Property Dialog -->
                    <v-dialog
                      v-model="addPropertyDialog"
                      @click:outside="closeAddPropertyDialog"
                      max-width="50%"
                    >
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        color="primary"
                        dark
                        class="mt-2"
                        v-bind="attrs"
                        v-on="on"
                      >
                        {{$t("properties.add")}}
                      </v-btn>
                    </template>
                    <v-card>
                      <v-card-title>
                        <span class="text-h5">{{$t("properties.add")}}</span>
                      </v-card-title>

                      <v-card-text>
                        <v-container>
                          <v-row>
                            <v-col
                              cols="4"
                            >
                              <v-autocomplete
                                v-model="newProperty.key"
                                :items = "metatypeKeys"
                                item-text = "name"
                                item-value = "property_name"
                                :label="$t('general.key')"
                                @change="getKey"
                              ></v-autocomplete>
                            </v-col>
                            <v-col
                              cols="2"
                            >
                              <v-text-field
                                v-model="newProperty.type"
                                :label="$t('general.type')"
                                disabled
                              ></v-text-field>
                            </v-col>
                            <v-col
                              cols="6"
                            >
                              <v-text-field
                                v-model="newProperty.value"
                                :label="$t('general.value')"
                              ></v-text-field>
                            </v-col>
                          </v-row>
                        </v-container>
                      </v-card-text>

                      <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                          color="primary"
                          text
                          @click="closeAddPropertyDialog"
                        >
                          {{$t("general.cancel")}}
                        </v-btn>
                        <v-btn
                          color="primary"
                          text
                          @click="addProperty"
                        >
                          {{$t("general.save")}}
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-dialog>

                  </v-toolbar>
                </template>
                <template v-slot:[`item.value`]="value">
                  <v-edit-dialog
                      :return-value.sync="value.item.value"
                  >
                    {{ value.item.value }}
                    <template v-slot:input>
                      <v-text-field
                        v-model="value.item.value"
                        :label="$t('general.edit')"
                      ></v-text-field>
                    </template>
                  </v-edit-dialog>
                </template>

                <template v-slot:[`item.actions`]="{ item }">
                  <v-icon
                      small
                      @click="deleteProperty(item)"
                  >
                    mdi-delete
                  </v-icon>
                </template>
              </v-data-table>
            </v-col>
            <v-col :cols="12">
              <v-checkbox
                  v-model="alterCreatedAt"
                  :label="$t('general.alterCreatedAt')"
                  v-observe-visibility="loadDatePickr"
              ></v-checkbox>
              <div  v-show="alterCreatedAt">
                <div class="d-block">
                  <label for="createdAtDate" style="padding-right: 4px">{{$t('general.createdAt')}}: </label>
                  <input type="text" :placeholder="$t('timeseries.selectDate')" id="createdAtDate" />
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="close" >{{$t("general.cancel")}}</v-btn>
          <v-btn color="primary" text @click="updateNode">{{$t("general.save")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>

  <script lang="ts">
  import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
  import {MetatypeKeyT, NodeT, PropertyT} from "../../api/types";
  import flatpickr from "flatpickr";

  @Component({components: {}})
  export default class EditNodeDialog extends Vue {
    @Prop({required: true})
    node!: any;

    @Prop({required: true})
    containerID!: string;

    @Prop({required: true})
    dataSourceID!: string;

    @Prop({required: false})
    readonly icon!: boolean

    errorMessage = ""
    dialog = false
    selectedNode: NodeT | null  = null
    nodeProperties: PropertyT[] = []
    property = {}
    nodeName = ""
    addPropertyDialog = false

    newProperty: PropertyT = {
      key: '',
      value: '',
      type: ''
    }

    metatypeKeys: MetatypeKeyT[] = []

    alterCreatedAt = false
    createdAtDate = new Date().toISOString()

    // load properties to array when the node is selected so that we can edit fields.
    @Watch('dialog', {immediate: true})
    isDialogOpen() {
      if(this.dialog) {
        this.propertiesToArray()
      }
    }

    headers() {
      return  [
        { text: this.$t('general.name'), value: 'key'},
        { text: this.$t('general.value'), value: 'value'},
        { text: this.$t('general.actions'), value: 'actions', sortable: false }
      ]
    }

    loadDatePickr() {
      const createdAtPickr = flatpickr('#createdAtDate', {
        altInput: true,
        altFormat: 'F j, y h:i:S K',
        dateFormat: 'Z',
        enableTime: true,
        enableSeconds: true,
        allowInput: true,
      }) as flatpickr.Instance;

      (createdAtPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => {
        this.createdAtDate = dateStr;
      });
      (createdAtPickr as flatpickr.Instance).setDate(this.createdAtDate);
    }

    async propertiesToArray() {
      // have to do this to avoid mutating properties
      this.selectedNode = JSON.parse(JSON.stringify(this.node))
      this.nodeName = (this.selectedNode!.properties as any).name ? (this.selectedNode!.properties as any).name : this.selectedNode!.id

      // grab all metatype keys
      this.metatypeKeys = await this.$client.listMetatypeKeys(this.containerID, this.selectedNode!.metatype!.id!)

      if (this.selectedNode) {
        this.nodeProperties = []
        Object.entries(this.selectedNode.properties).forEach(([key, text]) => {
          const object = {key: key, value: String(text)} as PropertyT
          this.nodeProperties.push(object)
        })
      }

    }

    setProperties() {
      this.property = {}
      const entries: { [key: string]: any } = {}

      this.nodeProperties.forEach( (property: any) => {
        // look at supplied data type to determine property value changes
        // types: ['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean', 'enumeration', 'file', 'list', 'unknown']
        const key = this.metatypeKeys.filter((key: MetatypeKeyT) => {
          return key.property_name === property.key
        })
        if (key.length > 0) property.type = key[0].data_type

        if (property.type === 'boolean') {
          if (String(property.value).toLowerCase() === "true") {
            property.value = true
          } else if (String(property.value).toLowerCase() === "false" ) {
            property.value = false
          }
        } else if (property.type === 'number') {
          property.value = parseInt(property.value)
        } else if (property.type === 'number64') {
          property.value = parseInt(property.value)
        } else if (property.type === 'float') {
          property.value = parseFloat(property.value)
        } else if (property.type === 'float64') {
          property.value = parseFloat(property.value)
        } else if (property.type === 'list') {
          property.value = property.value.split(',')
        }

        // default to string behavior
        entries[property.key] = property.value
      })

      this.property = entries
    }

    updateNode() {
      this.setProperties()
      const node: any = {
        "container_id": this.containerID,
        "data_source_id": this.dataSourceID,
        "import_data_id": this.selectedNode!.import_data_id,
        "type_mapping_transformation_id": this.selectedNode!.type_mapping_transformation_id,
        "data_staging_id": this.selectedNode!.data_staging_id,
        "original_data_id": this.selectedNode!.original_data_id,
        "metadata": this.selectedNode!.metadata,
        "metatype_id": this.selectedNode!.metatype!.id,
        "properties": this.property,
        "id": this.selectedNode!.id
      }
      if (this.alterCreatedAt) node.created_at = this.createdAtDate

      this.$client.createOrUpdateNode(this.containerID, node)
        .then((results: NodeT[]) => {
          this.close()
          const emitNode = results[0]

          emitNode.metatype_id = this.node.metatype.id!
          emitNode.metatype_name = this.node.metatype.name
          this.$emit('nodeUpdated', emitNode)
        })
        .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
    }

    addProperty() {
      this.nodeProperties.push(this.newProperty)
      this.closeAddPropertyDialog()
    }

    deleteProperty(item: PropertyT) {
      this.nodeProperties = this.nodeProperties.filter(( property: PropertyT ) => {
        return property.key !== item.key && property.value !== item.value;
      })
    }

    getKey() {
      const key = this.metatypeKeys.filter((key: MetatypeKeyT) => {
        return key.property_name === this.newProperty.key
      })
      if (key.length > 0) this.newProperty.type = key[0].data_type

    }

    close() {
      // reset node and properties
      this.selectedNode = null
      this.nodeProperties = []
      this.errorMessage = ""
      this.dialog = false
    }

    closeAddPropertyDialog() {
      // reset property
      this.newProperty = {
        key: '',
        value: '',
        type: ''
      }
      this.addPropertyDialog = false
    }
  }

  </script>
