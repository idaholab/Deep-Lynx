<template>
  <v-card class="pt-1 pb-3 px-2">
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>
    <template v-if="mode === 'create' && type === 'container'">
      <h3>{{$t('dataSourceTemplates.new')}}</h3>
      <span>{{$t('dataSourceTemplates.description')}}</span>
    </template>

    <template v-if="mode === 'edit' && type === 'container'">
      <v-row>
        <v-col :cols="12">
          <v-alert type="warning">
            {{ $t('dataSourceTemplates.editNote') }}
          </v-alert>
        </v-col>
      </v-row>
    </template>

    <v-form
      ref="form"
      lazy-validation
      v-model="templateValid"
    >
      <v-row>
        <v-col :cols="12">
          <v-text-field
            :label="$t('dataSourceTemplates.name')"
            v-model="newTemplate.name"
            :rules="[validateRequired]"
          />
        </v-col>
      </v-row>

      <v-row>
        <v-col :cols="12">
          <v-text-field
            :label="$t('dataSourceTemplates.redirect')"
            v-model="newTemplate.redirect_address"
            :rules="[validateRequired]"
          >
            <template slot="append-outer">
              <info-tooltip :message="$t('help.templateRedirect')"></info-tooltip>
            </template>
          </v-text-field>
        </v-col>
      </v-row>

      <h4>{{ $t('dataSourceTemplates.customFields') }}
        <info-tooltip :message="$t('help.customTemplateFields')"></info-tooltip>
      </h4>
      <v-data-table
        :headers="customFieldHeaders"
        :items="customFields"
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
        <template v-slot:[`item.name`]="{item}">
          <v-text-field
            :label="$t('general.name')"
            v-model="item.name"
            :rules="[validateRequired]"
          />
        </template>

        <template v-slot:[`item.value`]="{item}">
          <v-text-field
            :label="editLabel"
            v-model="item.value"
            :rules="[validateRequired(item.value, item.required)]"
          />
        </template>

        <template v-slot:[`item.required`]="{item}">
          <v-simple-checkbox
            v-model="item.required"
            :disabled="disableRequired(item)"
          />
        </template>

        <template v-slot:[`item.encrypt`]="{item, index}">
          <v-simple-checkbox
            v-model="item.encrypt"
            @click="updateRequired(item.encrypt, index)"
          />
        </template>

        <template v-slot:[`item.actions`]="{index}">
          <v-icon @click="removeCustomField(index)">mdi-close</v-icon>
        </template>
      </v-data-table>
    </v-form>

    <v-row>
      <v-col :cols="12" style="padding:25px" align="center" justify="center">
        <v-btn @click="addCustomField">{{ $t('general.addField') }}</v-btn>
      </v-col>
    </v-row>

    <!-- Give users the option of saving their template to the container from the data source -->
    <v-checkbox v-if="saveOption"
      :label="$t('dataSourceTemplates.save')"
      v-model="saveToContainer"
    />
  </v-card>
</template>

<script lang="ts">
import { CustomTemplateFieldT, DataSourceTemplateT } from '@/api/types';
import Vue, { PropType } from 'vue';

interface DataSourceTemplateCardModel {
  errorMessage: string;
  newTemplate: DataSourceTemplateT;
  customFields: CustomTemplateFieldT[];
  saveToContainer: boolean;
  templateValid: boolean;
}

interface VForm extends Vue {
  validate: () => boolean;
}

export default Vue.extend({
  name: 'DataSourceTemplateCard',

  props: {
    mode: {type: String, required: true},
    type: {type: String, required: true},
    template: {type: Object as PropType<DataSourceTemplateT>, required: true},
    saveOption: {type: Boolean, required: false, default: false}
  },

  data: (): DataSourceTemplateCardModel => ({
    errorMessage: '',
    newTemplate: {
      name: 'New Template',
      custom_fields: [],
      redirect_address: '',
    },
    customFields: [],
    saveToContainer: false,
    templateValid: false
  }),

  computed: {
    customFieldHeaders(): {text: string, value: string, sortable?: boolean}[] {
      return [
        {text: this.$t('general.name'), value: 'name'},
        {text: this.$t('general.value'), value: 'value'},
        {text: this.$t('dataSourceTemplates.requireField'), value: 'required'},
        {text: this.$t('dataSourceTemplates.encryptField'), value: 'encrypt'},
        {text: this.$t('general.actions'), value: 'actions', sortable: false},
      ];
    },
    editLabel(): string {
      let label = this.$t('general.value');
      if (this.mode === 'edit' && this.type === 'dataSource') {
        label = `${this.$t('general.value')} ${this.$t('help.removedForSecurity')}`
      }
      return label;
    }
  },

  watch: {
    templateValid: {handler: 'emitValidation', immediate: true}
  },

  methods: {
    disableRequired(item: CustomTemplateFieldT): boolean {
      return item.encrypt ?? false;
    },
    addCustomField() {
      this.customFields.push({
        name: '',
        value: '',
        required: false,
        encrypt: false
      });
      this.$nextTick(() => {
        this.validateForm();
      });
    },
    removeCustomField(index: number) {
      this.customFields.splice(index, 1);
      this.$nextTick(() => {
        this.validateForm();
      });
    },
    validateRequired(value: string, required?: boolean) {
      if (required === undefined || required === true) {
        if (!value) {
          return this.$t('validation.required');
        }
      }
      return true;
    },
    updateRequired(encrypt: boolean, index: number) {
      if (encrypt) {
        this.customFields[index].required = encrypt;
      }
    },
    validateForm() {
      if (this.$refs.form && (this.$refs.form as VForm).validate) {
        (this.$refs.form as VForm).validate();
      }
    },
    emitValidation() {
      this.validateForm();
      this.$emit('validationUpdated', this.templateValid);
    }
  },

  beforeMount() {
    if (this.template && (this.saveOption !== true)) {
      this.newTemplate = this.template;
      this.customFields = this.template.custom_fields ?? [];
    } else {
      this.newTemplate = {
        name: '',
        custom_fields: [],
        redirect_address: '',
      }
    }
  }
})
</script>