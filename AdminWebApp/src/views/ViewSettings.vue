<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('containers.settings')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('containers.settingsDescription')}}</p>
            <v-form ref="form" v-model="valid" lazy-validation v-if="container">
              <v-text-field
                  v-model="container.name"
                  :label="$t('general.name')"
                  required
                  disabled
                  class="disabled"
              ></v-text-field>
              <v-textarea
                  :rows="2"
                  v-model="container.description"
                  :label="$t('general.description')"
                  :rules="[requiredRule]"
              ></v-textarea>

              <v-row>
                <v-col :cols="6">
                  <v-checkbox v-model="container.config.ontology_versioning_enabled">
                    <template v-slot:label>
                      {{$t('ontology.versioningEnabled')}}<p class="text-caption" style="margin-left: 5px">{{$t('general.beta')}}</p>
                    </template>

                    <template v-slot:prepend><info-tooltip :message="$t('help.ontologyVersioning')"></info-tooltip></template>
                  </v-checkbox>
                </v-col>
              </v-row>
            </v-form>
          </v-col>
        </v-row>
        <v-row>
          <v-col :cols="12">
            <template v-if="container">
              <SelectDataSourceTypes
                :values="container.config.enabled_data_sources"
                @selected="setDataSources"
              />
            </template>
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
                <h3>{{$t('dataSources.p6.defaultConfig')}}</h3>
                <span>{{$t('dataSources.p6.configDescription')}}</span>
              </v-col>
              <v-col :cols="4">
                <CreateConfiguredSourceDialog @created="addConfig($event)"/>
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
            <EditConfiguredSourceDialog :configID="item.id" @edited="updateContainer()"/>
            <DeleteConfiguredSourceDialog :configID="item.id" @delete="deleteConfig($event)"/>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions>
        <template v-if="container">
          <delete-container-dialog :containerID="container.id"></delete-container-dialog>
        </template>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="updateContainer" ><span v-if="!loading">{{$t("general.save")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ContainerT} from "@/api/types";
  import DeleteContainerDialog from "@/components/ontology/containers/deleteContainerDialog.vue";
  import SelectDataSourceTypes from "@/components/dataSources/SelectDataSourceTypes.vue";
  import CreateConfiguredSourceDialog from '@/components/dataSources/CreateConfiguredSourceDialog.vue';
  import DeleteConfiguredSourceDialog from '@/components/dataSources/DeleteConfiguredSourceDialog.vue';
  import EditConfiguredSourceDialog from '@/components/dataSources/EditConfiguredSourceDialog.vue';

  interface SettingsModel {
    errorMessage: string,
    successMessage: string,
    loading: boolean,
    valid: boolean,
    container?: ContainerT
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

  export default Vue.extend ({
    name: 'ViewSettings',

    components: { DeleteContainerDialog, SelectDataSourceTypes, CreateConfiguredSourceDialog, DeleteConfiguredSourceDialog, EditConfiguredSourceDialog },

    data: (): SettingsModel => ({
      errorMessage: "",
      successMessage: "",
      loading: false,
      valid: true,
      container: undefined as SettingsModel['container'] | undefined,
    }),

    methods: {
      deleteConfig(configID: string) {
        if (this.container?.config?.configured_data_sources) {
          this.container.config.configured_data_sources = this.container.config.configured_data_sources.filter(
            config => config.id !== configID
          );
          this.updateContainer();
        }
      },
      addConfig(config: P6SourceConfig) {
        if (this.container?.config?.configured_data_sources) {
          this.container.config.configured_data_sources.push(config);
          this.updateContainer();
        }
      },
      updateContainer() {
        // @ts-ignore
        if(!this.$refs.form!.validate()) return;

        this.$client.updateContainer(this.container)
            .then((container) => {
              this.$store.commit('setEditMode', false)
              this.$store.commit('setActiveContainer', container)
              this.successMessage = this.$t('containers.settingsSaved') as string

              setTimeout(() => this.successMessage = "", 5000)
            })
            .catch(e => {
              this.errorMessage = e
            })
            .finally(() => this.loading = false)
      },
      setDataSources(sources: string[]) {
        this.container!.config!.enabled_data_sources! = sources
      },
      configuredSourcesHeaders() {
        return [
          {text: this.$t('general.name'), value: 'name'},
          {text: this.$t('dataSources.adapterType'), value: 'type'},
          {text: this.$t('general.actions'), value: 'actions', sortable: false}
        ]
      },
      requiredRule(v: string | number | boolean | null | undefined) {
        return !!v || this.$t('validation.required');
      },
    },

    beforeMount() {
      // set container and ensure that configured data sources exists
      this.container = this.$store.getters.activeContainer
      if (!this.container?.config.configured_data_sources) {this.container!.config.configured_data_sources = []}
    }
  });
</script>
