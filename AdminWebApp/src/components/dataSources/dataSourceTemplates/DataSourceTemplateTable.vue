<template>
  <v-data-table
    :headers="headers()"
    :items="templates"
    :loading="loading"
    class="elevation-1"
    :search="search"
  >
    <template v-slot:top>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{ $t('dataSourceTemplates.configure') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <DataSourceTemplateActions
          :icon="false"
          mode="import"
          :containerID="containerID"
          @imported="refreshTemplates()"
        />
        <div style="margin-left: 15px;">
          <DataSourceTemplateActions
            :icon="false"
            mode="create"
            :containerID="containerID"
            @created="refreshTemplates()"
          />
        </div>
      </v-toolbar>
    </template>

    <template v-slot:[`item.name`]="{item}">
      <span>{{ item.name }}</span>
    </template>

    <template v-slot:[`item.redirect`]="{item}">
      <span>{{ item.redirect_address }}</span>
    </template>

    <template v-slot:[`item.actions`]="{item}">
      <div v-if="item">
        <DataSourceTemplateActions
          mode="edit"
          :icon="true"
          :containerID="containerID"
          :template="item"
          @updated="refreshTemplates()"
        />
        <DataSourceTemplateActions
          mode="authorize"
          :icon="true"
          :containerID="containerID"
          :template="item"
          @authorized="refreshTemplates()"
        />
        <DataSourceTemplateActions
          mode="delete"
          :icon="true"
          :containerID="containerID"
          :template="item"
          @deleted="refreshTemplates()"
        />
      </div>
    </template>
  </v-data-table>
</template>

<script lang="ts">
import Vue from 'vue';
import { DataSourceTemplateT } from '@/api/types';
import DataSourceTemplateActions from './DataSourceTemplateActions.vue';

interface DataSourceTemplateTableModel {
  errorMessage: string;
  loading: boolean;
  templates: DataSourceTemplateT[];
  search: string;
}

export default Vue.extend({
  name: 'DataSourceTemplateTable',

  components: {DataSourceTemplateActions},

  props: {
    containerID: {required: true, type: String},
  },

  data: (): DataSourceTemplateTableModel => ({
    errorMessage: '',
    loading: false,
    templates: [],
    search: ''
  }),

  watch: {
    errorMessage: {handler: 'emitErrorMessage', immediate: true}
  },

  methods: {
    headers() {
      return [
        { text: '', value: 'copy'},
        { text: this.$t('dataSourceTemplates.name'), value: 'name' },
        { text: this.$t('dataSourceTemplates.redirect'), value: 'redirect'},
        { text: this.$t('general.actions'), value: 'actions', sortable: false, filterable: false }
      ]
    },
    emitErrorMessage() {
      this.$emit('error', this.errorMessage);
    },
    refreshTemplates() {
      this.loading = true
      this.$client.listDataSourceTemplates(this.containerID)
        .then(templates => {
          this.templates = templates;
        })
        .catch(e => this.errorMessage = e)
        .finally(() => this.loading = false)
    }
  },

  mounted() {
    this.refreshTemplates();
  }
})
</script>