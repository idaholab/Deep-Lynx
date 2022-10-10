<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="70%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("editDataSource.editDataSource")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("editDataSource.formTitle")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-text-field
                  v-model="dataSource.name"
                  :label="$t('editDataSource.name')"
                  :rules="[v => !!v || 'Item is required']"
              ></v-text-field>
              <v-select
                  v-model="dataSource.adapter_type"
                  :items="adapterTypes()"
                  :label="$t('editDataSource.sourceType')"
                  disabled
                  :rules="[v => !!v || 'Item is required']"
              ></v-select>


              <div v-if="dataSource.adapter_type === 'http'">
                <v-text-field
                    v-model="dataSource.config.endpoint"
                    :label="$t('editDataSource.endpoint')"
                    :rules="[v => !!v || 'Item is required']"
                ></v-text-field>

                <v-select
                    v-model="dataSource.config.auth_method"
                    :items="authMethods"
                    :label="$t('editDataSource.authMethod')"
                    :rules="[v => !!v || 'Item is required']"
                >
                </v-select>
                <div v-if="dataSource.config.auth_method === 'basic'">
                  <v-text-field
                      v-model="dataSource.config.username"
                      :label="$t('editDataSource.username')"
                      :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.password"
                      :label="$t('editDataSource.password')"
                      :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>
                </div>

                <div v-if="dataSource.config.auth_method === 'token'">
                  <v-text-field
                      v-model="dataSource.config.token"
                      :label="$t('editDataSource.token')"
                      :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                </div>
                  <v-text-field
                      v-model="dataSource.config.poll_interval"
                      :label="$t('editDataSource.pollInterval')"
                      type="number"
                      :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.timeout"
                      :label="$t('editDataSource.timeout')"
                      type="number"
                      :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-checkbox
                      v-model="dataSource.config.secure"
                      :label="$t('editDataSource.secure')"
                      :rules="[v => !!v || 'Item is required']"
                  ></v-checkbox>

              </div>

                <div v-if="dataSource.adapter_type === 'jazz'">
                  <v-text-field
                      v-model="dataSource.config.project_name"
                      :label="$t('editDataSource.projectName')"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="dataSource.config.artifact_types"
                      :label="$t('editDataSource.artifactTypes')"
                      :placeholder="$t('editDataSource.typeToAdd')"
                  ></v-combobox>

                  <v-text-field
                      v-model="dataSource.config.endpoint"
                      :label="$t('editDataSource.endpoint')"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.token"
                      :label="$t('editDataSource.token')"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.poll_interval"
                      :label="$t('editDataSource.pollInterval')"
                      type="number"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.timeout"
                      :label="$t('editDataSource.timeout')"
                      type="number"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.limit"
                      :label="$t('editDataSource.recordLimit')"
                      type="number"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-text-field>

                  <v-checkbox
                      v-model="dataSource.config.secure"
                      :label="$t('editDataSource.secure')"
                       :rules="[v => !!v || 'Item is required']"
                  ></v-checkbox>
                </div>

              <div v-if="dataSource.adapter_type === 'aveva'">
                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="dataSource.config.ignore_dbs"
                    :label="$t('editDataSource.ignoreDBs')"
                    :placeholder="$t('editDataSource.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="dataSource.config.ignore_element_types"
                    :label="$t('editDataSource.ignoreElements')"
                    :placeholder="$t('editDataSource.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="dataSource.config.ifc_element_types"
                    :label="$t('editDataSource.ifcElementTypes')"
                    :placeholder="$t('editDataSource.typeToAdd')"
                ></v-combobox>

                <h3>{{$t("editDataSource.ifcSettingsTitle")}}</h3>
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.format"
                        :label="$t('editDataSource.ifcSettings.format')"
                         :rules="[v => !!v || 'Item is required']"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.data_level"
                        :label="$t('editDataSource.ifcSettings.dataLevel')"
                         :rules="[v => !!v || 'Item is required']"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.log_detail"
                        :label="$t('editDataSource.ifcSettings.logLevel')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.arc_tolerance"
                        :label="$t('editDataSource.ifcSettings.arcTolerance')"
                         :rules="[v => !!v || 'Item is required']"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="dataSource.config.ifc_settings.component_level"
                        :label="$t('editDataSource.ifcSettings.componentLevel')"
                    ></v-checkbox>

                  </v-col>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="dataSource.config.ifc_settings.tube"
                        :label="$t('editDataSource.ifcSettings.tube')"
                    ></v-checkbox>

                  </v-col>

                  <v-col :cols="4">
                    <v-checkbox
                        v-model="dataSource.config.ifc_settings.cl"
                        :label="$t('editDataSource.ifcSettings.cl')"
                    ></v-checkbox>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.insu_translucency"
                        :label="$t('editDataSource.ifcSettings.insuTranslucency')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.obst_translucency"
                        :label="$t('editDataSource.ifcSettings.obstTranslucency')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.root"
                        :label="$t('editDataSource.ifcSettings.root')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.pipe"
                        :label="$t('editDataSource.ifcSettings.pipe')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
                <v-row>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.nozzle"
                        :label="$t('editDataSource.ifcSettings.nozzle')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.structure"
                        :label="$t('editDataSource.ifcSettings.structure')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.cable"
                        :label="$t('editDataSource.ifcSettings.cable')"
                         :rules="[v => !!v || 'Item is required']"
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
              </div>

              <div v-if="dataSource.adapter_type === 'timeseries'">
                <h4>{{$t('dataMapping.tableDesign')}}<info-tooltip :message="$t('dataMapping.tableDesignHelp')"></info-tooltip></h4>

                <v-data-table
                    :headers="timeSeriesHeader()"
                    :items="dataSource.config.columns"
                    :items-per-page="-1"
                    :expanded.sync="expandedTimeSeries"
                    mobile-breakpoint="960"
                    item-key="id"
                    show-expand
                    flat
                    tile
                    fixed-header
                    disable-pagination
                    disable-sort
                    hide-default-footer
                >
                  <template v-slot:[`item.column_name`]="{ item , index }">
                    <span style="visibility: hidden" :id="`timeseries_column_${index}`"></span>

                    <v-text-field
                        :label="$t('dataMapping.columnName')"
                        v-model="item.column_name"
                        disabled
                    >
                    </v-text-field>
                  </template>

                  <template v-slot:[`item.type`]="{ item }">
                    <v-select
                        :label="$t('dataMapping.columnDataType')"
                        v-model="item.type"
                        disabled
                    />
                  </template>

                  <template v-slot:[`item.property_name`]="{ item }">
                    <v-text-field
                        :label="$t('createDataSource.propertyName')"
                        v-model="item.property_name"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                    >
                    </v-text-field>

                  </template>


                  <template v-slot:[`item.unique`]="{ item}">
                    <v-select
                        :label="$t('createDataSource.unique')"
                        :items="[true, false]"
                        v-model="item.unique"
                        disabled
                    />
                  </template>

                  <template v-slot:expanded-item="{ item }">
                    <td :colspan="timeSeriesHeader().length">
                      <v-col v-if="item.is_primary_timestamp && item.type !== 'date'" :cols="12">
                        <v-text-field
                            :label="$t('createDataSource.chunkInterval')"
                            v-model="dataSource.config.chunk_interval"
                            disabled
                        >
                          <template slot="append-outer"><a href="https://docs.timescale.com/timescaledb/latest/how-to-guides/hypertables/about-hypertables#hypertable-partitioning" target="_blank">{{$t('createDataSource.chunkIntervalHelp')}}</a></template>
                        </v-text-field>
                      </v-col>

                      <v-col v-if="item.type === 'date'" :cols="12">
                        <v-text-field
                            :label="$t('dataMapping.dateFormatString')"
                            v-model="item.date_conversion_format_string"
                        >
                          <template slot="append-outer"><a href="https://www.postgresql.org/docs/current/functions-formatting.html#FUNCTIONS-FORMATTING-DATETIME-TABLE" target="_blank">{{$t('dataMapping.dateFormatStringHelp')}}</a></template>
                        </v-text-field>
                      </v-col>
                      <v-col v-if="item.type === 'date'" class="text-left">
                        <v-checkbox
                            :label="$t('dataMapping.isPrimaryTimestamp')"
                            v-model="item.is_primary_timestamp"
                            disabled
                        >
                        </v-checkbox>
                      </v-col>
                    </td>
                  </template>
                </v-data-table>

                <h4 style="padding-top: 150px">{{$t('dataMapping.nodeAttachmentParameters')}}<info-tooltip :message="$t('dataMapping.nodeAttachmentParametersHelp')"></info-tooltip></h4>
                <v-data-table
                    :headers="attachmentHeader()"
                    :items="dataSource.config.attachment_parameters"
                    :items-per-page="-1"
                    mobile-breakpoint="960"
                    item-key="id"
                    flat
                    tile
                    fixed-header
                    disable-pagination
                    disable-sort
                    hide-default-footer
                >

                  <template v-slot:[`item.type`]="{ item, index}">
                    <span style="visibility: hidden" :id="`node_attachment_${index}`"></span>
                    <v-select
                        :label="$t('dataMapping.type')"
                        :items=parameterFilterTypes
                        v-model="item.type"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                    />
                  </template>

                  <template v-slot:[`item.operator`]="{ item }">
                    <v-select
                        :label="$t('dataMapping.operators')"
                        :items=operators
                        v-model="item.operator"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                    />
                  </template>


                  <template v-slot:[`item.value`]="{ item}">
                    <v-text-field
                        v-if="item.type && item.type ==='property'"
                        :label="$t('createDataSource.key')"
                        v-model="item.key"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                    >
                    </v-text-field>

                    <v-text-field
                        :label="$t('createDataSource.value')"
                        v-model="item.value"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                    >
                    </v-text-field>
                  </template>

                  <template v-slot:[`item.actions`]="{ index }">
                    <v-icon @click="removeParameter(index)">mdi-close</v-icon>
                  </template>

                </v-data-table>


                <v-row>
                  <v-col :cols="12" style="padding:25px" align="center" justify="center">
                    <v-btn @click="addParameter">{{$t('dataMapping.addColumn')}}</v-btn>
                  </v-col>
                </v-row>

              </div>

              <div v-if="dataSource.adapter_type && dataSource.adapter_type !== 'timeseries'">
                <small>{{$t('editDataSource.dataRetentionHelp')}}</small>
                <v-text-field
                  type="number"
                  v-model="dataSource.config.data_retention_days"
                  :min="-1"
                >
                  <template v-slot:label>{{$t('editDataSource.dataRetentionDays')}} </template>
                </v-text-field>
                <v-checkbox
                    v-model="dataSource.active"
                    :label="$t('editDataSource.enable')"
                ></v-checkbox>

                <v-expansion-panels>
                  <v-expansion-panel>
                    <v-expansion-panel-header color="red"><span style="color:white">{{$t('editDataSource.dangerZone')}}</span></v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="dataSource.config.stop_nodes"
                          :label="$t('editDataSource.stopNodes')"
                          :placeholder="$t('editDataSource.typeToAdd')"
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('createDataSource.stopNodesHelp')"></info-tooltip> </template>
                      </v-combobox>

                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="dataSource.config.value_nodes"
                          :label="$t('editDataSource.valueNodes')"
                          :placeholder="$t('editDataSource.typeToAdd')"
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('createDataSource.valueNodesHelp')"></info-tooltip> </template>
                      </v-combobox>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("home.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="updateDataSource" :disabled="!valid" >{{$t("home.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import {
  DataSourceT,
  HttpDataSourceConfig, TimeseriesDataSourceConfig,
} from "@/api/types";

@Component
export default class EditDataSourceDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: false, default: true})
  readonly icon!: boolean

  @Prop({required: true})
  dataSource!: DataSourceT

  errorMessage = ""
  dialog= false
  valid = false
  select: string | null = ""
  authMethods = [{text: "Basic", value: 'basic'}, {text: "Token", value: 'token'}]
  expandedTimeSeries: any[] = []

  dataTypes = [
    'number',
    'number64',
    'float',
    'float64',
    'date',
    'string',
    'boolean',
    ]

  parameterFilterTypes = [{text: 'Data Source ID', value: 'data_source'},
    {text: 'Metatype ID', value: 'metatype_id'},
    {text: 'Metatype Name', value: 'metatype_name'},
    {text: 'Original Node ID', value: 'original_id'},
    {text: 'Property', value: 'property'},
    {text: 'Id', value: 'id'}];

  operators = [
    {text: "==", value: "==", requiresValue: true},
    {text: "!=", value: "!=", requiresValue: true},
    {text: "in", value: "in", requiresValue: true},
    {text: "contains", value: "contains", requiresValue: true},
    {text: "exists", value: "exists", requiresValue: false},
    {text: "<", value: "<", requiresValue: true},
    {text: "<=", value: "<=", requiresValue: true},
    {text: ">", value: ">", requiresValue: true},
    {text: ">=", value: ">=", requiresValue: true},
]


    adapterTypes() {
    return [
      {text: this.$t('editDataSource.standard'), value: 'standard'},
      {text: this.$t('editDataSource.http'), value: 'http'},
      {text: this.$t('editDataSource.jazz'), value: 'jazz'},
      {text: this.$t('editDataSource.aveva'), value: 'aveva'},
      {text: this.$t('createDataSource.timeseries'), value: 'timeseries'},
    ]
  }

  timeSeriesHeader() {
    return [
      {
        text: this.$t('dataMapping.columnName'),
        value: "column_name"
      },
      {
        text: this.$t('dataMapping.dataType'),
        value: "type"
      },
      {
        text: this.$t('createDataSource.propertyName'),
        value: "property_name"
      },

      {
        text: this.$t('createDataSource.unique'),
        value: "unique"
      },
    ]
  }

  attachmentHeader() {
    return [
      {
        text: this.$t('dataMapping.type'),
        value: "type"
      },
      {
        text: this.$t('dataMapping.operator'),
        value: "operator"
      },
      {
        text: this.$t('createDataSource.value'),
        value: "value"
      },
      {text: this.$t('dataMapping.actions'), value: "actions", sortable: false}
    ]
  }



  selectAuthMethodHttp(authMethod: string) {
    switch(authMethod) {
      case "Basic": {
        (this.dataSource.config as HttpDataSourceConfig).auth_method = "basic"
        break
      }

      case "Token": {
        (this.dataSource.config as HttpDataSourceConfig).auth_method = "token"
        break
      }

      default : {
        (this.dataSource.config as HttpDataSourceConfig).auth_method = "none"
      }
    }
  }

  updateDataSource() {
    this.dataSource.config!.data_retention_days = parseInt(String(this.dataSource.config!.data_retention_days), 10)

    this.$client.updateDataSource(this.containerID, this.dataSource)
        .then((dataSource)=> {
          this.$emit("dataSourceUpdated", dataSource)

          this.dialog = false
          this.errorMessage = ""
        })
        .catch(e => this.errorMessage = e)
  }

  removeParameter(index: any) {
    (this.dataSource.config! as TimeseriesDataSourceConfig).attachment_parameters.splice(index, 1)
  }

  addParameter() {
    (this.dataSource.config as TimeseriesDataSourceConfig).attachment_parameters.push({
      type: '',
      operator: '',
      key: '',
      value: ''
    })
  }
}
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>