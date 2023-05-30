<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="70%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("dataSources.edit")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("dataSources.edit")}}</span>
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
                  :label="$t('general.name')"
                  :rules="[v => !!v || $t('validation.required')]"
              ></v-text-field>
              <v-select
                  v-model="dataSource.adapter_type"
                  :items="adapterTypes()"
                  :label="$t('dataSources.selectType')"
                  disabled
                  :rules="[v => !!v || $t('validation.required')]"
              ></v-select>


              <div v-if="dataSource.adapter_type === 'http'">
                <v-text-field
                    v-model="dataSource.config.endpoint"
                    :label="$t('general.endpoint')"
                    :rules="[v => !!v || $t('validation.required')]"
                ></v-text-field>

                <v-select
                    v-model="dataSource.config.auth_method"
                    :items="authMethods"
                    :label="$t('dataSources.authMethod')"
                    :rules="[v => !!v || $t('validation.required')]"
                >
                </v-select>
                <div v-if="dataSource.config.auth_method === 'basic'">
                  <v-text-field
                      v-model="dataSource.config.username"
                      :label="$t('general.username')"
                      :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.password"
                      :label="$t('general.password')"
                      :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>
                </div>

                <div v-if="dataSource.config.auth_method === 'token'">
                  <v-text-field
                      v-model="dataSource.config.token"
                      :label="$t('general.token')"
                      :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                </div>
                  <v-text-field
                      v-model="dataSource.config.poll_interval"
                      :label="$t('dataSources.pollInterval')"
                      type="number"
                      :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.timeout"
                      :label="$t('general.timeout')"
                      type="number"
                      :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-checkbox
                      v-model="dataSource.config.secure"
                      :label="$t('dataSources.useHttps')"
                      :rules="[v => !!v || $t('validation.required')]"
                  ></v-checkbox>

              </div>

                <div v-if="dataSource.adapter_type === 'jazz'">
                  <v-text-field
                      v-model="dataSource.config.project_name"
                      :label="$t('general.projectName')"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="dataSource.config.artifact_types"
                      :label="$t('dataSources.jazzArtifacts')"
                      :placeholder="$t('general.typeToAdd')"
                  ></v-combobox>

                  <v-text-field
                      v-model="dataSource.config.endpoint"
                      :label="$t('general.endpoint')"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.token"
                      :label="$t('general.token')"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.poll_interval"
                      :label="$t('dataSources.pollInterval')"
                      type="number"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.timeout"
                      :label="$t('general.timeout')"
                      type="number"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-text-field
                      v-model="dataSource.config.limit"
                      :label="$t('dataSources.recordsPerCall')"
                      type="number"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-text-field>

                  <v-checkbox
                      v-model="dataSource.config.secure"
                      :label="$t('dataSources.useHttps')"
                       :rules="[v => !!v || $t('validation.required')]"
                  ></v-checkbox>
                </div>

              <div v-if="dataSource.adapter_type === 'aveva'">
                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="dataSource.config.ignore_dbs"
                    :label="$t('dataSources.ignoredDBtypes')"
                    :placeholder="$t('general.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="dataSource.config.ignore_element_types"
                    :label="$t('dataSources.ignoredElements')"
                    :placeholder="$t('general.typeToAdd')"
                ></v-combobox>

                <v-combobox
                    clearable
                    multiple
                    small-chips
                    deletable-chips
                    v-model="dataSource.config.ifc_element_types"
                    :label="$t('dataSources.ifcTypes')"
                    :placeholder="$t('general.typeToAdd')"
                ></v-combobox>

                <h3>{{$t("dataSources.ifcSettings.title")}}</h3>
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.format"
                        :label="$t('dataSources.ifcSettings.format')"
                         :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.data_level"
                        :label="$t('dataSources.ifcSettings.dataLevel')"
                         :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.log_detail"
                        :label="$t('dataSources.ifcSettings.logLevel')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.arc_tolerance"
                        :label="$t('dataSources.ifcSettings.arcTolerance')"
                         :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="dataSource.config.ifc_settings.component_level"
                        :label="$t('dataSources.ifcSettings.componentLevel')"
                    ></v-checkbox>

                  </v-col>
                  <v-col :cols="4">
                    <v-checkbox
                        v-model="dataSource.config.ifc_settings.tube"
                        :label="$t('dataSources.ifcSettings.tube')"
                    ></v-checkbox>

                  </v-col>

                  <v-col :cols="4">
                    <v-checkbox
                        v-model="dataSource.config.ifc_settings.cl"
                        :label="$t('dataSources.ifcSettings.cl')"
                    ></v-checkbox>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.insu_translucency"
                        :label="$t('dataSources.ifcSettings.insuTranslucency')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.obst_translucency"
                        :label="$t('dataSources.ifcSettings.obstTranslucency')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.root"
                        :label="$t('dataSources.ifcSettings.root')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="6">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.pipe"
                        :label="$t('dataSources.ifcSettings.pipe')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
                <v-row>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.nozzle"
                        :label="$t('dataSources.ifcSettings.nozzle')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.structure"
                        :label="$t('dataSources.ifcSettings.structure')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                  <v-col :cols="4">
                    <v-text-field
                        v-model="dataSource.config.ifc_settings.cable"
                        :label="$t('dataSources.ifcSettings.cable')"
                         :rules="[v => !!v || $t('validation.required')]"
                        type="number"
                    ></v-text-field>

                  </v-col>
                </v-row>
              </div>

              <div v-if="dataSource.adapter_type === 'p6'">
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      v-model="dataSource.config.endpoint"
                      :label="$t('general.endpoint')"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      v-model="dataSource.config.projectID"
                      :label="$t('general.projectID')"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      v-model="dataSource.config.username"
                      :label="$t('general.username')"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      v-model="dataSource.config.password"
                      :label="$t('general.password')"
                      :append-icon="(hideP6pass ? 'mdi-eye' : 'mdi-eye-off')"
                      @click:append="() => (hideP6pass = !hideP6pass)"
                      :type="hideP6pass ? 'password' : 'text'"
                      :rules="[v => !!v || $t('validation.required')]"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </div>

              <div v-if="dataSource.adapter_type === 'timeseries'">
                <v-checkbox
                  :label="$t('timeseries.enableFastload')"
                  v-model="fastload"
                />

                <h4>{{$t('timeseries.tableDesign')}}<info-tooltip :message="$t('help.timeseriesTableDesign')"></info-tooltip></h4>

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
                        :label="$t('general.columnName')"
                        v-model="item.column_name"
                        disabled
                    >
                    </v-text-field>
                  </template>

                  <template v-slot:[`item.type`]="{ item }">
                    <v-select
                        :label="$t('general.dataType')"
                        v-model="item.type"
                        :items="dataTypes"
                        disabled
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
                        :items="[true, false]"
                        v-model="item.unique"
                        disabled
                    />
                  </template>

                  <template v-slot:expanded-item="{ item }">
                    <td :colspan="timeSeriesHeader().length">
                      <v-col v-if="item.is_primary_timestamp && item.type !== 'date'" :cols="12">
                        <v-text-field
                            :label="$t('timeseries.chunkInterval')"
                            v-model="dataSource.config.chunk_interval"
                            disabled
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

                <node-attachment-parameter-dialog
                    :containerID="containerID"
                    :timeseriesConfig="dataSource.config"
                    @removeParameter="removeParameter"
                    @addParameter="addParameter"
                >
                </node-attachment-parameter-dialog>
              </div>

              <div v-if="dataSource.adapter_type && dataSource.adapter_type !== 'timeseries'">
                <v-checkbox v-model="dataSource.config.raw_retention_enabled">
                  <template v-slot:label>
                    {{$t('dataSources.attachStaging')}}<p class="text-caption" style="margin-left: 5px"></p>
                  </template>

                  <template slot="prepend"><info-tooltip :message="$t('help.attachStaging')"></info-tooltip></template>
                </v-checkbox>

                <small>{{$t('help.dataRetention')}}</small>
                <div v-if="dataSource.config.raw_retention_enabled">
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
                    v-model="dataSource.config.data_retention_days"
                    :min="-1"
                  >
                    <template v-slot:label>{{$t('dataSources.dataRetentionDays')}} </template>
                  </v-text-field>
                </div>

                <v-checkbox
                    v-model="dataSource.active"
                    :label="$t('general.enable')"
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
                          v-model="dataSource.config.stop_nodes"
                          :label="$t('dataSources.stopNodes')"
                          :placeholder="$t('general.typeToAdd')"
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('help.stopNodes')"></info-tooltip> </template>
                      </v-combobox>

                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="dataSource.config.value_nodes"
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
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="updateDataSource" :disabled="!valid" >{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator"
import {
  DataSourceT,
  HttpDataSourceConfig, TimeseriesDataSourceConfig,
} from "@/api/types";
import NodeAttachmentParameterDialog from "@/components/dataSources/nodeAttachmentParameterDialog.vue";

@Component({components:{NodeAttachmentParameterDialog}})
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
  hideP6pass = true
  fastload = (this.dataSource.config as TimeseriesDataSourceConfig).fast_load_enabled
  rules={
    dateString: (value: any) => {
      if (this.getFastload()) {
        return value.includes('%') || this.$t('help.strftimeDate')
      } else {
        return !value.includes('%') || this.$t('help.postgresDate')
      }
    }
  }

  dataTypes = [
    'number',
    'number64',
    'float',
    'float64',
    'date',
    'string',
    'boolean',
    ]

  adapterTypes() {
    return [
      {text: this.$t('dataSources.standardName'), value: 'standard'},
      {text: this.$t('dataSources.httpName'), value: 'http'},
      {text: this.$t('dataSources.jazzName'), value: 'jazz'},
      {text: this.$t('dataSources.avevaName'), value: 'aveva'},
      {text: this.$t('dataSources.p6Name'), value: 'p6'},
      {text: this.$t('timeseries.timeseries'), value: 'timeseries'},
    ]
  }

  // for some reason calling the variable itself in the validation always results
  // in the default "true". this getter is a workaround for that
  getFastload() {
    return this.fastload
  }

  @Watch('fastload')
  validateDateString() {
    // @ts-ignore
    this.$refs.form!.validate()
  }

  // upon any changes to the timeseries config, re-validate the form
  // to ensure date string format passes validation
  @Watch('dataSource.config', {deep: true})
  checkDateString() {
    if (this.dataSource.adapter_type === 'timeseries' && (this.dataSource.config as TimeseriesDataSourceConfig).columns.length > 0 && this.valid) {
      // @ts-ignore
      this.$refs.form!.validate()
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

  timeseriesHelpLink(): string {
    if (this.fastload) {
      return this.$t('links.rustTime') as string
    }
    return this.$t('links.postgresTime') as string
  }

  chunkIntervalLink() {
    return this.$t('links.chunkInterval')
  }

  updateDataSource() {
    this.dataSource.config!.data_retention_days = parseInt(String(this.dataSource.config!.data_retention_days), 10)

    if (this.dataSource.adapter_type === 'timeseries') {
      (this.dataSource.config as TimeseriesDataSourceConfig).fast_load_enabled = this.fastload;
    }

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