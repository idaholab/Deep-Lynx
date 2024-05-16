<template>
  <div>
    <v-tabs grow v-model="activeTab">
      <v-tab @click="activeTab = 0" ref="datasources">
        {{ $t('dataSources.dataSources') }}
      </v-tab>
      <v-tab @click="activeTab = 1" ref="timeseriesDatasources">
        {{ $t('timeseries.timeseries') }}
      </v-tab>
      <v-tab v-if="customEnabled"
        @click="activeTab = 2" 
        ref="templates"
      >
        {{ $t('dataSourceTemplates.title') }}
      </v-tab>
    </v-tabs>

    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>

    <DataSourceTable v-if="activeTab === 0"
      :containerID="containerID"
      @error="setErrorMessage"
    />

    <TimeseriesSourceTable v-if="activeTab === 1"
      :containerID="containerID"
      @error="setErrorMessage"
      @timeseriesTab="activeTab === 1"
    />

    <DataSourceTemplateTable v-if="activeTab === 2"
      :containerID="containerID"
      @error="setErrorMessage"
    />
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ContainerT} from "@/api/types";
  import DataSourceTable from '@/components/dataSources/DataSourceTable.vue';
  import TimeseriesSourceTable from '@/components/dataSources/TimeseriesSourceTable.vue';
  import DataSourceTemplateTable from '@/components/dataSources/dataSourceTemplates/DataSourceTemplateTable.vue';

  interface DataSourcesModel {
    tabs: {id: number, name: string}[]
    activeTab: number
    errorMessage: string
    container: ContainerT | undefined
  }

  export default Vue.extend ({
    name: 'ViewDataSources',

    components: { DataSourceTable, TimeseriesSourceTable, DataSourceTemplateTable },

    props: {
      containerID: {required: true, type: String},
    },

    computed: {
      customEnabled(): boolean {
        // disable data source templates tab if custom data source is not enabled
        return this.container!.config.enabled_data_sources.includes('custom');
      }
    },

    data: (): DataSourcesModel => ({
      tabs: [
        {id: 0, name: 'datasources'},
        {id: 1, name: 'timeseriesDatasources'}
      ],
      activeTab: 0,
      errorMessage: "",
      container: undefined,
    }),

    beforeMount () {
      this.activeTab = 0;
      this.container = this.$store.getters.activeContainer;
    },

    methods: {
      setErrorMessage(message: string) {
        this.errorMessage = message;
      }
    }
  });
</script>