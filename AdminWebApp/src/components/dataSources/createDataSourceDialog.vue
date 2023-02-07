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

              <v-select v-if="timeseries"
                v-model="select"
                :items="{text: $t('createDataSource.timeseries'), value: 'timeseries', description: $t('createDataSource.timeseriesDescription')}"
                :label="$t('createDataSource.sourceType')"
                @input="selectAdapter"
                required
              />
              <v-select v-else
                v-model="select"
                :items="adapterTypes()"
                @input="selectAdapter"
                :label="$t('createDataSource.sourceType')"
                required
              />

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

                  <v-text-field
                      v-model="httpConfig.timeout"
                      :label="$t('createDataSource.timeout')"
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
                      v-model="jazzConfig.timeout"
                      :label="$t('createDataSource.timeout')"
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

              <div v-if="newDataSource.adapter_type === 'p6'">
                <v-select v-if="newDataSource.adapter_type === 'p6' && container.config.configured_data_sources.length > 0"
                  :items="p6configOptions()"
                  @input="selectP6config"
                  :label="$t('createDataSource.customP6config')"
                />
                <p><b>{{($t('createDataSource.description'))}}</b></p>
                <p>{{$t('createDataSource.p6Description')}}</p>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      :disabled="p6preset.endpoint"
                      v-model="p6Config.endpoint"
                      :label="$t('createDataSource.p6endpoint')"
                      :rules="[v => !!v || $t('dataMapping.required')]"
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      :disabled="p6preset.projectID"
                      v-model="p6Config.projectID"
                      :label="$t('createDataSource.p6projectID')"
                      :rules="[v => !!v || $t('dataMapping.required')]"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      v-model="p6Config.username"
                      :label="$t('createDataSource.username')"
                      :type="p6preset.username ? 'password' : 'text'"
                      :rules="[v => !!v || $t('dataMapping.required')]"
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      v-model="p6Config.password"
                      :label="$t('createDataSource.password')"
                      :append-icon="(hideP6pass ? 'mdi-eye' : 'mdi-eye-off')"
                      @click:append="() => (hideP6pass = !hideP6pass)"
                      :type="hideP6pass ? 'password' : 'text'"
                      :rules="[v => !!v || $t('dataMapping.required')]"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </div>

              <div v-if="newDataSource.adapter_type === 'timeseries'">
                <p><b>{{$t('createDataSource.description')}}</b></p>
                <p>{{$t('createDataSource.timeseriesDescription')}} <a :href="$t('dataMapping.tableDesignHelpLink')" target="_blank">{{$t('dataMapping.here')}}.</a></p>

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
                    <span style="visibility: hidden" :id="`timeseries_column_${index}`"></span>
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
                        :items=getOperators(item.type)
                        v-model="item.operator"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                    />
                  </template>


                  <template v-slot:[`item.value`]="{ item}">
                    <div v-if="item.type && item.type ==='data_source'">
                      <select-data-source
                        :containerID="containerID"
                        :multiple="item.operator === 'in'"
                        :disabled="!item.type"
                        :dataSourceID="item.value"
                        @selected="setDataSource(...arguments, item)"
                      />
                    </div>

                    <div v-else-if="item.type && item.type === 'metatype_name'">
                      <search-metatypes
                        :disabled="!item.type"
                        :containerID="containerID"
                        :multiple="item.operator === 'in'"
                        :metatypeName="item.value"
                        @selected="setMetatype(...arguments, item)"
                      />
                    </div>

                    <div v-else>
                      <v-text-field
                        v-if="item.type && item.type ==='property'"
                        :label="$t('createDataSource.key')"
                        v-model="item.key"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                      />

                      <v-text-field v-if="item.operator !== 'in'"
                        :disabled="item.type === 'property' && !item.key"
                        :label="$t('createDataSource.value')"
                        v-model="item.value"
                        :rules="[v => !!v || $t('dataMapping.required')]"
                      />
                      <v-combobox v-if="item.operator === 'in'"
                        :disabled="item.type === 'property' && !item.key"
                        multiple
                        clearable
                        :placeholder="$t('queryBuilder.typeToAdd')"
                        v-model="item.value"
                      />
                    </div>
                    
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
                <v-checkbox v-model="rawRetentionEnabled">
                  <template v-slot:label>
                    {{$t('containers.rawRetentionEnabled')}}<p class="text-caption" style="margin-left: 5px"></p>
                  </template>

                  <template slot="prepend"><info-tooltip :message="$t('containers.rawRetentionHelp')"></info-tooltip></template>
                </v-checkbox>

                <small>{{$t('createDataSource.dataRetentionHelp')}}</small>
                <div v-if="rawRetentionEnabled">
                  <v-text-field
                    :value="-1"
                    disabled
                  >
                    <template v-slot:label>{{$t('createDataSource.dataRetentionDays')}} </template>
                  </v-text-field>
                </div>
                <div v-else>
                  <v-text-field
                    type="number"
                    v-model="dataRetentionDays"
                    :min="-1"
                  >
                    <template v-slot:label>{{$t('createDataSource.dataRetentionDays')}} </template>
                  </v-text-field>
                </div>
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
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('createDataSource.stopNodesHelp')"></info-tooltip></template>
                      </v-combobox>

                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="valueNodes"
                          :label="$t('createDataSource.valueNodes')"
                          :placeholder="$t('createDataSource.typeToAdd')"
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
  DefaultP6DataSourceConfig,
  DefaultStandardDataSourceConfig, DefaultTimeseriesDataSourceConfig,
  HttpDataSourceConfig,
  JazzDataSourceConfig,
  MetatypeT,
  P6DataSourceConfig,
  StandardDataSourceConfig,
  TimeseriesDataSourceConfig
} from "@/api/types";
import SelectDataSource from './selectDataSource.vue';
import SearchMetatypes from '../ontology/metatypes/searchMetatypes.vue';

@Component({components:{SelectDataSource, SearchMetatypes}})
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

  parameterFilterTypes = [{text: 'Data Source ID', value: 'data_source'},
    {text: 'Metatype ID', value: 'metatype_id'},
    {text: 'Metatype Name', value: 'metatype_name'},
    {text: 'Original Node ID', value: 'original_id'},
    {text: 'Property', value: 'property'},
    {text: 'Id', value: 'id'}];

  operators = [
    {text: "equals", value: "==", requiresValue: true},
    {text: "not equals", value: "!=", requiresValue: true},
    {text: "in", value: "in", requiresValue: true},
    {text: "contains", value: "contains", requiresValue: true},
    {text: "exists", value: "exists", requiresValue: false},
    {text: "less than", value: "<", requiresValue: true},
    {text: "less than or equal to", value: "<=", requiresValue: true},
    {text: "greater than", value: ">", requiresValue: true},
    {text: "greater than or equal to", value: ">=", requiresValue: true},
  ]


  beforeMount() {
    this.container = this.$store.getters.activeContainer;
  }

  adapterTypes() {
    const types =  [
      {text: this.$t('createDataSource.standard'), value: 'standard', description: this.$t('createDataSource.standardDescription')},
      {text: this.$t('createDataSource.http'), value: 'http', description: this.$t('createDataSource.httpDescription')},
      {text: this.$t('createDataSource.jazz'), value: 'jazz', description: this.$t('createDataSource.jazzDescription')},
      {text: this.$t('createDataSource.aveva'), value: 'aveva', description: this.$t('createDataSource.avevaDescription')},
      {text: this.$t('createDataSource.p6'), value: 'p6', description: this.$t('createDataSource.p6description')}
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

  // return only operators that make sense based on parameter filter type
  getOperators(paramFilter: string) {
    const baseOperators = [
      {text: "equals", value: "==", requiresValue: true},
      {text: "not equals", value: "!=", requiresValue: true},
      {text: "in", value: "in", requiresValue: true},
    ]

    if (paramFilter === 'data_source' || paramFilter === 'metatype_name') {
      return baseOperators
    }

    if (paramFilter === 'metatype_id' || paramFilter === 'id') {
      return baseOperators.concat([
        {text: "less than", value: "<", requiresValue: true},
        {text: "less than or equal to", value: "<=", requiresValue: true},
        {text: "greater than", value: ">", requiresValue: true},
        {text: "greater than or equal to", value: ">=", requiresValue: true},
      ]);
    }

    return this.operators
  }

  setDataSource(dataSources: DataSourceT | DataSourceT[], item: any) {
    if (Array.isArray(dataSources)) {
      const ids: string[] = []
      dataSources.forEach(source => ids.push(source.id!))

      item.value = ids
    } else {
      item.value = dataSources.id!
    }
  }

  setMetatype(metatypes: MetatypeT | MetatypeT[], item: any) {
    if (Array.isArray(metatypes)) {
      const names: string [] = []
      
      metatypes.forEach(mt => {
        names.push(mt.name!)
      })

      item.value = names
    } else {
      item.value = metatypes.name!
    }
  }

  selectAdapter(adapter: string) {
    this.newDataSource.adapter_type = adapter
  }

  p6configOptions() {
    const options: string[] = ['Default P6 Adapter'];
    this.container?.config.configured_data_sources?.forEach((source) => {
      options.push(source.name)
    })
    return options;
  }

  selectP6config(configName: string) {
    if (configName !== 'Default P6 Adapter') {
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
