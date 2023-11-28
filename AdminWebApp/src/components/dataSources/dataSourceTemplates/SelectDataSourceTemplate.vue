<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>
    <v-combobox
      :style="[noIndent ? '' : 'margin-left:10px; margin-right:10px']"
      :items="templates"
      item-text="name"
      @change="setTemplate"
      :label="multiple ? `${$t('dataSourceTemplates.select')}s` : $t('dataSourceTemplates.select')"
      :multiple="multiple"
      :clearable="multiple"
      v-model="selected"
      :loading="loading"
      :key="key"
    />
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {DataSourceTemplateT} from "@/api/types";
  import {v4 as uuidv4} from 'uuid';
  
  interface SelectDataSourceTemplateModel {
    templates: DataSourceTemplateT[];
    selected: DataSourceTemplateT | DataSourceTemplateT[] | null;
    errorMessage: string;
    loading: boolean;
    key: number;
  }

  const newTemplate: DataSourceTemplateT = {
    id: uuidv4(),
    name: 'New Template',
    custom_fields: [],
    redirect_address: '',
    saveable: true
  }

  export default Vue.extend({
    name: 'SelectDataSourceTemplate',

    props: {
      containerID: {type: String, required: true},
      multiple: {type: Boolean, required: false, default: false},
      clear: {type: Boolean, required: false, default: false},
      noIndent: {type: Boolean, required: false, default: false},
      includeBlank: {type: Boolean, required: false, default: false},
    },

    data: (): SelectDataSourceTemplateModel => ({
      templates: [],
      selected: null,
      errorMessage: '',
      loading: false,
      key: 0,
    }),

    watch: {
      clear: {handler: 'incrementKey', immediate: true}
    },

    methods: {
      setTemplate(template: DataSourceTemplateT | DataSourceTemplateT[]) {
        this.$emit('selected', template);
      },
      incrementKey() {
        this.key += 1;
      }
    },

    mounted() {
      this.$client.listDataSourceTemplates(this.containerID)
        .then(templates => {
          // add a new template if specified
          this.templates = this.includeBlank ? templates.concat(newTemplate) : templates;
        })
        .catch(e => this.errorMessage = e)
    }
  })

  
</script>