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
      <error-banner :message="errorMessage"/>

      <template v-if="mode === 'create' || mode === 'edit'">
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col :cols="12">
              <v-text-field
                :label="$t('dataSources.alias')"
                v-model="newConfiguredSource.name"
                :rules="[validateRequired]"
                :disabled="mode === 'edit'"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col :cols="6">
              <v-text-field
                :label="$t('general.endpoint')"
                v-model="newConfiguredSource.endpoint"
                :rules="[validateRequired]"
              />
            </v-col>
            <v-col :cols="6">
              <v-text-field
                :label="$t('general.projectID')"
                v-model="newConfiguredSource.projectID"
              />
            </v-col>
          </v-row>
        </v-form>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">{{$t('dataSources.deleteConfiguredConfirm')}}</v-alert>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'authorize'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">{{$t('dataSources.authContainerP6')}}</v-alert>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <template v-if="mode === 'create'">
        <v-btn
          :disabled="!valid"
          color="primary"
          text
          @click="createConfig"
        >{{$t('general.create')}}</v-btn>
      </template>

      <template v-if="mode === 'edit'">
        <v-btn
          :disabled="!valid"
          color="primary"
          text
          @click="editConfig"
        >{{$t('general.save')}}</v-btn>
      </template>

      <template v-if="mode === 'delete'">
        <v-btn
          color="error"
          text
          @click="deleteConfig()"
        >{{$t('general.delete')}}</v-btn>
      </template>

      <template v-if="mode === 'authorize'">
        <v-btn 
          color="primary"
          text
          @click="authP6()"
        >{{$t('general.authorize')}}</v-btn>
      </template>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, {PropType} from 'vue';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import { ContainerT, P6DataSourceConfig } from '@/api/types';
  import {v4 as uuidv4} from 'uuid';
  import Config from '@/config';

  interface ConfiguredSourceActionsModel {
    config: {icon?: string, title?: string}
    errorMessage: string
    newConfiguredSource: P6DataSourceConfig
    valid: boolean
    p6presetConfigs: P6DataSourceConfig[]
    index: number
    container: ContainerT | undefined
  }

  export default Vue.extend({
    name: 'ConfiguredSourceActions',

    components: {DialogBasic},

    props: {
      mode: {type: String, required: true},
      icon: {type: Boolean, required: false, default: true},
      maxWidth: {type: String, required: false, default: '80%'},
      configID: {type: String, required: false},
      containerID: {type: String, required: false},
      configuredSource: {type: Object as PropType<P6DataSourceConfig>, required: false}
    },

    data: (): ConfiguredSourceActionsModel => ({
      config: {},
      errorMessage: "",
      newConfiguredSource: {
        kind: 'p6',
        id: uuidv4(),
        name: '',
        endpoint: '',
        projectID: ''
      },
      valid: false,
      p6presetConfigs: [],
      index: -1,
      container: undefined
    }),

    beforeMount() {
      switch(this.mode) {
        case 'create': {
          this.config.title = this.$t('dataSources.addConfigured') as string;
          break;
        }
        case 'edit': {
          this.config.title = this.$t('dataSources.editConfigured') as string;
          this.config.icon = 'mdi-pencil';
          break;
        }
        case 'delete': {
          this.config.title = this.$t('dataSources.deleteConfigured') as string;
          this.config.icon = 'mdi-delete';
          break;
        }
        case 'authorize': {
          this.config.title = this.$t('dataSources.authorizeAdapter') as string;
          this.config.icon = 'mdi-lock-open';
          break;
        }
      }

      if (this.mode === 'edit') {
        // fetch container and preset configs
        this.container = this.$store.getters.activeContainer;
        this.p6presetConfigs = this.container!.config.p6_preset_configs! as P6DataSourceConfig[];
        // find the index of the provided config object based on supplied ID; set to 0 if not found
        this.index = this.p6presetConfigs.findIndex(config => config.id === this.configID);
        if (this.index === -1) this.index = 0;
        // set "newConfiguredSource" to the passed-in config
        this.newConfiguredSource = Object.assign({}, this.configuredSource);
      }
    },

    methods: {
      validateRequired(value: any): string | boolean {
        return !!value || this.$t('validation.required');
      },
      // DIALOG MANAGEMENT
      openDialog() {
        this.$nextTick(() => {this.resetDialog()});
      },
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) dialogInstance.close();
      },
      resetDialog() {
        this.errorMessage = "";

        if (this.mode === 'create') {
          this.newConfiguredSource = {
            kind: 'p6',
            id: uuidv4(),
            name: '',
            endpoint: '',
            projectID: ''
          }
        }

        if (this.mode === 'edit') {
          this.newConfiguredSource = Object.assign({}, this.configuredSource);
        }
      },
      // BUTTON FUNCTIONS
      createConfig() {
        this.$emit('created', this.newConfiguredSource);
        this.closeDialog();
      },
      editConfig() {
        this.$emit('edited', this.newConfiguredSource);
        this.closeDialog();
      },
      deleteConfig() {
        this.$emit('delete', this.configID);
        this.closeDialog();
      },
      authP6() {
        window.open(`${Config.p6RedirectAddress}/redirect/${this.containerID}`, "_blank");
      }
    }
  });
</script>