<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="errorMessage = ''; clearNewAdapter()">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on" @click="refreshSourceAuth">{{$t("dataSources.createNew")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("dataSources.new")}}</span>
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
                  :label="$t('general.name')"
                  :rules="[v => !!v || $t('validation.required')]"
              ></v-text-field>

              <v-select v-if="timeseries"
                v-model="select"
                :items="[{text: $t('timeseries.timeseries'), value: 'timeseries', description: $t('timeseries.description')}]"
                :label="$t('dataSources.selectType')"
                @input="selectAdapter"
                required
              />
              <v-select v-else
                v-model="select"
                :items="adapterTypes()"
                @input="selectAdapter"
                :label="$t('dataSources.selectType')"
                required
              />

              <div v-if="newDataSource.adapter_type === 'standard'">
                <p><b>{{$t('general.description')}}</b></p>
                <p>{{$t('dataSources.standardDescription')}}</p>
              </div>

              <div v-if="newDataSource.adapter_type === 'http'">
                <p><b>{{$t('general.description')}}</b></p>
                <p>{{$t('dataSources.httpDescription')}}</p>
                <v-text-field
                    v-model="httpConfig.endpoint"
                    :label="$t('general.endpoint')"
                    required
                ></v-text-field>

                <v-select
                    v-model="select_auth"
                    :items="authMethods"
                    :label="$t('dataSources.authMethod')"
                    @input="selectAuthMethodHttp"
                    required
                >
                </v-select>
                <div v-if="httpConfig.auth_method === 'basic'">
                  <v-text-field
                      v-model="httpConfig.username"
                      :label="$t('general.username')"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="httpConfig.password"
                      :label="$t('general.password')"
                      required
                  ></v-text-field>
                </div>

                <div v-if="httpConfig.auth_method === 'token'">
                  <v-text-field
                      v-model="httpConfig.token"
                      :label="$t('general.token')"
                      required
                  ></v-text-field>

                </div>
                  <v-text-field
                      v-model="httpConfig.poll_interval"
                      :label="$t('dataSources.pollInterval')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="httpConfig.timeout"
                      :label="$t('general.timeout')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-checkbox
                      v-model="httpConfig.secure"
                      :label="$t('dataSources.useHttps')"
                      required
                  ></v-checkbox>

              </div>

              <div v-if="newDataSource.adapter_type === 'jazz'">
                <p><b>{{$t('general.description')}}</b></p>
                <p>{{$t('dataSources.jazzDescription')}}</p>
                  <v-text-field
                      v-model="jazzConfig.project_name"
                      :label="$t('general.projectName')"
                      required
                  ></v-text-field>

                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="jazzConfig.artifact_types"
                      :label="$t('dataSources.jazzArtifacts')"
                      :placeholder="$t('general.typeToAdd')"
                  ></v-combobox>

                  <v-text-field
                      v-model="jazzConfig.endpoint"
                      :label="$t('general.endpoint')"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.token"
                      :label="$t('general.token')"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.poll_interval"
                      :label="$t('dataSources.pollInterval')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.timeout"
                      :label="$t('general.timeout')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-text-field
                      v-model="jazzConfig.limit"
                      :label="$t('dataSources.recordsPerCall')"
                      type="number"
                      required
                  ></v-text-field>

                  <v-checkbox
                      v-model="jazzConfig.secure"
                      :label="$t('dataSources.useHttps')"
                      required
                  ></v-checkbox>
              </div>

              <div v-if="newDataSource.adapter_type === 'aveva'">
                <p><b>{{$t('general.description')}}</b></p>
                <p>{{$t('dataSources.avevaDescription')}}</p>
                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="avevaConfig.ignore_dbs"
                    :label="$t('dataSources.ignoredDBtypes')"
                    :placeholder="$t('general.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="avevaConfig.ignore_element_types"
                    :label="$t('dataSources.ignoredElements')"
                    :placeholder="$t('general.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="avevaConfig.ifc_element_types"
                    :label="$t('dataSources.ifcTypes')"
                    :placeholder="$t('general.typeToAdd')"
                ></v-combobox>

                <h3>{{$t("dataSources.ifcSettings.title")}}</h3>
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.format"
                        :label="$t('dataSources.ifcSettings.format')"
                        required
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.data_level"
                        :label="$t('dataSources.ifcSettings.dataLevel')"
                        required
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.log_detail"
                        :label="$t('dataSources.ifcSettings.logLevel')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.arc_tolerance"
                        :label="$t('dataSources.ifcSettings.arcTolerance')"
                        required
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="avevaConfig.ifc_settings.component_level"
                        :label="$t('dataSources.ifcSettings.componentLevel')"
                        required
                    ></v-checkbox>

                  </v-col>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="avevaConfig.ifc_settings.tube"
                        :label="$t('dataSources.ifcSettings.tube')"
                        required
                    ></v-checkbox>

                  </v-col>

                  <v-col :cols="4">
                    <v-checkbox
                        v-model="avevaConfig.ifc_settings.cl"
                        :label="$t('dataSources.ifcSettings.cl')"
                        required
                    ></v-checkbox>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.insu_translucency"
                        :label="$t('dataSources.ifcSettings.insuTranslucency')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.obst_translucency"
                        :label="$t('dataSources.ifcSettings.obstTranslucency')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.root"
                        :label="$t('dataSources.ifcSettings.root')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.pipe"
                        :label="$t('dataSources.ifcSettings.pipe')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
                <v-row>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.nozzle"
                        :label="$t('dataSources.ifcSettings.nozzle')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.structure"
                        :label="$t('dataSources.ifcSettings.structure')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="avevaConfig.ifc_settings.cable"
                        :label="$t('dataSources.ifcSettings.cable')"
                        required
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
              </div>

              <div v-if="newDataSource.adapter_type === 'p6'">
                <v-select v-if="newDataSource.adapter_type === 'p6' && container.config.configured_data_sources && container?.config.configured_data_sources.length > 0"
                  :items="p6configOptions()"
                  @input="selectP6config"
                  :label="$t('dataSources.p6.selectConfig')"
                />
                <p><b>{{($t('general.description'))}}</b></p>
                <p>{{$t('dataSources.p6Description')}}</p>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      :disabled="p6preset.endpoint"
                      v-model="p6Config.endpoint"
                      :label="$t('general.endpoint')"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      :disabled="p6preset.projectID"
                      v-model="p6Config.projectID"
                      :label="$t('general.projectID')"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      v-model="p6Config.username"
                      :label="$t('general.username')"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      v-model="p6Config.password"
                      :label="$t('general.password')"
                      :append-icon="(hideP6pass ? 'mdi-eye' : 'mdi-eye-off')"
                      @click:append="() => (hideP6pass = !hideP6pass)"
                      :type="hideP6pass ? 'password' : 'text'"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </div>

              <div v-if="newDataSource.adapter_type === 'timeseries'">
                <v-checkbox
                  :label="$t('timeseries.enableFastload')"
                  v-model="fastload"
                />

                <p><b>{{$t('general.description')}}</b></p>
                <p>{{$t('timeseries.description')}} {{$t('help.findHelp')}} <a :href="timeseriesHelp()" target="_blank">{{$t('general.here')}}.</a></p>

                <h4>{{$t('timeseries.tableDesign')}}<info-tooltip :message="$t('help.timeseriesTableDesign')"></info-tooltip></h4>
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
                    <span style="visibility: hidden" :id="`timeseries_column_${index}`"></span>
                    <v-text-field
                        :label="$t('general.columnName')"
                        v-model="item.column_name"
                        :rules="[v => !!v || $t('validation.required'),validColumnName(index, item.column_name)]"
                    >
                    </v-text-field>
                  </template>

                  <template v-slot:[`item.type`]="{ item, index }">
                    <v-select
                        :label="$t('general.dataType')"
                        :items='(index === 0) ? ["number", "number64", "date"] :dataTypes'
                        v-model="item.type"
                        :rules="[v => !!v || $t('validation.required')]"
                    />
                  </template>

                  <template v-slot:[`item.property_name`]="{ item }">
                    <v-text-field
                        :label="$t('properties.name')"
                        v-model="item.property_name"
                        :rules="[v => !!v || $t('validation.required')]"
                    >
                    </v-text-field>

                  </template>


                  <template v-slot:[`item.unique`]="{ item}">
                    <v-select
                        :label="$t('general.unique')"
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
                            :label="$t('timeseries.chunkInterval')"
                            v-model="timeseriesConfig.chunk_interval"
                        >
                          <template slot="append-outer"><a :href="chunkIntervalLink()" target="_blank">{{$t('help.chunkInterval')}}</a></template>
                        </v-text-field>
                      </v-col>

                      <v-col v-if="item.type === 'date'" :cols="12">
                        <v-text-field
                          :label="$t('general.dateFormatString')"
                          v-model="item.date_conversion_format_string"
                          :rules="[rules.dateString]"
                        >
                          <template slot="append-outer">
                            <a :href="timeseriesHelpLink()" target="_blank">
                              {{$t('help.dateFormatString')}}
                            </a>
                          </template>
                        </v-text-field>
                      </v-col>
                      <v-col v-if="item.type === 'date'" class="text-left">
                        <v-checkbox
                          :label="$t('timeseries.primaryTimestamp')"
                          v-model="item.is_primary_timestamp"
                          disabled
                        />
                      </v-col>
                    </td>
                  </template>
                </v-data-table>


                <v-row>
                  <v-col :cols="12" style="padding:25px" align="center" justify="center">
                    <v-btn @click="addMapping">{{$t('general.addColumn')}}</v-btn>
                  </v-col>
                </v-row>

                <node-attachment-parameter-dialog
                    :containerID="containerID"
                    :timeseriesConfig="timeseriesConfig"
                    @removeParameter="removeParameter"
                    @addParameter="addParameter"
                >
                </node-attachment-parameter-dialog>
              </div>

              <div v-if="newDataSource.adapter_type && newDataSource.adapter_type !== 'timeseries'">
                <v-checkbox v-model="rawRetentionEnabled">
                  <template v-slot:label>
                    {{$t('dataSources.attachStaging')}}<p class="text-caption" style="margin-left: 5px"></p>
                  </template>

                  <template v-slot:prepend><info-tooltip :message="$t('help.attachStaging')"></info-tooltip></template>
                </v-checkbox>

                <small>{{$t('help.dataRetention')}}</small>
                <div v-if="rawRetentionEnabled">
                  <v-text-field
                    :value="-1"
                    disabled
                  >
                    <template v-slot:label>{{$t('dataSources.dataRetentionDays')}} </template>
                  </v-text-field>
                </div>
                <div v-else>
                  <v-text-field
                    type="number"
                    v-model="dataRetentionDays"
                    :min="-1"
                  >
                    <template v-slot:label>{{$t('dataSources.dataRetentionDays')}} </template>
                  </v-text-field>
                </div>
                <v-checkbox
                    v-model="newDataSource.active"
                    :label="$t('general.enable')"
                    required
                ></v-checkbox>

                <v-expansion-panels>
                  <v-expansion-panel>
                    <v-expansion-panel-header color="red"><span style="color:white">{{$t('dataSources.advanced')}}</span></v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="stopNodes"
                          :label="$t('dataSources.stopNodes')"
                          :placeholder="$t('general.typeToAdd')"
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('help.stopNodes')"></info-tooltip></template>
                      </v-combobox>

                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="valueNodes"
                          :label="$t('dataSources.valueNodes')"
                          :placeholder="$t('general.typeToAdd')"
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('help.valueNodes')"></info-tooltip> </template>
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
        <v-btn color="primary" text @click="clearNewAdapter" >{{$t("general.cancel")}}</v-btn>
        <v-btn v-if="newDataSource.adapter_type === 'timeseries'"
          color="primary"
          text
          :disabled="timeseriesConfig.columns.length === 0"
          @click="createDataSource"
        >{{$t("general.create")}}</v-btn>
        <v-btn v-else color="primary" text @click="createDataSource" >{{$t("general.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {v4 as uuidv4} from 'uuid'
import {Component, Prop, Vue, Watch} from "vue-property-decorator"
import {
  AvevaDataSourceConfig, ContainerT,
  DataSourceT,
  DefaultAvevaDataSourceConfig,
  DefaultHttpDataSourceConfig,
  DefaultJazzDataSourceConfig,
  DefaultP6DataSourceConfig,
  DefaultStandardDataSourceConfig, DefaultTimeseriesDataSourceConfig,
  HttpDataSourceConfig,
  JazzDataSourceConfig,
  P6DataSourceConfig,
  StandardDataSourceConfig,
  TimeseriesDataSourceConfig,
} from "@/api/types";
import NodeAttachmentParameterDialog from "@/components/dataSources/nodeAttachmentParameterDialog.vue";
import Config from '@/config';

@Component({components:{NodeAttachmentParameterDialog}})
export default class CreateDataSourceDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: false})
  timeseries?: boolean

  errorMessage = ""
  dialog= false
  valid = true
  select: string | null = ""
  select_auth = ""
  authMethods = ["Basic", "Token"]
  stopNodes = []
  valueNodes = []
  dataRetentionDays = 30
  rawRetentionEnabled = false
  expandedTimeSeries: any[] = []
  container: ContainerT | undefined = undefined;
  p6preset = {
    endpoint: false,
    projectID: false,
  }
  hideP6pass = true
  authorized: string[] = []
  fastload = true
  defaultFormatString = '%Y-%m-%d %H:%M:%S.%f'
  rules={
    dateString: (value: any) => {
      if (this.getFastload()) {
        return value.includes('%') || this.$t('help.strftimeDate')
      } else {
        return !value.includes('%') || this.$t('help.postgresDate')
      }
    }
  }

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
  p6Config: P6DataSourceConfig = DefaultP6DataSourceConfig()
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

  @Watch('timeseries')
  timeseriesUpdate() {
    if(this.timeseries) {
      this.select = 'timeseries'
      this.selectAdapter('timeseries')
    } else {
      this.select = ''
    }
  }

  // for some reason calling the variable itself in the validation always results
  // in the default "true". this getter is a workaround for that
  getFastload() {
    return this.fastload
  }

  @Watch('fastload')
  dateStringChange() {
    if (this.fastload) {
      this.defaultFormatString = '%Y-%m-%d %H:%M:%S.%f'
    } else {
      this.defaultFormatString = 'YYYY-MM-DD HH24:MI:SS.US'
    }
    this.checkDateStrings()
  }

  checkDateStrings() {
    this.timeseriesConfig.columns.forEach(col => {
      if (col.date_conversion_format_string && col.date_conversion_format_string !== this.defaultFormatString) {
        // if fastload enabled and no percent symbols, assume that string needs to be reformatted to rust format
        // similarly, if fastload disabled but percent symbols present, reformat string to pg format
        if (
          (this.fastload && !col.date_conversion_format_string.includes('%'))
          || (!this.fastload && col.date_conversion_format_string.includes('%'))
        ) {
          col.date_conversion_format_string = this.defaultFormatString
        }
      }
    })
  }

  beforeMount() {
    this.container = this.$store.getters.activeContainer;
  }

  adapterTypes() {
    const types =  [
      {text: this.$t('dataSources.standardName'), value: 'standard', description: this.$t('dataSources.standardDescription')},
      {text: this.$t('dataSources.httpName'), value: 'http', description: this.$t('dataSources.httpDescription')},
      {text: this.$t('dataSources.jazzName'), value: 'jazz', description: this.$t('dataSources.jazzDescription')},
      {text: this.$t('dataSources.avevaName'), value: 'aveva', description: this.$t('dataSources.avevaDescription')},
      {text: this.$t('dataSources.p6Name'), value: 'p6', description: this.$t('dataSources.p6description')}
    ]


    if(this.container!.config.enabled_data_sources && this.container!.config.enabled_data_sources.length > 0) {
      return types.filter(t => this.container!.config.enabled_data_sources.find(s => s === t.value))
    } else {
      return types
    }
  }

  timeSeriesHeader() {
    return [
      {
        text: this.$t('general.columnName'),
        value: "column_name"
      },
      {
        text: this.$t('general.dataType'),
        value: "type"
      },
      {
        text: this.$t('properties.name'),
        value: "property_name"
      },

      {
        text: this.$t('general.unique'),
        value: "unique"
      },
      {text: this.$t('general.actions'), value: "actions", sortable: false}
    ]
  }

  timeseriesHelpLink(): string {
    if (this.fastload === true) {
      return this.$t('links.rustTime') as string
    }
    return this.$t('links.postgresTime') as string
  }

  chunkIntervalLink() {
    return this.$t('links.chunkInterval') as string
  }

  selectAdapter(adapter: string) {
    this.newDataSource.adapter_type = adapter
  }

  p6configOptions() {
    const options: string[] = [this.$t('dataSources.p6.defaultAdapter') as string];
    this.container?.config.configured_data_sources?.forEach((source) => {
      options.push(source.name)
    })
    return options;
  }

  selectP6config(configName: string) {
    if (configName !== this.$t('dataSources.p6.defaultAdapter')) {
      const index = this.container?.config.configured_data_sources?.findIndex(config => config.name === configName)
      const selectedConfig = this.container!.config.configured_data_sources![index!] as P6DataSourceConfig
      // Using object assign here otherwise some changes to the source will also be made to the config template
      Object.assign(this.p6Config, selectedConfig)
    } else {
      this.p6Config = DefaultP6DataSourceConfig()
    }
    this.p6preset.endpoint = this.p6Config.endpoint ? true : false;
    this.p6preset.projectID = this.p6Config.projectID ? true : false;
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

      case "p6": {
        this.newDataSource.config = this.p6Config
        break;
      }

      case "timeseries": {
        this.timeseriesConfig.fast_load_enabled = this.fastload;
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
    if(this.rawRetentionEnabled) {
      this.newDataSource.config.raw_retention_enabled = true
      this.newDataSource.config.data_retention_days = -1
    } else {
      this.newDataSource.config.data_retention_days = parseInt(String(this.dataRetentionDays), 10)
    }

    this.$client.createDataSource(this.containerID, this.newDataSource)
        .then((dataSource)=> {
          this.clearNewAdapter()
          this.$emit("dataSourceCreated", dataSource)

          if(dataSource.adapter_type === 'timeseries') {
            this.$emit("timeseriesSourceCreated")
          }

          this.dialog = false
          this.errorMessage = ""
        })
        .catch(e => this.errorMessage = e)
  }

  authorizeDataSource(type: string) {
    // add temporary auth before redirect.
    this.authorized.push(type)
    window.open(`${Config.p6RedirectAddress}/redirect/${this.containerID}`, "_blank");
  }

  checkSourceAuth(type: string) {
    return this.authorized.includes(type);
  }

  async refreshSourceAuth() {
    // clear existing permissions
    this.authorized = [];

    // check for permissions in the DB
    const keys = await this.$client.listServiceKeysForContainer(this.containerID);

    // p6
    if (keys.some(kp => kp.note === 'p6_adapter_auth')) {
      this.authorized.push('p6');
    }
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
    this.rawRetentionEnabled = false
    this.p6preset = {
      endpoint: false,
      projectID: false,
    }

    this.standardConfig = DefaultStandardDataSourceConfig()
    this.httpConfig = DefaultHttpDataSourceConfig()
    this.jazzConfig = DefaultJazzDataSourceConfig()
    this.avevaConfig = DefaultAvevaDataSourceConfig()
    this.p6Config = DefaultP6DataSourceConfig()
    this.timeseriesConfig = DefaultTimeseriesDataSourceConfig()
    this.authorized = [];
  }

  validColumnName(index: any, value: any) {
    if(this.timeseriesConfig.columns.filter(p  => value === p.column_name).length > 1){
      return this.$t('timeseries.colNameUnique')
    }

    // this regex should match only if the name starts with a letter, contains only alphanumerics and underscores with
    // no spaces and is between 1 and 30 characters in length
    const matches = /^[_a-z][a-z0-9_]{1,30}$/.exec(value)
    if(!matches || matches.length === 0) {
      return this.$t('help.nameRegex')
    }

    return true
  }

  timeseriesHelp() {
    return this.$t('links.timeseriesQuickStart') as string
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
        date_conversion_format_string: this.fastload ? '%Y-%m-%d %H:%M:%S.%f' : 'YYYY-MM-DD HH24:MI:SS.US',
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
