<template>
  <DialogBasic
    ref="dialog"
    :icon-name="config.icon"
    :max-width="maxWidth"
    :icon="icon"
    :title="config.title"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>

      <template v-if="mode === 'create' || mode === 'edit'">
        <DataSourceTemplateCard
          :mode="mode"
          type="container"
          :template="toSave"
          :key="refreshKey"
          @validationUpdated="setTemplateValidation"
        />
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="error">
              {{ $t('warnings.deleteTemplate') }}
            </v-alert>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'authorize'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">
              {{$t('dataSourceTemplates.authorizeDescription')}}
            </v-alert>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'import'">
        <div>{{ $t('help.importTemplates') }}</div>
        <!-- Using v-cols to make sure the drop downs don't interfere with button clickability -->
        <v-row>
          <v-col :cols="10">
            <ContainerSelect 
              @containerSelected="setContainer"
              :exclude="true"
              :excludedID="containerID"
              :key="refreshKey"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col :cols="10">
            <SelectDataSourceTemplate v-if="selectedContainer"
              :containerID="selectedContainer.id"
              :noIndent="true"
              :multiple="true"
              @selected="setTemplates"
              :key="selectedContainer.id"
            />
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <template v-if="mode === 'create'">
        <v-progress-circular indeterminate v-if="loading"/>
        <v-btn v-if="!loading"
          color="primary" 
          :disabled="isDisabled" 
          text 
          @click="saveTemplates('created')"
        >{{ $t('general.create') }}</v-btn>
      </template>

      <template v-if="mode === 'edit'">
        <v-progress-circular indeterminate v-if="loading"/>
        <v-btn v-if="!loading"
          color="primary" 
          text 
          @click="saveTemplates('updated')"
        >{{ $t('general.save') }}</v-btn>
      </template>

      <template v-if="mode === 'delete'">
        <v-progress-circular indeterminate v-if="loading"/>
        <v-btn v-if="!loading"
          color="error" 
          text 
          @click="deleteTemplate()"
        >{{ $t('general.delete') }}</v-btn>
      </template>

      <template v-if="mode === 'authorize'">
        <v-btn
          color="primary" 
          text 
          @click="authorizeTemplate()"
        >{{ $t('general.authorize') }}</v-btn>
      </template>

      <template v-if="mode === 'import'">
        <v-progress-circular indeterminate v-if="loading"/>
        <v-btn v-if="!loading"
          color="primary" 
          text 
          @click="saveTemplates('imported')"
        >{{ $t('imports.import') }}</v-btn>
      </template>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
import Vue, {PropType} from 'vue';
import DialogBasic from '../../dialogs/DialogBasic.vue';
import DataSourceTemplateCard from './DataSourceTemplateCard.vue';
import { DataSourceTemplateT, DefaultDataSourceTemplate, ContainerT } from '@/api/types';
import SelectDataSourceTemplate from './SelectDataSourceTemplate.vue';
import ContainerSelect from '@/components/ontology/containers/ContainerSelect.vue';

interface DataSourceTemplateActionsModel {
  errorMessage: string;
  disabled: boolean;
  config: {icon?: string, title?: string};
  toSave: DataSourceTemplateT;
  selectedContainer: ContainerT | null;
  toImport: DataSourceTemplateT[];
  refreshKey: number;
  loading: boolean;
}

export default Vue.extend({
  name: 'DataSourceTemplateActions',

  components: { DialogBasic, DataSourceTemplateCard, SelectDataSourceTemplate, ContainerSelect },

  data: (): DataSourceTemplateActionsModel => ({
    errorMessage: '',
    disabled: true,
    config: {},
    toSave: DefaultDataSourceTemplate(),
    selectedContainer: null,
    toImport: [],
    refreshKey: 0,
    loading: false,
  }),

  props: {
    mode: {type: String, required: true},
    icon: {type: Boolean, required: false, default: true},
    containerID: {type: String, required: true},
    template: {type: Object as PropType<DataSourceTemplateT>, required: false},
    maxWidth: {type: String, required: false, default: '80%'}
  },

  computed: {
    isDisabled(): boolean {
      return this.disabled;
    },
  },

  methods: {
    setTemplateValidation(validTemplate: boolean) {
      this.disabled = !validTemplate;
    },
    setContainer(container: ContainerT) {
      this.selectedContainer = container;
    },
    setTemplates(t: DataSourceTemplateT | DataSourceTemplateT[]) {
      if (!Array.isArray(t)) t = [t];
      this.toImport = t;
    },
    // DIALOG MANAGEMENT
    openDialog() {
      this.$nextTick(() => {this.resetDialog()});
    },
    closeDialog(emitMessage?: string) {
      if (emitMessage) this.$emit(emitMessage);
      const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) dialogInstance.close();
    },
    resetDialog() {
      this.errorMessage = '';
      this.disabled = true;
      if (this.mode === 'create') {
        this.toSave = DefaultDataSourceTemplate();
      } else if (this.mode === 'edit') {
        this.toSave = Object.assign({}, this.template);
      }
      // force template card to reload on reset
      this.refreshKey += 1;
      this.selectedContainer = null;
    },
    // BUTTON FUNCTIONS
    // this function is used for create, edit, and import buttons
    saveTemplates(mode: string) {
      const templates = mode === 'imported' ? this.toImport : [this.toSave];
      this.$client.saveDataSourceTemplates(this.containerID, templates)
        .then(() => {
          this.closeDialog(mode);
        })
        .catch(e => this.errorMessage = e);
    },
    authorizeTemplate() {
      window.open(`${this.template.redirect_address}/redirect/${this.containerID}`, "_blank");
      this.$emit('authorized');
      this.closeDialog();
    },
    deleteTemplate() {
      this.$client.deleteDataSourceTemplate(this.containerID, this.template.id!)
        .then(() => {
          this.closeDialog('deleted');
        })
        .catch(e => this.errorMessage = e);
    }
  },

  beforeMount() {
    switch(this.mode) {
      case 'create': {
        this.config.title = this.$t('dataSourceTemplates.create') as string;
        break;
      }
      case 'import': {
        this.config.title = this.$t('dataSourceTemplates.import') as string;
        break;
      }
      case 'edit': {
        this.config.title = this.$t('dataSourceTemplates.edit') as string;
        this.config.icon = 'mdi-pencil';
        break;
      }
      case 'authorize': {
        this.config.title = this.$t('dataSourceTemplates.authorize') as string;
        this.config.icon = 'mdi-lock-open';
        break;
      }
      case 'delete': {
        this.config.title = this.$t('dataSourceTemplates.delete') as string;
        this.config.icon = 'mdi-delete';
        break;
      }
    }

    if (this.mode === 'edit') {
      this.toSave = this.template;
    }
  }
});
</script>