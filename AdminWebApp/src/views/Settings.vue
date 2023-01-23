<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('home.settingsDescription')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('settings.explanation')}}</p>
            <v-form ref="form" v-model="valid" lazy-validation v-if="container">
              <v-text-field
                  v-model="container.name"
                  :label="$t('containers.name')"
                  required
                  disabled
                  class="disabled"
              ></v-text-field>
              <v-textarea
                  :rows="2"
                  v-model="container.description"
                  :label="$t('containers.description')"
                  :rules="[v => !!v || $t('dataMapping.required')]"
              ></v-textarea>

              <v-checkbox v-model="container.config.ontology_versioning_enabled">
                <template v-slot:label>
                  {{$t('containers.ontologyVersioningEnabled')}} <p class="text-caption" style="margin-left: 5px"> {{$t('beta')}}</p>
                </template>

                <template slot="prepend"><info-tooltip :message="$t('containers.ontologyVersioningHelp')"></info-tooltip> </template>
              </v-checkbox>
            </v-form>
            <h1 v-else>{{$t('containers.noneSelected')}}</h1>
          </v-col>
        </v-row>
        <v-row>
          <v-col :cols="12">
            <select-data-source-types 
              :values="container.config.enabled_data_sources" 
              @selected="setDataSources"
            />
          </v-col>
        </v-row>
        <v-data-table v-if="container?.config.enabled_data_sources.includes('p6')"
          :headers="configuredSourcesHeaders()"
          :items="container?.config.configured_data_sources"
          class="elevation-1 mt-5"
        >
          <template v-slot:top>
            <v-toolbar flat color="white">
              <v-col :cols="8">
                <h3>{{$t('createDataSource.p6defaultConfig')}}</h3>
                <span>{{$t('createDataSource.p6defaultConfigDescription')}}</span>
              </v-col>
              <v-col :cols="4">
                <create-configured-source-dialog @created="addConfig(...arguments)"/>
              </v-col>
            </v-toolbar>
          </template>
          <template v-slot:[`item.name`]="{ item }">
            <span>{{ item.name }}</span>
          </template>
          <template v-slot:[`item.type`]="{ item }">
            <span>{{ item.type }}</span>
          </template>
          <template v-slot:[`item.actions`]="{ item }">
            <edit-configured-source-dialog :configID="item.id" @edited="updateContainer()"/>
            <delete-configured-source-dialog :configID="item.id" @delete="deleteConfig(...arguments)"/>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions>
        <delete-container-dialog :containerID="container.id"></delete-container-dialog>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="updateContainer" ><span v-if="!loading">{{$t("home.save")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import {ContainerT} from "@/api/types";
import DeleteContainerDialog from "@/components/ontology/containers/deleteContainerDialog.vue";
import SelectDataSourceTypes from "@/components/dataSources/selectDataSourceTypes.vue";
import CreateConfiguredSourceDialog from '@/components/dataSources/createConfiguredSourceDialog.vue';
import DeleteConfiguredSourceDialog from '@/components/dataSources/deleteConfiguredSourceDialog.vue';
import EditConfiguredSourceDialog from '@/components/dataSources/editConfiguredSourceDialog.vue';
import {v4 as uuidv4} from 'uuid';

@Component({components: {
  DeleteContainerDialog, 
  SelectDataSourceTypes, 
  CreateConfiguredSourceDialog, 
  DeleteConfiguredSourceDialog,
  EditConfiguredSourceDialog
}})
export default class Settings extends Vue {
  container: ContainerT | undefined = undefined
  errorMessage = ""
  successMessage = ""
  loading = false
  valid = true

  beforeMount() {
    // set container and ensure that configured data sources exists
    this.container = this.$store.getters.activeContainer
    if (!this.container?.config.configured_data_sources) {this.container!.config.configured_data_sources = []}
  }

  deleteConfig(configID: string) {
    this.container!.config.configured_data_sources = this.container?.config.configured_data_sources?.filter(
      config => config.id !== configID
    )
    this.updateContainer()
  }

  addConfig(config: P6SourceConfig) {
    this.container!.config.configured_data_sources?.push(config)
    this.updateContainer()
  }

  updateContainer() {
    // @ts-ignore
    if(!this.$refs.form!.validate()) return;

    this.$client.updateContainer(this.container)
        .then((container) => {
          this.$store.commit('setEditMode', false)
          this.$store.commit('setActiveContainer', container)
          this.successMessage = this.$t('containers.savedSuccessfully') as string

          setTimeout(() => this.successMessage = "", 5000)
        })
        .catch(e => {
          this.errorMessage = e
        })
        .finally(() => this.loading = false)
  }

  setDataSources(sources: string[]) {
    this.container!.config!.enabled_data_sources! = sources
  }

  configuredSourcesHeaders() {
    return [
      {text: this.$t('dataSources.name'), value: 'name'},
      {text: this.$t('dataSources.adapterType'), value: 'type'},
      {text: this.$t('dataSources.actions'), value: 'actions', sortable: false}
    ]
  }
}

type P6SourceConfig = {
  id?: string
  name?: string;
  endpoint: string;
  projectID: string;
  username?: string;
  password?: string;
  type: string;
}
</script>
