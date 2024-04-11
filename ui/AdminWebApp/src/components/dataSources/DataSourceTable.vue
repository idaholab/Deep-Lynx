<template>
  <v-data-table
    :headers="headers()"
    :items="dataSources"
    :loading="loading"
    class="elevation-1"
    :search="search"
  >
    <template v-slot:top>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('dataSources.description')}}</v-toolbar-title>
        <v-spacer></v-spacer>
        <DataSourceActions
          :icon="false"
          mode="create"
          :containerID="containerID"
          @dataSourceCreated="refreshDataSources()"
        />

        <template v-slot:extension>
          <v-text-field
            v-model="search"
            prepend-icon="mdi-magnify"
            :label="$t('general.search')"
            single-line
            hide-details
          ></v-text-field>
        </template>

      </v-toolbar>
    </template>
    <template v-slot:[`item.copy`]="{ item }">
      <v-tooltip top>
        <template v-slot:activator="{on, attrs}">
          <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
        </template>
        <span>{{$t('general.copyID')}}</span>
        <span>{{item.id}}</span>
      </v-tooltip>
    </template>
    <template v-slot:[`item.name`]="{ item }">
      <span v-if="!item.archived">{{item.name}}</span>
      <span v-else class="text--disabled">{{item.name}}</span>
    </template>
    <template v-slot:[`item.adapter_type`]="{ item }">
      <span v-if="!item.archived">{{item.adapter_type}}</span>
      <span v-else class="text--disabled">{{item.adapter_type}}</span>
    </template>
    <template v-slot:[`item.active`]="{ item }">
      <v-switch
        v-if="!item.archived"
        @change="toggleDataSourceActive(item)"
        v-model="item.active"
        class="mt-0"
        hide-details
      />
      <v-switch
        v-else
        :value="false"
        class="mt-0"
        hide-details
        disabled
      />
    </template>
    <template v-slot:[`item.actions`]="{ item }">
      <DataSourceActions
        mode="edit"
        :icon="true"
        :containerID="containerID"
        :dataSource="item"
        @dataSourceUpdated="refreshDataSources"
      />
      <DataSourceActions
        mode="delete"
        :icon="true"
        @dataSourceArchived="refreshDataSources()"
        @dataSourceDeleted="refreshDataSources()"
        :containerID="item.container_id"
        :dataSource="item"
      />
      <DataSourceActions
        v-if="!item.archived"
        mode="archive"
        :icon="true"
        @dataSourceArchived="refreshDataSources()"
        :containerID="item.container_id"
        :dataSource="item"
      />
      <DataSourceActions
        mode="reprocess"
        :icon="true"
        :containerID="containerID"
        :dataSource="item"
        @dataSourceReprocessed="refreshDataSources()"
      />
    </template>
  </v-data-table>
</template>

<script lang="ts">
import Vue from 'vue';
import { DataSourceT } from '@/api/types';
import { mdiFileDocumentMultiple } from '@mdi/js';
import DataSourceActions from './DataSourceActions.vue';

interface DataSourceTableModel {
  errorMessage: string;
  dataSources: DataSourceT[];
  loading: boolean;
  search: string;
  copy: string;
}

export default Vue.extend({
  name: 'DataSourceTable',

  components: {DataSourceActions},

  props: {
    containerID: {required: true, type: String}
  },

  data: (): DataSourceTableModel => ({
    errorMessage: '',
    dataSources: [],
    loading: false,
    search: '',
    copy: mdiFileDocumentMultiple,
  }),

  watch: {
    errorMessage: {handler: 'emitErrorMessage', immediate: true}
  },

  methods: {
    emitErrorMessage() {
      this.$emit('error', this.errorMessage);
    },
    headers() {
      return [
        { text: '', value: 'copy'},
        { text: this.$t('general.id'), value: 'id'},
        { text: this.$t('general.name'), value: 'name' },
        { text: this.$t('dataSources.adapterType'), value: 'adapter_type'},
        { text: this.$t('general.active'), value: 'active', filterable: false},
        { text: this.$t('general.actions'), value: 'actions', sortable: false, filterable: false }
      ]
    },
    refreshDataSources() {
      this.loading = true
      this.$client.listDataSources(this.containerID, true, false)
          .then(dataSources => {
            this.dataSources = dataSources
          })
          .catch(e => this.errorMessage = e)
          .finally(() => this.loading = false)
    },
    copyID(id: string) {
      navigator.clipboard.writeText(id);
    },
    toggleDataSourceActive(dataSource: DataSourceT) {
      if(dataSource.active) {
        this.$client.activateDataSource(this.containerID, dataSource.id!)
          .then(()=> {
            this.refreshDataSources();
          })
          .catch(e => this.errorMessage = e)
      } else {
        this.$client.deactivateDataSource(this.containerID, dataSource.id!)
          .then(()=> {
            this.refreshDataSources();
          })
          .catch((e: any) => this.errorMessage = e)
      }
    },
  },

  mounted () {
    this.refreshDataSources();
  }
});
</script>