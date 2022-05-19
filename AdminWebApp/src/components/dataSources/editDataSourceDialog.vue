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


              <div v-if="dataSource.adapter_type">
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
                      ></v-combobox>

                      <v-combobox
                          style="margin-top: 10px"
                          clearable
                          multiple
                          small-chips
                          deletable-chips
                          v-model="dataSource.config.value_nodes"
                          :label="$t('editDataSource.valueNodes')"
                          :placeholder="$t('editDataSource.typeToAdd')"
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
  HttpDataSourceConfig,
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

  adapterTypes() {
    return [
      {text: this.$t('editDataSource.standard'), value: 'standard'},
      {text: this.$t('editDataSource.http'), value: 'http'},
      {text: this.$t('editDataSource.jazz'), value: 'jazz'},
      {text: this.$t('editDataSource.aveva'), value: 'aveva'},
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
}
</script>
