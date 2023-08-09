<template>
    <v-dialog v-model="dialog" @click:outside="close" max-width="60%">
      <template v-slot:activator="{ on }">
        <v-icon
            v-if="icon"
            small
            class="mr-2"
            v-on="on"
        >mdi-pencil</v-icon>
        <v-btn style="max-width: fit-content" color="primary" dark class="mt-2" v-on="on">{{$t("edges.edit")}}</v-btn>
      </template>

      <v-card class="pt-1 pb-3 px-2" v-if="selectedEdge">
        <v-card-title>
          <span class="headline text-h3">{{$t('general.edit')}} ({{selectedEdge.metatype_relationship.name}})</span>
        </v-card-title>
        <v-card-text>
          <error-banner :message="errorMessage"></error-banner>
          <v-row>
            <v-col :cols="12">
              <v-data-table
                  :headers="headers()"
                  :items="edgeProperties"
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
                                :items = "relationshipKeys"
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
          <v-btn color="primary" text @click="updateEdge">{{$t("general.save")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>

  <script lang="ts">
  import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
  import {EdgeT, MetatypeKeyT, MetatypeRelationshipKeyT, PropertyT} from "../../api/types";
  import flatpickr from "flatpickr";

  @Component({components: {}})
  export default class EditEdgeDialog extends Vue {
    @Prop({required: true})
    edge!: any;

    @Prop({required: true})
    containerID!: string;

    @Prop({required: true})
    dataSourceID!: string;

    @Prop({required: false})
    readonly icon!: boolean

    errorMessage = ""
    dialog = false
    selectedEdge: EdgeT | null  = null
    edgeProperties: PropertyT[] = []
    property = {}
    edgeName = ""
    addPropertyDialog = false

    newProperty: PropertyT = {
      key: '',
      value: '',
      type: ''
    }

    relationshipKeys: MetatypeRelationshipKeyT[] = []

    alterCreatedAt = false
    createdAtDate = new Date().toISOString()

    // load properties to array when the edge is selected so that we can edit fields.
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
      this.selectedEdge = JSON.parse(JSON.stringify(this.edge))
      this.edgeName = (this.selectedEdge!.properties as any).name ? (this.selectedEdge!.properties as any).name : this.selectedEdge!.id
      console.log(this.selectedEdge);
      // grab all metatype keys
      this.relationshipKeys = await this.$client.listMetatypeRelationshipKeys(this.containerID, this.selectedEdge!.metatype_relationship!.id!)

      if (this.selectedEdge) {
        this.edgeProperties = []
        Object.entries(this.selectedEdge.properties).forEach(([key, text]) => {
          const object = {key: key, value: String(text)} as PropertyT
          this.edgeProperties.push(object)
        })
      }

    }

    setProperties() {
      this.property = {}
      const entries: { [key: string]: any } = {}

      this.edgeProperties.forEach( (property: any) => {
        // look at supplied data type to determine property value changes
        // types: ['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean', 'enumeration', 'file', 'list', 'unknown']
        const key = this.relationshipKeys.filter((key: MetatypeKeyT) => {
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

    updateEdge() {
      this.setProperties()
      const edge: any = {
        "container_id": this.containerID,
        "data_source_id": this.dataSourceID,
        "relationship_id": this.selectedEdge!.metatype_relationship!.id,
        "properties": this.property,
        "id": this.selectedEdge!.id
      }
      if (this.alterCreatedAt) edge.created_at = this.createdAtDate

      this.$client.createEdge(this.containerID, edge)
        .then((results: EdgeT[]) => {
          this.close()
          const emitEdge = results[0]

          emitEdge.relationship_id = this.edge.metatype_relationship.id!
          emitEdge.metatype_relationship_name = this.edge.metatype_relationship.name
          this.$emit('edgeUpdated', emitEdge)
        })
        .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
    }

    addProperty() {
      this.edgeProperties.push(this.newProperty)
      this.closeAddPropertyDialog()
    }

    deleteProperty(item: PropertyT) {
      this.edgeProperties = this.edgeProperties.filter(( property: PropertyT ) => {
        return property.key !== item.key && property.value !== item.value;
      })
    }

    getKey() {
      const key = this.relationshipKeys.filter((key: MetatypeRelationshipKeyT) => {
        return key.property_name === this.newProperty.key
      })
      if (key.length > 0) this.newProperty.type = key[0].data_type

    }

    close() {
      // reset edge and properties
      this.selectedEdge = null
      this.edgeProperties = []
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
