<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="errorMessage = ''; dialog = false; clearNewAdapter()">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("createDataSource.newDataSource")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("createDataSource.formTitle")}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
                lazy-validation
            >
              <v-text-field
                  v-model="newDataSource.name"
                  :label="$t('createDataSource.name')"
                  :rules="[v => !!v || $t('dataMapping.required')]"
              ></v-text-field>
              <v-select
                  v-model="select"
                  :items="adapterTypes()"
                  @input="selectAdapter"
                  :label="$t('createDataSource.sourceType')"
                  required
              >
              </v-select>

              <div v-if="newDataSource.adapter_type === 'standard'">
                <p><b>{{$t('createDataSource.description')}}</b></p>
                <p>{{$t('createDataSource.standardDescription')}}</p>
              </div>

              <div v-if="newDataSource.adapter_type === 'http'">
                <p><b>{{$t('createDataSource.description')}}</b></p>
                <p>{{$t('createDataSource.httpDescription')}}</p>
                <v-text-field
                    v-model="httpConfig.endpoint"
                    :label="$t('createDataSource.endpoint')"
                    required
                ></v-text-field>

                <v-select
                    v-model="select_auth"
                    :items="authMethods"
                    :label="$t('createDataSource.authMethod')"
                    @input="selectAuthMethodHttp"
                    required
                >
                </v-select>
                <div v-if="httpConfig.auth_method === 'basic'">
                  <v-text-field
                      v-model="httpConfig.username"
                      :label="$t('createDataSource.username')"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="httpConfig.password"
                      :label="$t('createDataSource.password')"
                      required
                  ></v-text-field>
                </div>

                <div v-if="httpConfig.auth_method === 'token'">
                  <v-text-field
                      v-model="httpConfig.token"
                      :label="$t('createDataSource.token')"
                      required
                  ></v-text-field>

                </div>
                  <v-text-field
                      v-model="httpConfig.poll_interval"
                      :label="$t('createDataSource.pollInterval')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-checkbox
                      v-model="httpConfig.secure"
                      :label="$t('createDataSource.secure')"
                      required
                  ></v-checkbox>

              </div>

                <div v-if="newDataSource.adapter_type === 'jazz'">
                <p><b>{{$t('createDataSource.description')}}</b></p>
                <p>{{$t('createDataSource.jazzDescription')}}</p>
                  <v-text-field
                      v-model="jazzConfig.project_name"
                      :label="$t('createDataSource.projectName')"
                      required
                  ></v-text-field>

                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="jazzConfig.artifact_types"
                      :label="$t('createDataSource.artifactTypes')"
                      :placeholder="$t('createDataSource.typeToAdd')"
                  ></v-combobox>

                  <v-text-field
                      v-model="jazzConfig.endpoint"
                      :label="$t('createDataSource.endpoint')"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.token"
                      :label="$t('createDataSource.token')"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.poll_interval"
                      :label="$t('createDataSource.pollInterval')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.limit"
                      :label="$t('createDataSource.recordLimit')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-checkbox
                      v-model="jazzConfig.secure"
                      :label="$t('createDataSource.secure')"
                      required
                  ></v-checkbox>
                </div>

              <div v-if="newDataSource.adapter_type === 'aveva'">
                <p><b>{{$t('createDataSource.description')}}</b></p>
                <p>{{$t('createDataSource.avevaDescription')}}</p>
                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="avevaConfig.ignore_dbs"
                    :label="$t('createDataSource.ignoreDBs')"
                    :placeholder="$t('createDataSource.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="avevaConfig.ignore_element_types"
                    :label="$t('createDataSource.ignoreElements')"
                    :placeholder="$t('createDataSource.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="avevaConfig.ifc_element_types"
                    :label="$t('createDataSource.ifcElementTypes')"
                    :placeholder="$t('createDataSource.typeToAdd')"
                ></v-combobox>

                <h3>{{$t("createDataSource.ifcSettingsTitle")}}</h3>
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.format"
                        :label="$t('createDataSource.ifcSettings.format')"
                        required
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.data_level"
                        :label="$t('createDataSource.ifcSettings.dataLevel')"
                        required
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.log_detail"
                        :label="$t('createDataSource.ifcSettings.logLevel')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.arc_tolerance"
                        :label="$t('createDataSource.ifcSettings.arcTolerance')"
                        required
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="avevaConfig.ifc_settings.component_level"
                        :label="$t('createDataSource.ifcSettings.componentLevel')"
                        required
                    ></v-checkbox>

                  </v-col>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="avevaConfig.ifc_settings.tube"
                        :label="$t('createDataSource.ifcSettings.tube')"
                        required
                    ></v-checkbox>

                  </v-col>

                  <v-col :cols="4">
                    <v-checkbox
                        v-model="avevaConfig.ifc_settings.cl"
                        :label="$t('createDataSource.ifcSettings.cl')"
                        required
                    ></v-checkbox>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.insu_translucency"
                        :label="$t('createDataSource.ifcSettings.insuTranslucency')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.obst_translucency"
                        :label="$t('createDataSource.ifcSettings.obstTranslucency')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.root"
                        :label="$t('createDataSource.ifcSettings.root')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.pipe"
                        :label="$t('createDataSource.ifcSettings.pipe')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
                <v-row>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.nozzle"
                        :label="$t('createDataSource.ifcSettings.nozzle')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.structure"
                        :label="$t('createDataSource.ifcSettings.structure')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.cable"
                        :label="$t('createDataSource.ifcSettings.cable')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
              </div>

              <div v-if="newDataSource.adapter_type === 'timeseries'">
                <p><b>{{$t('createDataSource.description')}}</b></p>
                <p>{{$t('createDataSource.timeseriesDescription')}}</p>

                <h4>{{$t('dataMapping.tableDesign')}}<info-tooltip :message="$t('dataMapping.tableDesignHelp')"></info-tooltip></h4>
                <v-data-table
                    :headers="timeSeriesHeader()"
                    :items="timeseriesConfig.columns"
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
                  <template v-slot:[`item.column_name`]="{ item, index }">

                    <v-text-field
                        :label="$t('dataMapping.columnName')"
                        v-model="item.column_name"
                        :rules="[v => !!v || $t('dataMapping.required'),validColumnName(index, item.column_name)]"
                    >
                    </v-text-field>
                  </template>

                  <template v-slot:[`item.type`]="{ item, index }">
                    <v-select
                        :label="$t('dataMapping.columnDataType')"
                        :items='(index === 0) ? ["number", "number64", "date"] :dataTypes'
                        v-model="item.type"
                        :rules="[v => !!v || $t('dataMapping.required')]"
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
                        :disabled="item.is_primary_timestamp"
                        :items='[true,false]'
                        v-model="item.unique"
                    />
                  </template>

                  <template v-slot:[`item.actions`]="{ index }">
                    <v-icon v-if="index !== 0" @click="removeMapping(index)">mdi-close</v-icon>
                  </template>

                  <template v-slot:expanded-item="{ item }">
                    <td :colspan="timeSeriesHeader().length">
                      <v-col v-if="item.is_primary_timestamp && item.type !== 'date'" :cols="12">
                        <v-text-field
                            :label="$t('createDataSource.chunkInterval')"
                            v-model="timeseriesConfig.chunk_interval"
                        >
                          <template slot="append-outer"><a href="https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Timeseries-Data-Sources#table-design" target="_blank">{{$t('createDataSource.chunkIntervalHelp')}}</a></template>
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


                <v-row>
                  <v-col :cols="12" style="padding:25px" align="center" justify="center">
                    <v-btn @click="addMapping">{{$t('dataMapping.addColumn')}}</v-btn>
                  </v-col>
                </v-row>


                <!-- Node Attachement Paramters -->
                <h4 style="padding-top: 150px">{{$t('dataMapping.nodeAttachmentParameters')}}<info-tooltip :message="$t('dataMapping.nodeAttachmentParametersHelp')"></info-tooltip></h4>
                <v-data-table
                    :headers="attachmentHeader()"
                    :items="timeseriesConfig.attachment_parameters"
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

                  <template v-slot:[`item.type`]="{ item }">
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

              <div v-if="newDataSource.adapter_type && newDataSource.adapter_type !== 'timeseries'">
                <small>{{$t('createDataSource.dataRetentionHelp')}}</small>
                <v-text-field
                  type="number"
                  v-model="dataRetentionDays"
                  :min="-1"
                >
                  <template v-slot:label>{{$t('createDataSource.dataRetentionDays')}} </template>
                </v-text-field>
                <v-checkbox
                    v-model="newDataSource.active"
                    :label="$t('createDataSource.enable')"
                    required
                ></v-checkbox>

                <v-expansion-panels>
                  <v-expansion-panel>
                    <v-expansion-panel-header color="red"><span style="color:white">{{$t('createDataSource.dangerZone')}}</span></v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="stopNodes"
                          :label="$t('createDataSource.stopNodes')"
                          :placeholder="$t('createDataSource.typeToAdd')"
                      ></v-combobox>

                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="valueNodes"
                          :label="$t('createDataSource.valueNodes')"
                          :placeholder="$t('createDataSource.typeToAdd')"
                      ></v-combobox>
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
        <v-btn color="blue darken-1" text @click="clearNewAdapter" >{{$t("home.cancel")}}</v-btn>
        <v-btn
            v-if="newDataSource.adapter_type === 'timeseries'"
            color="blue darken-1"
            text
            :disabled="timeseriesConfig.columns.length === 0"
            @click="createDataSource" >
          {{$t("home.create")}}
        </v-btn>
        <v-btn v-else color="blue darken-1" text @click="createDataSource" >{{$t("home.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {v4 as uuidv4} from 'uuid'
import {Component, Prop, Vue} from "vue-property-decorator"
import {
  AvevaDataSourceConfig, ContainerT,
  DataSourceT,
  DefaultAvevaDataSourceConfig,
  DefaultHttpDataSourceConfig,
  DefaultJazzDataSourceConfig,
  DefaultStandardDataSourceConfig, DefaultTimeseriesDataSourceConfig,
  HttpDataSourceConfig,
  JazzDataSourceConfig,
  StandardDataSourceConfig,
  TimeseriesDataSourceConfig
} from "@/api/types";

@Component
export default class CreateDataSourceDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  dialog= false
  valid = true
  select: string | null = ""
  select_auth = ""
  authMethods = ["Basic", "Token"]
  stopNodes = []
  valueNodes = []
  dataRetentionDays = 30
  expandedTimeSeries: any[] = []

  newDataSource: DataSourceT = {
    name: "",
    container_id: "",
    adapter_type: undefined,
    active: false,
    config: undefined
  }

  standardConfig: StandardDataSourceConfig = DefaultStandardDataSourceConfig()
  httpConfig: HttpDataSourceConfig = DefaultHttpDataSourceConfig()
  jazzConfig: JazzDataSourceConfig = DefaultJazzDataSourceConfig()
  avevaConfig: AvevaDataSourceConfig = DefaultAvevaDataSourceConfig()
  timeseriesConfig:TimeseriesDataSourceConfig = DefaultTimeseriesDataSourceConfig();

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
    const types =  [
      {text: this.$t('createDataSource.standard'), value: 'standard', description: this.$t('createDataSource.standardDescription')},
      {text: this.$t('createDataSource.http'), value: 'http', description: this.$t('createDataSource.httpDescription')},
      {text: this.$t('createDataSource.jazz'), value: 'jazz', description: this.$t('createDataSource.jazzDescription')},
      {text: this.$t('createDataSource.aveva'), value: 'aveva', description: this.$t('createDataSource.avevaDescription')},
      {text: this.$t('createDataSource.timeseries'), value: 'timeseries', description: this.$t('createDataSource.timeseriesDescription')},
    ]

    const container: ContainerT = this.$store.getters.activeContainer;

    if(container.config.enabled_data_sources && container.config.enabled_data_sources.length > 0) {
      return types.filter(t => container.config.enabled_data_sources.find(s => s === t.value))
    } else {
      return types
    }
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
      {text: this.$t('dataMapping.actions'), value: "actions", sortable: false}
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


    selectAdapter(adapter: string) {
    this.newDataSource.adapter_type = adapter
  }

  selectAuthMethodHttp(authMethod: string) {
    switch(authMethod) {
      case "Basic": {
        this.httpConfig.auth_method = "basic"
        break
      }

      case "Token": {
        this.httpConfig.auth_method = "token"
        break
      }

      default : {
        this.httpConfig.auth_method = "none"
      }
    }
  }

  createDataSource() {
    // @ts-ignore
    if(!this.$refs.form!.validate()) return;

    switch (this.newDataSource.adapter_type) {
      case "standard": {
        this.newDataSource.config = this.standardConfig
        break;
      }

      case "http": {
        this.newDataSource.config = this.httpConfig
        break;
      }

      case "jazz": {
        this.newDataSource.config = this.jazzConfig
        break;
      }

      case "aveva": {
        this.newDataSource.config = this.avevaConfig
        break;
      }

      case "timeseries": {
        this.newDataSource.config = this.timeseriesConfig;
        this.newDataSource.active = true;
        break;
      }

      default: {
        this.newDataSource.config = this.standardConfig
      }
    }

    if(this.stopNodes.length > 0) this.newDataSource.config.stop_nodes = this.stopNodes
    if(this.valueNodes.length > 0) this.newDataSource.config.value_nodes = this.valueNodes
    this.newDataSource.config.data_retention_days = parseInt(String(this.dataRetentionDays), 10)

    this.$client.createDataSource(this.containerID, this.newDataSource)
        .then((dataSource)=> {
          this.clearNewAdapter()
          this.$emit("dataSourceCreated", dataSource)

          this.dialog = false
          this.errorMessage = ""
        })
        .catch(e => this.errorMessage = e)
  }


  clearNewAdapter() {
    this.dialog = false
    this.select = null
    this.newDataSource = {
      name: "",
      adapter_type: undefined,
      active: false,
      config: undefined
    }

    this.standardConfig = DefaultStandardDataSourceConfig()
    this.httpConfig = DefaultHttpDataSourceConfig()
    this.jazzConfig = DefaultJazzDataSourceConfig()
    this.avevaConfig = DefaultAvevaDataSourceConfig()
  }

  validColumnName(index: any, value: any) {
    if(this.timeseriesConfig.columns.filter(p  => value === p.column_name).length > 1){
      return this.$t('dataMapping.columnNameMustBeUnique')
    }

    // this regex should match only if the name starts with a letter, contains only alphanumerics and underscores with
    // no spaces and is between 1 and 30 characters in length
    const matches = /^[a-z][a-z0-9_]{1,30}$/.exec(value)
    if(!matches || matches.length === 0) {
      return this.$t('dataMapping.columnNameRequirements')
    }

    return true
  }

  removeMapping(index: any) {
    this.timeseriesConfig.columns.splice(index, 1)
  }

  addMapping() {
    if(this.timeseriesConfig.columns.length === 0) {
      this.timeseriesConfig.columns.push({
        id: uuidv4(),
        column_name: '',
        property_name: '',
        is_primary_timestamp: true,
        unique: false,
        type: 'date',
        date_conversion_format_string: 'YYYY-MM-DD HH24:MI:SS.US',
      })

      this.expandedTimeSeries.push(this.timeseriesConfig.columns[0])
    } else {
      this.timeseriesConfig.columns.push({
        id: uuidv4(),
        column_name: '',
        property_name: '',
        is_primary_timestamp: false,
        unique: false
      })
    }

  }

  removeParameter(index: any) {
    this.timeseriesConfig.attachment_parameters.splice(index, 1)
  }

  addParameter() {
    this.timeseriesConfig.attachment_parameters.push({
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
