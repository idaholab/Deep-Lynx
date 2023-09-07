<template>
  <div>
    <v-tabs grow v-model="activeTab">
      <v-tab @click="activeTab = 0; refreshDataSources()" ref="datasources">
        {{ $t('dataSources.dataSources') }}
      </v-tab>
      <v-tab @click="activeTab = 1; refreshTimeseriesDataSources()" ref="timeseriesDatasources">
        {{ $t('timeseries.timeseries') }}
      </v-tab>
    </v-tabs>

    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>

    <v-data-table
        v-if="activeTab === 0"
        :headers="headers()"
        :items="dataSources"
        :loading="dataSourcesLoading"
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
            @dataSourceCreated="refreshDataSources(); refreshTimeseriesDataSources()"
          />

          <template v-slot:extension>
            <v-text-field
                v-model="search"
                prepend-icon="mdi-magnify"
                label="Search"
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

    <v-data-table
        v-if="activeTab === 1"
        :headers="headers()"
        :items="timeseriesDataSources"
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
            :timeseries="true"
            :containerID="containerID"
            @dataSourceCreated="refreshDataSources(); refreshTimeseriesDataSources()"
            @timeseriesSourceCreated="activeTab === 1"
          ></DataSourceActions>

          <template v-slot:extension>
            <v-text-field
                v-model="search"
                prepend-icon="mdi-magnify"
                label="Search"
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
      <template v-slot:[`item.fastload`]="{ item }">
        <span>{{ item.config.fast_load_enabled }}</span>
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
        <TimeseriesViewerDialog v-if="activeTab === 1"
          :containerID="containerID"
          :dataSourceID="item.id"
          :icon="true"
          :key="timeseriesKey"
          @timeseriesDialogClose="incrementKey"
          :ref="`${item.id}viewer`"
        ></TimeseriesViewerDialog>
        <DataSourceActions
          mode="edit"
          :icon="true"
          :containerID="containerID"
          :dataSource="item"
          @dataSourceUpdated="refreshTimeseriesDataSources"
          :timeseries="true"
        />
        <DataSourceActions
          mode="delete"
          @dataSourceArchived="refreshTimeseriesDataSources()"
          @dataSourceDeleted="refreshTimeseriesDataSources()"
          :containerID="item.container_id"
          :dataSource="item"
          :timeseries="true"
        />
        <DataSourceActions
          v-if="!item.archived"
          mode="archive"
          @dataSourceArchived="refreshTimeseriesDataSources()"
          :containerID="item.container_id"
          :dataSource="item"
          :timeseries="true"
        />
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {DataSourceT} from "@/api/types";
  import {mdiFileDocumentMultiple} from "@mdi/js";
  import TimeseriesViewerDialog from '@/components/data/TimeseriesViewerDialog.vue';
  import DataSourceActions from '@/components/dataSources/DataSourceActions.vue';

  interface DataSourcesModel {
    dataSources: DataSourceT[]
    timeseriesDataSources: DataSourceT[]
    tabs: {id: number, name: string}[]
    activeTab: number
    select: string
    dataSourcesLoading: boolean
    timeseriesLoading: boolean
    errorMessage: string
    copy: string
    timeseriesKey: number
    search: string
  }

  export default Vue.extend ({
    name: 'ViewDataSources',

    components: { TimeseriesViewerDialog, DataSourceActions },

    props: {
      containerID: {required: true, type: String},
    },

    data: (): DataSourcesModel => ({
      dataSources: [],
      timeseriesDataSources: [],
      tabs: [
        {id: 0, name: 'datasources'},
        {id: 1, name: 'timeseriesDatasources'}
      ],
      activeTab: 0,
      select: "",
      dataSourcesLoading: false,
      timeseriesLoading: false,
      errorMessage: "",
      copy: mdiFileDocumentMultiple,
      timeseriesKey: 0,
      search: ""
    }),

    mounted () {
      this.refreshDataSources()
      this.refreshTimeseriesDataSources()
      this.activeTab = 0;
    },

    methods: {
      headers() {
        const headers = [
          { text: '', value: 'copy'},
          { text: this.$t('general.id'), value: 'id'},
          { text: this.$t('general.name'), value: 'name' },
          { text: this.$t('dataSources.adapterType'), value: 'adapter_type'},
          { text: this.$t('general.active'), value: 'active', filterable: false},
          { text: this.$t('general.actions'), value: 'actions', sortable: false, filterable: false }
        ]

        if (this.activeTab === 1) {
          headers.splice(4, 0, {
            text: this.$t('timeseries.fastloadEnabled'), value: 'fastload', filterable: false
          })
        }

        return headers;
      },
      refreshDataSources() {
        this.dataSourcesLoading = true
        this.$client.listDataSources(this.containerID, true, false)
            .then(dataSources => {
              this.dataSources = dataSources
            })
            .catch(e => this.errorMessage = e)
            .finally(() => this.dataSourcesLoading = false)
      },
      refreshTimeseriesDataSources() {
        this.timeseriesLoading = true
        this.$client.listDataSources(this.containerID, true, true)
            .then(dataSources => {
              this.timeseriesDataSources= dataSources
            })
            .catch(e => this.errorMessage = e)
            .finally(() => {
              this.timeseriesLoading = false
            })
      },
      toggleDataSourceActive(dataSource: DataSourceT) {
        if(dataSource.active) {
          this.$client.activateDataSource(this.containerID, dataSource.id!)
              .then(()=> {
                this.refreshDataSources()
              })
              .catch(e => this.errorMessage = e)
        } else {
          this.$client.deactivateDataSource(this.containerID, dataSource.id!)
              .then(()=> {
                this.refreshDataSources()
              })
              .catch((e: any) => this.errorMessage = e)
        }
      },
      incrementKey() {
        this.timeseriesKey += 1
        this.$router.replace(`/containers/${this.containerID}/data-sources`)
      },
      copyID(id: string) {
        navigator.clipboard.writeText(id)
      }
    }
  });
</script>
