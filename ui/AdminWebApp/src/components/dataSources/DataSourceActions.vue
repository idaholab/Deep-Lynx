<template>
  <DialogBasic
    ref="dialog"
    :icon-name="config.icon"
    :max-width="maxWidth" 
    :icon="icon" 
    :title="config.title"
    @closeDialog="resetDialog"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>

      <template v-if="mode === 'create' || mode === 'edit'">
        <v-form
          ref="form"
          v-model="validSource"
          lazy-validation
        >
          <!-- Source Name -->
          <v-text-field
            v-model="newDataSource.name"
            :label="$t('general.name')"
            :rules="[validateRequired]"
          />

          <!-- Source Type -->
          <v-select v-if="mode === 'create'"
            v-model="selectSource"
            :items="getSourceTypes(timeseries)"
            :label="$t('dataSources.selectType')"
            @input="selectSourceType"
            required
          />
          <v-text-field v-if="mode === 'edit'"
            :value="dataSource.adapter_type"
            :label="$t('dataSources.selectType')"
            disabled
          />

          <!-- Description Predecessors (Custom, P6 and TS only) -->
          <template v-if="mode === 'create' 
            && newDataSource.adapter_type === 'p6'
            && checkConfiguredP6()"
          >
            <v-select
              :items="p6configOptions()"
              @input="selectP6config"
              :label="$t('dataSources.p6.selectConfig')"
            />
          </template>

          <template v-if="newDataSource.adapter_type === 'timeseries'">
            <v-checkbox
              :label="$t('timeseries.enableFastload')"
              v-model="fastload"
            />
          </template>

          <!-- Source Description (Create mode only) -->
          <template v-if="mode === 'create' && newDataSource.adapter_type">
            <p><b>{{ $t('general.description') }}</b></p>
            <p v-if="newDataSource.adapter_type === 'timeseries'">
              {{$t('timeseries.description')}} {{$t('help.findHelp')}} <a :href="getLink('timeseries')" target="_blank">{{$t('general.here')}}.</a>
            </p>
            <p v-else>
              {{ getSourceDescription(newDataSource.adapter_type) }}
            </p>
          </template>

          <!-- HTTP -->
          <template v-if="newDataSource.adapter_type === 'http'">
            <v-text-field
              v-model="httpConfig.endpoint"
              :label="$t('general.endpoint')"
              :rules="[validateRequired]"
            />

            <v-select
              v-model="select_auth"
              :items="auth_methods"
              :label="$t('dataSources.authMethod')"
              @input="selectAuthMethodHttp"
              required
            />

            <div v-if="httpConfig.auth_method === 'basic'">
              <v-text-field
                v-model="httpConfig.username"
                :label="editLabel($t('general.username'))"
                required
              />

              <v-text-field
                v-model="httpConfig.password"
                :label="editLabel($t('general.password'))"
                required
              />
            </div>

            <div v-if="httpConfig.auth_method === 'token'">
              <v-text-field
                v-model="httpConfig.token"
                :label="editLabel($t('general.token'))"
                required
              />
            </div>

            <v-text-field
              v-model="httpConfig.poll_interval"
              :label="$t('dataSources.pollInterval')"
              type="number"
              required
            />

            <v-text-field
              v-model="httpConfig.timeout"
              :label="$t('general.timeout')"
              type="number"
              required
            />

            <v-checkbox
              v-model="httpConfig.secure"
              :label="$t('dataSources.useHttps')"
              required
            />
          </template>

          <!-- Aveva -->
          <template v-if="newDataSource.adapter_type === 'aveva'">
            <v-combobox
              clearable
              multiple
              small-chips
              deletable-chips
              v-model="avevaConfig.ignore_dbs"
              :label="$t('dataSources.ignoredDBtypes')"
              :placeholder="$t('general.typeToAdd')"
            />

            <v-combobox
              clearable
              multiple
              small-chips
              deletable-chips
              v-model="avevaConfig.ignore_element_types"
              :label="$t('dataSources.ignoredElements')"
              :placeholder="$t('general.typeToAdd')"
            />

            <v-combobox
              clearable
              multiple
              small-chips
              deletable-chips
              v-model="avevaConfig.ifc_element_types"
              :label="$t('dataSources.ifcTypes')"
              :placeholder="$t('general.typeToAdd')"
            />

            <h3>{{ $t('dataSources.ifcSettings.title') }}</h3>

            <v-row>
              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.format"
                  :label="$t('dataSources.ifcSettings.format')"
                  :rules="[validateRequired]"
                />
              </v-col>

              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.data_level"
                  :label="$t('dataSources.ifcSettings.dataLevel')"
                  :rules="[validateRequired]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.log_detail"
                  :label="$t('dataSources.ifcSettings.logLevel')"
                  :rules="[validateRequired]"
                />
              </v-col>

              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.arc_tolerance"
                  :label="$t('dataSources.ifcSettings.arcTolerance')"
                  :rules="[validateRequired]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col :cols="4">
                <v-checkbox
                  v-model="avevaConfig.ifc_settings.component_level"
                  :label="$t('dataSources.ifcSettings.componentLevel')"
                />
              </v-col>

              <v-col :cols="4">
                <v-checkbox
                  v-model="avevaConfig.ifc_settings.tube"
                  :label="$t('dataSources.ifcSettings.tube')"
                />
              </v-col>

              <v-col :cols="4">
                <v-checkbox
                  v-model="avevaConfig.ifc_settings.cl"
                  :label="$t('dataSources.ifcSettings.cl')"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.insu_translucency"
                  :label="$t('dataSources.ifcSettings.insuTranslucency')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>

              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.obst_translucency"
                  :label="$t('dataSources.ifcSettings.obstTranslucency')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.root"
                  :label="$t('dataSources.ifcSettings.root')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>

              <v-col :cols="6">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.pipe"
                  :label="$t('dataSources.ifcSettings.pipe')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col :cols="4">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.nozzle"
                  :label="$t('dataSources.ifcSettings.nozzle')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>

              <v-col :cols="4">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.structure"
                  :label="$t('dataSources.ifcSettings.structure')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>

              <v-col :cols="4">
                <v-text-field
                  v-model="avevaConfig.ifc_settings.cable"
                  :label="$t('dataSources.ifcSettings.cable')"
                  :rules="[validateRequired]"
                  type="number"
                />
              </v-col>
            </v-row>
          </template>

          <!-- P6 -->
          <template v-if="newDataSource.adapter_type === 'p6'">
            <v-row>
              <v-col :cols="6">
                <v-text-field
                  v-model="p6config.endpoint"
                  :label="$t('general.endpoint')"
                  :rules="[validateRequired]"
                />
              </v-col>

              <v-col :cols="6">
                <v-text-field
                  v-model="p6config.projectID"
                  :label="$t('general.projectID')"
                  :rules="[validateRequired]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col :cols="6">
                <v-text-field
                  v-model="p6config.username"
                  :label="editLabel($t('general.username'))"
                  :rules="[validateRequired]"
                />
              </v-col>

              <v-col :cols="6">
                <v-text-field
                  v-model="p6config.password"
                  :label="editLabel($t('general.password'))"
                  :append-icon="(hidePass ? 'mdi-eye' : 'mdi-eye-off')"
                  @click:append="() => (hidePass = !hidePass)"
                  :type="hidePass ? 'password' : 'text'"
                  :rules="[validateRequired]"
                />
              </v-col>
            </v-row>
          </template>

          <!-- Timeseries -->
          <template v-if="newDataSource.adapter_type === 'timeseries'">
            <h4><info-tooltip :message="$t('help.timeseriesTableDesign')"/></h4>

            <v-data-table
              :headers="timeseriesHeaders()"
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
                  :disabled="mode === 'edit'"
                  :rules="[validateRequired, validateColumnName(item.column_name)]"
                />
              </template>

              <template v-slot:[`item.type`]="{ item, index }">
                <v-select
                  :label="$t('general.dataType')"
                  :items='(index === 0) ? ["number", "number64", "date"] : dataTypes'
                  v-model="item.type"
                  :disabled="mode === 'edit'"
                  :rules="[validateRequired]"
                />
              </template>

              <template v-slot:[`item.property_name`]="{ item }">
                <v-text-field
                  :label="$t('properties.name')"
                  v-model="item.property_name"
                  :rules="[validateRequired]"
                />
              </template>

              <template v-slot:[`item.unique`]="{ item }">
                <v-select
                  :label="$t('general.unique')"
                  :items="[true, false]"
                  v-model="item.unique"
                  :disabled="mode === 'edit' || item.is_primary_timestamp"
                />
              </template>

              <template v-slot:[`item.actions`]="{ index }" v-if="mode === 'create'">
                <v-icon v-if="index !== 0" @click="removeColumn(index)">mdi-close</v-icon>
              </template>

              <template v-slot:expanded-item="{item}">
                <td :colspan="timeseriesHeaders().length">
                  <v-col v-if="item.is_primary_timestamp && item.type !== 'date'" :cols="12">
                    <v-text-field
                      :label="$t('timeseries.chunkInterval')"
                      v-model="timeseriesConfig.chunk_interval"
                      :disabled="mode === 'edit'"
                    >
                      <template slot="append-outer">
                        <a :href="getLink('chunk')" target="_blank">{{ $t('help.chunkInterval') }}</a>
                      </template>
                    </v-text-field>
                  </v-col>

                  <v-col v-if="item.type === 'date'" :cols="12">
                    <v-text-field
                      :label="$t('general.dateFormatString')"
                      v-model="item.date_conversion_format_string"
                      :rules="[validateDateString(item)]"
                      :error-messages="getTimeseriesErrors(item)"
                      @click:clear="resetTimeseriesErrors(item)"
                    >
                      <template slot="append-outer">
                        <a :href="getLink('date')" target="_blank">{{ $t('help.dateFormatString') }}</a>
                      </template>
                    </v-text-field>
                  </v-col>

                  <v-col v-if="item.type === 'date'" class="text-left">
                    <v-checkbox
                      :label="$t('timeseries.primaryTimestamp')"
                      v-model="item.is_primary_timestamp"
                      :disabled="mode === 'edit'"
                    />
                  </v-col>
                </td>
              </template>
            </v-data-table>

            <v-row v-if="mode === 'create'">
              <v-col :cols="12" style="padding:25px" align="center" justify="center">
                <v-btn @click="addColumn()">{{ $t('general.addColumn') }}</v-btn>
              </v-col>
            </v-row>

            <NodeAttachmentParameterDialog
              :containerID="containerID"
              :timeseriesConfig="timeseriesConfig"
              @removeParameter="removeParameter"
              @addParameter="addParameter()"
            />
          </template>

          <!-- Custom -->
          <template v-if="newDataSource.adapter_type === 'custom'">
            <!-- Allow users to choose an existing template to start from, or create a new one -->
            <v-row>
              <v-col>
                <SelectDataSourceTemplate v-if="mode === 'create'"
                  :containerID="containerID"
                  :noIndent="true"
                  :includeBlank="true"
                  @selected="setTemplate"
                />
              </v-col>
            </v-row>
            <!-- We use a component for this since it needs to be used both here and on the container level -->
            <DataSourceTemplateCard v-if="showTemplateCard"
              :mode="mode"
              type="dataSource"
              :template="newTemplate"
              :saveOption="saveTemplateOption"
              :key="newTemplate.name"
              @validationUpdated="setTemplateValidation"
            />
          </template>

          <!-- Data Retention and additional settings -->
          <template v-if="newDataSource.adapter_type && newDataSource.adapter_type !== 'timeseries'">
            <!-- Attach Data Staging records -->
            <v-checkbox v-model="rawRetentionEnabled">
              <template v-slot:label>
                {{$t('dataSources.attachStaging')}}
                <p class="text-caption" style="margin-left: 5px"></p>
              </template>

              <template v-slot:prepend>
                <info-tooltip :message="$t('help.attachStaging')"/>
              </template>
            </v-checkbox>
            <!-- Data Retention Days -->
            <small>{{ $t('help.dataRetention') }}</small>
            <div v-if="rawRetentionEnabled">
              <v-text-field :value="-1" disabled>
                <template v-slot:label>{{ $t('dataSources.dataRetentionDays') }}</template>
              </v-text-field>
            </div>
            <div v-else>
              <v-text-field 
                type="number"
                v-model="dataRetentionDays"
                :min="-1"
              >
                <template v-slot:label>{{ $t('dataSources.dataRetentionDays') }}</template>
              </v-text-field>
            </div>

            <!-- Source Active -->
            <v-checkbox
              v-model="newDataSource.active"
              :label="$t('general.enable')"
              required
            />

            <!-- Stop Nodes and Value Nodes -->
            <v-expansion-panels>
              <v-expansion-panel>
                <v-expansion-panel-header color="red">
                  <span style="color:white">{{ $t('dataSources.advanced') }}</span>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <!-- Stop Nodes -->
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
                    <template slot="append-outer">
                      <info-tooltip :message="$t('help.stopNodes')"/>
                    </template>
                  </v-combobox>

                  <!-- Value Nodes -->
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
                    <template slot="append-outer">
                      <info-tooltip :message="$t('help.valueNodes')"/>
                    </template>
                  </v-combobox>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
        </v-form>
      </template>

      <template v-if="mode === 'reprocess'">
        <v-row>
          <v-col :cols="12">
            <div>
              <v-alert type="warning">
                {{ $t('warnings.reprocessSource') }}
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'archive'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">
              {{ $t('warnings.archiveSource') }}
            </v-alert>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-progress-linear v-if="countLoading" indeterminate/>
            <div v-else>
              <v-alert type="warning">
                {{ $t('warnings.deleteSource') }}
              </v-alert>

              <v-alert type="error" v-if="recordCount > 0">
                {{ $t('warnings.forceDeleteSource') }}
              </v-alert>

              <v-alert type="error" v-if="recordCount > 0">
                {{ $t('warnings.dataDeleteSource') }}
                <v-checkbox
                  v-model="withData"
                  :label="$t('dataSources.deleteWithData')"
                ></v-checkbox>
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <template v-if="mode === 'create'">
        <v-btn v-if="newDataSource.adapter_type === 'timeseries'"
          color="primary"
          text
          :disabled="timeseriesConfig.columns.length === 0 || !validSource"
          @click="createDataSource()"
        >{{$t('general.create')}}</v-btn>
        <v-btn v-else 
          color="primary"
          text
          @click="createDataSource()"
          :disabled="!validSource"
        >{{ $t('general.create') }}</v-btn>
      </template>

      <template v-if="mode === 'edit'">
        <v-btn 
          color="primary" 
          text 
          @click="updateDataSource()"
          :disabled="!validSource"
        >{{$t('general.save')}}</v-btn>
      </template>

      <template v-if="mode === 'reprocess'">
        <v-btn color="primary" text @click="reprocessSource()">
          <v-progress-circular v-if="reprocessLoading" indeterminate/>
          {{ $t('general.reprocess') }}
        </v-btn>
      </template>

      <template v-if="mode === 'archive'">
        <v-btn color="primary" text @click="archiveSource()">
          <v-progress-circular v-if="archiveLoading" indeterminate/>
          {{ $t('general.archive') }}
        </v-btn>
      </template>

      <template v-if="mode === 'delete'">
        <v-btn color="primary" text @click="archiveSource()" v-if="!dataSource.archived">
          <v-progress-circular v-if="archiveLoading" indeterminate/>
          {{ $t('general.archive') }}
        </v-btn>
        <v-btn color="error" text @click="deleteSource()">
          <v-progress-circular v-if="deleteLoading" indeterminate/>
          <span v-if="recordCount <= 0">{{ $t('general.delete') }}</span>
          <span v-else>{{$t('general.forceDelete')}}</span>
        </v-btn>
      </template>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import NodeAttachmentParameterDialog from './NodeAttachmentParameterDialog.vue';
  import { 
    AvevaDataSourceConfig, 
    ContainerT, 
    DataSourceT, 
    DataSourceTemplateT, 
    DefaultAvevaDataSourceConfig, 
    DefaultHttpDataSourceConfig,
    DefaultP6DataSourceConfig, 
    DefaultStandardDataSourceConfig, 
    DefaultTimeseriesDataSourceConfig, 
    HttpDataSourceConfig,
    P6DataSourceConfig, 
    StandardDataSourceConfig, 
    TimeseriesColumn, 
    TimeseriesDataSourceConfig,
    CustomDataSourceConfig,
    DefaultCustomDataSourceConfig,
    DefaultDataSourceTemplate
  } from '@/api/types';
  import {v4 as uuidv4} from 'uuid';
  import DataSourceTemplateCard from './dataSourceTemplates/DataSourceTemplateCard.vue';
  import SelectDataSourceTemplate from './dataSourceTemplates/SelectDataSourceTemplate.vue';

  interface DataSourceActionsModel {
    config: {
      icon?: string
      title?: string
    }
    errorMessage: string
    reprocessLoading: boolean
    archiveLoading: boolean
    deleteLoading: boolean
    recordCount: number
    countLoading: boolean
    withData: boolean
    validSource: boolean
    selectSource: string
    container: ContainerT | undefined
    fastload: boolean
    standardConfig: StandardDataSourceConfig
    httpConfig: HttpDataSourceConfig
    avevaConfig: AvevaDataSourceConfig
    p6config: P6DataSourceConfig
    timeseriesConfig: TimeseriesDataSourceConfig
    customConfig: CustomDataSourceConfig
    select_auth: string
    hidePass: boolean
    expandedTimeSeries: TimeseriesColumn[]
    dataTypes: string[]
    rawRetentionEnabled: boolean
    dataRetentionDays: number
    stopNodes: string[]
    valueNodes: string[]
    newDataSource: DataSourceT
    p6preset: {
      endpoint: boolean
      projectID: boolean
    }
    auth_methods: {text: string, value: string}[]
    defaultFormatString: string
    timeseriesErrors: any[]
    newTemplate: DataSourceTemplateT
    templateSelected: boolean
    saveTemplateOption: boolean
    validTemplate: boolean
  }

  export default Vue.extend({
    name: 'DataSourceActions',

    components: { DialogBasic, NodeAttachmentParameterDialog, DataSourceTemplateCard, SelectDataSourceTemplate },

    props: {
      mode: {type: String, required: true},
      icon: {type: Boolean, required: false, default: true},
      containerID: {type: String, required: true},
      dataSource: {type: Object as PropType<DataSourceT>, required: false},
      maxWidth: {type: String, required: false, default: '80%'},
      timeseries: {type: Boolean, required: false, default: false},
    },

    data: (): DataSourceActionsModel => ({
      config: {},
      errorMessage: "",
      reprocessLoading: false,
      archiveLoading: false,
      deleteLoading: false,
      withData: false,
      recordCount: 0,
      countLoading: false,
      validSource: false,
      selectSource: "",
      container: undefined,
      fastload: true,
      standardConfig: DefaultStandardDataSourceConfig(),
      httpConfig: DefaultHttpDataSourceConfig(),
      avevaConfig: DefaultAvevaDataSourceConfig(),
      p6config: DefaultP6DataSourceConfig(),
      timeseriesConfig: DefaultTimeseriesDataSourceConfig(),
      customConfig: DefaultCustomDataSourceConfig(),
      select_auth: "",
      hidePass: true,
      expandedTimeSeries: [],
      dataTypes: [
        'number',
        'number64',
        'float',
        'float64',
        'date',
        'string',
        'boolean',
      ],
      rawRetentionEnabled: false,
      dataRetentionDays: -1,
      stopNodes: [],
      valueNodes: [],
      newDataSource: {
        name: "",
        adapter_type: undefined,
        active: false,
        config: undefined
      },
      p6preset: {
        endpoint: false,
        projectID: false,
      },
      auth_methods: [{text: "Basic", value: 'basic'}, {text: "Token", value: 'token'}],
      defaultFormatString: '%Y-%m-%d %H:%M:%S.%f',
      timeseriesErrors: [],
      newTemplate: DefaultDataSourceTemplate(),
      templateSelected: false,
      saveTemplateOption: false,
      validTemplate: false,
    }),

    beforeMount() {
      switch(this.mode) {
        case 'reprocess': {
          this.config.title = this.$t('dataSources.reprocess') as string;
          this.config.icon = 'mdi-restore';
          break;
        }
        case 'archive': {
          this.config.title = this.$t('dataSources.archive') as string;
          this.config.icon = 'mdi-archive';
          break;
        }
        case 'delete': {
          this.config.title = this.$t('dataSources.delete') as string;
          this.config.icon = 'mdi-delete';
          break;
        }
        case 'edit': {
          this.config.title = this.$t('dataSources.edit') as string;
          this.config.icon = 'mdi-pencil';
          break;
        }
        case 'create': {
          this.config.title = this.$t('dataSources.createNew') as string;
          break;
        }
      }

      if (this.mode === 'archive' || this.mode === 'delete') {
        this.$client.countImports(this.containerID, this.dataSource!.id!)
        .then((count) => {
          this.recordCount = count;
          this.countLoading = false;
        })
        .catch(e => this.errorMessage = e);
      }

      this.container = this.$store.getters.activeContainer;

      if (this.mode === 'edit') {
        this.newDataSource = Object.assign({}, this.dataSource);
      }
    },

    // we use computed properties to make watched properties reactive
    computed: {
      timeseriesComputed() {
        return this.timeseriesConfig.columns;
      },
      fastloadComputed() {
        return this.fastload;
      },
      showTemplateCard(): boolean {
        return (this.mode === 'create' && this.templateSelected) || this.mode === 'edit';
      }
    },

    // handlers are the names of the functions which are executed on property change
    watch: {
      fastloadComputed: {
        handler: 'fastloadChange',
        immediate: true,
      },
      timeseriesComputed: {
        handler: 'timeseriesColumnChange',
        immediate: true,
      }
    },

    methods: {
      getSourceDescription(sourceType?: string) {
        const types = this.getSourceTypes(false);
        return types.filter(t => t.value === sourceType)[0].description;
      },
      validateRequired(value: any) {
        return !!value || this.$t('validation.required');
      },
      getSourceTypes(timeseries: boolean): {text: string, value: string, description: string}[] {
        const types = [
          {text: this.$t('dataSources.standardName'), value: 'standard', description: this.$t('dataSources.standardDescription')},
          {text: this.$t('dataSources.httpName'), value: 'http', description: this.$t('dataSources.httpDescription')},
          {text: this.$t('dataSources.avevaName'), value: 'aveva', description: this.$t('dataSources.avevaDescription')},
          {text: this.$t('dataSources.p6Name'), value: 'p6', description: this.$t('dataSources.p6Description')},
          {text: this.$t('dataSources.customName'), value: 'custom', description: this.$t('dataSources.customDescription')},
        ]

        if (timeseries) {
          return [{text: this.$t('timeseries.timeseries'), value: 'timeseries', description: this.$t('timeseries.description')}];
        }

        const enabled_sources = this.container!.config.enabled_data_sources;
        if (enabled_sources && enabled_sources.length > 0) {
          return types.filter(type => enabled_sources.find(src => src === type.value));
        } else {
          return types;
        }
      },
      selectSourceType(adapter: string) {
        this.newDataSource.adapter_type = adapter;
      },
      // p6 functions
      p6configOptions() {
        const configs: {text: string, value: P6DataSourceConfig}[] = [
          {text: this.$t('dataSources.p6.defaultAdapter'), value: DefaultP6DataSourceConfig()}
        ];
        this.container?.config.p6_preset_configs?.forEach((config) => {
          configs.push({text: config.name!, value: config})
        });
        return configs;
      },
      checkConfiguredP6(): boolean {
        if (this.container!.config.p6_preset_configs!.length > 0) {
          return true;
        } else {
          return false;
        }
      },
      selectP6config(config: P6DataSourceConfig) {
        this.p6config = config;
        this.p6preset.endpoint = this.p6config.endpoint ? true : false;
        this.p6preset.projectID = this.p6config.projectID ? true : false;
      },
      // http function
      selectAuthMethodHttp(authMethod: any) {
        switch(authMethod) {
          case "basic": {
            this.httpConfig.auth_method = "basic";
            break;
          }

          case "token": {
            this.httpConfig.auth_method = "token";
            break;
          }

          default : {
            this.httpConfig.auth_method = "none";
          }
        }
      },
      // custom source functions
      setTemplate(t: DataSourceTemplateT) {
        this.newTemplate = t;
        this.templateSelected = true;
        this.saveTemplateOption = !!t.saveable;
      },
      setTemplateValidation(valid: boolean) {
        this.validTemplate = valid;
      },
      // returns label that indicates sensitive info is removed if edit mode
      editLabel(label: string): string {
        if (this.mode === 'edit') {
          return `${label} ${this.$t('help.removedForSecurity')}`
        } else {
          return label
        }
      },
      // timeseries specific functions
      timeseriesHeaders() {
        return [
          {
            text: this.$t('general.columnName'),
            value: 'column_name'
          },
          {
            text: this.$t('general.dataType'),
            value: 'type'
          },
          {
            text: this.$t('properties.name'),
            value: 'property_name'
          },
          {
            text: this.$t('general.unique'),
            value: 'unique'
          },
          {
            text: this.$t('general.actions'),
            value: 'actions',
            sortable: false
          },
        ];
      },
      removeColumn(index: number) {
        this.timeseriesConfig.columns.splice(index, 1);
      },
      addColumn() {
        if (this.timeseriesConfig.columns.length === 0) {
          this.timeseriesConfig.columns.push({
            id: uuidv4(),
            column_name: '',
            property_name: '',
            is_primary_timestamp: true,
            unique: false,
            type: 'date',
            date_conversion_format_string: this.fastload ? '%Y-%m-%d %H:%M:%S.%f' : 'YYYY-MM-DD HH24:MI:SS.US'
          });
          this.expandedTimeSeries.push(this.timeseriesConfig.columns[0]);
        } else {
          this.timeseriesConfig.columns.push({
            id: uuidv4(),
            column_name: '',
            property_name: '',
            is_primary_timestamp: false,
            unique: false
          })
        }
      },
      removeParameter(index: number) {
        this.timeseriesConfig.attachment_parameters.splice(index, 1);
      },
      addParameter() {
        this.timeseriesConfig.attachment_parameters.push({
          type: '',
          operator: '',
          key: '',
          value: ''
        });
      },
      getLink(type: string) {
        switch(type) {
          case 'timeseries': {
            return this.$t('links.timeseriesQuickStart') as string;
          }
          case 'chunk': {
            return this.$t('links.chunkInterval') as string;
          }
          case 'date': {
            const formatLink = this.fastload 
              ? this.$t('links.rustTime') 
              : this.$t('links.postgresTime')
            return formatLink;
          }
        }
      },
      // validation for ts column name and date format string
      validateColumnName(name: string) {
        if (this.timeseriesConfig.columns.filter(p => name === p.column_name).length > 1) {
          return this.$t('timeseries.colNameUnique');
        }

        // this regex should match only if the name starts with a letter, contains only alphanumerics
        // and underscores with no spaces and is between 1 and 30 characters in length
        const matches = /^[_a-z][a-z0-9_]{1,30}$/.exec(name)
        if(!matches || matches.length === 0) {
          return this.$t('help.nameRegex');
        }

        return true;
      },
      validateDateString(column: TimeseriesColumn) {
        if (column.date_conversion_format_string) {
          const validationMessage = this.fastloadComputed
            ? column.date_conversion_format_string!.includes('%') || this.$t('help.strftimeDate')
            : !column.date_conversion_format_string!.includes('%') || this.$t('help.postgresDate');

          // Store validation error for the column
          this.setTimeseriesError(column, !validationMessage);

          return validationMessage;
        }
        return true;
      },
      // watcher functions used to reactively validate date format strings
      timeseriesColumnChange() {
        const incorrectDateString = this.fastload ? 'YYYY-MM-DD HH24:MI:SS.US' : '%Y-%m-%d %H:%M:%S.%f';
        this.timeseriesConfig.columns.forEach(col => {
          if (col.date_conversion_format_string) {
            if (col.date_conversion_format_string === incorrectDateString) {
              col.date_conversion_format_string = this.defaultFormatString;
            }
            this.validateDateString(col);
          } else if (col.type === 'date') {
            col.date_conversion_format_string = this.defaultFormatString;
          }
        })
      },
      fastloadChange() {
        this.defaultFormatString = this.fastload ? '%Y-%m-%d %H:%M:%S.%f' : 'YYYY-MM-DD HH24:MI:SS.US';
        this.timeseriesColumnChange();
      },
      // these functions enable reactive validation on date string OR fastload change
      setTimeseriesError(column: TimeseriesColumn, hasError: boolean) {
        const index = this.timeseriesErrors.findIndex(errorItem => errorItem.id === column.id);
        if (hasError && index === -1) {
          this.timeseriesErrors.push({id: column.id, hasError: true});
        } else if (!hasError && index !== -1) {
          this.timeseriesErrors.splice(index, 1);
        }
      },
      getTimeseriesErrors(column: TimeseriesColumn) {
        const validationMessage = this.fastloadComputed ? this.$t('help.strftimeDate') : this.$t('help.postgresDate');
        return this.hasTimeseriesError(column) ? [validationMessage] : [];
      },
      resetTimeseriesErrors(column: TimeseriesColumn) {
        this.setTimeseriesError(column, false);
      },
      hasTimeseriesError(column: TimeseriesColumn) {
        return this.timeseriesErrors.some(errorItem => errorItem.id === column.id && errorItem.hasError);
      },
      // trigger any necessary resets upon open/close
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) {
          dialogInstance.close();
        }
      },
      openDialog() {
        this.$nextTick(() => {
          this.resetDialog();
        })
      },
      resetDialog() {
        this.rawRetentionEnabled = false;
        this.p6preset = {
          endpoint: false,
          projectID: false,
        };
        this.resetConfig();
        this.errorMessage = "";

        if (this.mode === 'reprocess') {
          this.reprocessLoading = false;
        }

        if (this.mode === 'delete') {
          this.deleteLoading = false;
        }

        if (this.mode === 'archive') {
          this.archiveLoading = false;
        }

        if (this.mode === 'create') {
          this.newDataSource = {
            name: "",
            adapter_type: "",
            active: false,
            config: undefined
          };
          this.selectSource = "";
        }

        if (this.mode === 'edit') {
          this.newDataSource = Object.assign({}, this.dataSource);
          this.rawRetentionEnabled = this.dataSource.config?.raw_retention_enabled!;
          this.dataRetentionDays = this.dataSource.config?.data_retention_days!;
        }
      },
      resetConfig() {
        if (this.mode === 'create') {
          this.standardConfig = DefaultStandardDataSourceConfig();
          this.httpConfig = DefaultHttpDataSourceConfig();
          this.avevaConfig = DefaultAvevaDataSourceConfig();
          this.p6config = DefaultP6DataSourceConfig();
          this.timeseriesConfig = DefaultTimeseriesDataSourceConfig();
          this.customConfig = DefaultCustomDataSourceConfig();
          this.stopNodes = [];
          this.valueNodes = [];
          this.templateSelected = false;
          this.saveTemplateOption = false;
        }

        // we need to reset the config for the specific data source type this is if edit mode
        if (this.mode === 'edit') {
          switch(this.dataSource.adapter_type!) {
            case "standard": {
              this.standardConfig = Object.assign({}, this.dataSource.config) as StandardDataSourceConfig;
              break;
            }

            case "http": {
              this.httpConfig = Object.assign({}, this.dataSource.config) as HttpDataSourceConfig;
              this.select_auth = this.httpConfig.auth_method;
              break;
            }

            case "timeseries": {
              this.timeseriesConfig = Object.assign({}, this.dataSource.config) as TimeseriesDataSourceConfig;
              break;
            }

            case "p6": {
              this.p6config = Object.assign({}, this.dataSource.config) as P6DataSourceConfig;
              break;
            }

            case "aveva": {
              this.avevaConfig = Object.assign({}, this.dataSource.config) as AvevaDataSourceConfig;
              break;
            }

            case "custom": {
              this.customConfig = Object.assign({}, this.dataSource.config) as CustomDataSourceConfig;
              this.newTemplate = this.customConfig.template;
              break;
            }
          }

          this.stopNodes = this.dataSource.config!.stop_nodes ? this.dataSource.config?.stop_nodes! : [];
          this.valueNodes = this.dataSource.config!.value_nodes ? this.dataSource.config?.value_nodes! : [];
        }
      },
      // prepare data source for create/update
      prepDataSource() {
        // @ts-ignore
        if (!this.$refs.form!.validate()) return;

        switch (this.newDataSource.adapter_type) {
          case "standard": {
            this.newDataSource.config = this.standardConfig;
            break;
          }

          case "http": {
            this.newDataSource.config = this.httpConfig;
            break;
          }

          case "aveva": {
            this.newDataSource.config = this.avevaConfig;
            break;
          }

          case "p6": {
            this.newDataSource.config = this.p6config;
            break;
          }

          case "custom": {
            this.customConfig.template = this.newTemplate!;
            this.newDataSource.config = this.customConfig;
            break;
          }

          case "timeseries": {
            this.timeseriesConfig.fast_load_enabled = this.fastload;
            this.newDataSource.config = this.timeseriesConfig;
            this.newDataSource.active = true;
            break;
          }
        }

        if (this.stopNodes.length > 0) this.newDataSource.config!.stop_nodes = this.stopNodes;
        if (this.valueNodes.length > 0) this.newDataSource.config!.value_nodes = this.valueNodes;
        if (this.rawRetentionEnabled === true) {
          this.newDataSource.config!.raw_retention_enabled = true;
          this.newDataSource.config!.data_retention_days = -1;
        } else {
          this.newDataSource.config!.raw_retention_enabled = this.rawRetentionEnabled;
          this.newDataSource.config!.data_retention_days = parseInt(String(this.dataRetentionDays), 10);
        }
      },
      // CRUD action functions
      createDataSource() {
        this.prepDataSource();

        this.$client.createDataSource(this.containerID, this.newDataSource)
          .then((dataSource) => {
            this.$emit('dataSourceCreated', dataSource);

            if (dataSource.adapter_type === 'timeseries') {
              this.$emit('timeseriesSourceCreated');
            }

            this.closeDialog();
          })
          .catch(e => {
            this.errorMessage = e
          });
      },
      updateDataSource() {
        this.prepDataSource();

        this.$client.updateDataSource(this.containerID, this.newDataSource)
          .then((dataSource) => {
            this.$emit('dataSourceUpdated', dataSource);
            this.closeDialog();
          })
          .catch(e => {
            this.errorMessage = e
          });
      },
      reprocessSource() {
        this.reprocessLoading = true;
        this.$client.reprocessDataSource(this.containerID, this.dataSource.id!)
          .then(() => {
            this.$emit('dataSourceReprocessed');
            this.closeDialog();
          })
          .catch(e => this.errorMessage = e);
      },
      deleteSource() {
        this.deleteLoading = true;
        this.$client.deleteDataSources(
          this.containerID,
          this.dataSource!.id!,
          {forceDelete: true, withData: this.withData})
        .then(() => {
          this.$emit('dataSourceDeleted');
          this.closeDialog();
        })
        .catch((e: any) => this.errorMessage = e);
      },
      archiveSource() {
        this.archiveLoading = true;
        this.$client.deleteDataSources(
          this.containerID,
          this.dataSource!.id!,
          {forceDelete: false, archive: true})
        .then(() => {
          this.$emit('dataSourceArchived');
          this.closeDialog();
        })
        .catch((e: any) => this.errorMessage = e);
      },
    }
  });
</script>