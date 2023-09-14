<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('containers.settings')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
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
                  :rules="[validateRequired]"
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
          :items="p6configs"
          class="elevation-1 mt-5"
        >
          <template v-slot:top>
            <v-toolbar flat color="white">
              <v-col :cols="8">
                <h3>{{$t('dataSources.p6.defaultConfig')}}</h3>
                <span>{{$t('dataSources.p6.configDescription')}}</span>
              </v-col>
              <v-spacer/>
              <ConfiguredSourceActions
                mode="create"
                :icon="false"
                @created="addConfig($event)"
              />
            </v-toolbar>
          </template>
          <template v-slot:[`item.name`]="{ item }">
            <span>{{ item.name }}</span>
          </template>
          <template v-slot:[`item.endpoint`]="{ item }">
            <span>{{ item.endpoint }}</span>
          </template>
          <template v-slot:[`item.projectID`]="{ item }">
            <span>{{ item.projectID }}</span>
          </template>
          <template v-slot:[`item.actions`]="{ item }">
            <ConfiguredSourceActions
              :icon="true"
              mode="edit"
              :configID="item.id"
              :configuredSource="item"
              @edited="editConfig($event)"
            />
            <!-- This will be replaced by the custom data source type very soon -->
            <!-- Commenting it out for the time being but it will be useful when designing the custom ds frontend -->
            <!-- <ConfiguredSourceActions
              :icon="true"
              mode="authorize"
              :containerID="containerID"
              :configID="item.id"
            /> -->
            <ConfiguredSourceActions
              :icon="true"
              mode="delete"
              :configID="item.id"
              @delete="deleteConfig($event)"
            />
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions>
        <template v-if="container">
          <delete-container-dialog :containerID="containerID"></delete-container-dialog>
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
  import {ContainerT, P6DataSourceConfig} from "@/api/types";
  import DeleteContainerDialog from "@/components/ontology/containers/deleteContainerDialog.vue";
  import SelectDataSourceTypes from "@/components/dataSources/SelectDataSourceTypes.vue";
  import ConfiguredSourceActions from '@/components/dataSources/ConfiguredSourceActions.vue';
  import {v4 as uuidv4} from 'uuid';

  interface SettingsModel {
    errorMessage: string,
    successMessage: string,
    loading: boolean,
    valid: boolean,
    container?: ContainerT
    containerID: string
    p6configs: P6DataSourceConfig[]
  }

  export default Vue.extend ({
    name: 'ViewSettings',

    components: { 
      DeleteContainerDialog, 
      SelectDataSourceTypes,
      ConfiguredSourceActions 
    },

    data: (): SettingsModel => ({
      errorMessage: "",
      successMessage: "",
      loading: false,
      valid: true,
      container: undefined as SettingsModel['container'] | undefined,
      containerID: '',
      p6configs: []
    }),

    methods: {
      deleteConfig(configID: string) {
        this.p6configs = this.p6configs.filter(
          config => config.id !== configID
        );
        this.updateContainer();
      },
      addConfig(config: P6DataSourceConfig) {
        config.id = uuidv4();
        this.p6configs.push(config);
        this.updateContainer();
      },
      editConfig(config: P6DataSourceConfig) {
        if (!config.id) {
          this.errorMessage = `unable to update configuration ${config.name}`
        }
        // replace the config with the matching id
        this.p6configs = this.p6configs.map(c => c.id === config.id ? config : c);
        this.updateContainer();
      },
      updateContainer() {
        // @ts-ignore
        if(!this.$refs.form!.validate()) return;

        this.container!.config.p6_preset_configs = this.p6configs;

        this.$client.updateContainer(this.container)
            .then((container) => {
              this.$store.commit('setEditMode', false);
              this.$store.commit('setActiveContainer', container);
              this.container = container;
              this.p6configs = container!.config.p6_preset_configs ? container!.config.p6_preset_configs : [];
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
          {text: this.$t('general.endpoint'), value: 'endpoint'},
          {text: this.$t('general.projectID'), value: 'projectID'},
          {text: this.$t('general.actions'), value: 'actions', sortable: false}
        ]
      },
      validateRequired(v: any) {
        return !!v || this.$t('validation.required');
      },
    },

    beforeMount() {
      // set container and ensure that configured data sources exists
      this.container = this.$store.getters.activeContainer;
      this.p6configs = this.container!.config.p6_preset_configs ? this.container!.config.p6_preset_configs : [];
      this.containerID = this.container!.id;
    },
  });
</script>
