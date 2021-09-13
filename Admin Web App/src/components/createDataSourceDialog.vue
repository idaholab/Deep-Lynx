<template>
  <v-dialog v-model="dialog" max-width="700px" @click:outside="errorMessage = ''; dialog = false; clearNewAdapter()">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("createDataSource.newDataSource")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createDataSource.formTitle")}}</span>
      </v-card-title>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-container>
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
                    required
                ></v-text-field>
                <v-select
                    v-model="select"
                    :items="adapterTypes()"
                    @input="selectAdapter"
                    :label="$t('createDataSource.sourceType')"
                    required
                ></v-select>


                <div v-if="newDataSource.adapter_type === 'http'">
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


                <div v-if="newDataSource.adapter_type">
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
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="clearNewAdapter" >{{$t("home.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="createDataSource" >{{$t("home.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import {
  AvevaDataSourceConfig,
  DataSourceT,
  DefaultAvevaDataSourceConfig,
  DefaultHttpDataSourceConfig,
  DefaultJazzDataSourceConfig,
  DefaultStandardDataSourceConfig,
  HttpDataSourceConfig,
  JazzDataSourceConfig,
  StandardDataSourceConfig
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

  adapterTypes() {
    return [
      {text: this.$t('createDataSource.standard'), value: 'standard'},
      {text: this.$t('createDataSource.http'), value: 'http'},
      {text: this.$t('createDataSource.jazz'), value: 'jazz'},
      {text: this.$t('createDataSource.aveva'), value: 'aveva'},
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

      default: {
        this.newDataSource.config = this.standardConfig
      }
    }

    if(this.stopNodes.length > 0) this.newDataSource.config.stop_nodes = this.stopNodes
    if(this.valueNodes.length > 0) this.newDataSource.config.value_nodes = this.valueNodes

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


}
</script>
