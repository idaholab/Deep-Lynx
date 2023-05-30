<template>
  <div>
    <v-tabs grow>
      <v-tab @click="activeTab = 'datasources'; refreshDataSources()">
        {{ $t('dataSources.dataSources') }}
      </v-tab>
      <v-tab @click="activeTab = 'timeseriesDatasources'; refreshTimeseriesDataSources()">
        {{ $t('timeseries.timeseries') }}
      </v-tab>
    </v-tabs>
    <error-banner :message="errorMessage"></error-banner>
    <v-data-table
        v-if="activeTab ==='datasources'"
        :headers="headers()"
        :items="dataSources"
        :loading="dataSourcesLoading"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('dataSources.description')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-data-source-dialog 
            :containerID="containerID" 
            @dataSourceCreated="refreshDataSources(); refreshTimeseriesDataSources()"
          />
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
        <edit-data-source-dialog
            :containerID="containerID"
            :dataSource="item"
            @dataSourceUpdated="refreshDataSources"
        >
        </edit-data-source-dialog>
        <delete-data-source-dialog
            v-if="!item.archived"
            @dataSourceDeleted="refreshDataSources()"
            @dataSourceArchived="refreshDataSources()"
            :containerID="item.container_id"
            :dataSource="item"
            icon="both"></delete-data-source-dialog>
        <delete-data-source-dialog
            v-else
            :containerID="item.container_id"
            @dataSourceDeleted="refreshDataSources()"
            @dataSourceArchived="refreshDataSources()"
            :dataSource="item"
            icon="trash"></delete-data-source-dialog>
        <reprocess-data-source-dialog
            :containerID="containerID"
            :dataSource="item"
            :icon="true"
            @dataSourceReprocessed="refreshDataSources()"
        ></reprocess-data-source-dialog>
      </template>
    </v-data-table>

    <v-data-table
        v-if="activeTab ==='timeseriesDatasources'"
        :headers="headers()"
        :items="timeseriesDataSources"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('dataSources.description')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-data-source-dialog 
            :timeseries="true" 
            :containerID="containerID" 
            @dataSourceCreated="refreshDataSources(); refreshTimeseriesDataSources()" 
            @timeseriesSourceCreated="activeTab === 'timeseriesDatasources'"
          />
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
        <timeseries-viewer-dialog v-if="activeTab === 'timeseriesDatasources'"
          :containerID="containerID"
          :dataSourceID="item.id"
          :icon="true"
          :key="timeseriesKey"
          @timeseriesDialogClose="incrementKey"
        ></timeseries-viewer-dialog>
        <edit-data-source-dialog
            :containerID="containerID"
            :dataSource="item"
            @dataSourceUpdated="refreshTimeseriesDataSources"
        >
        </edit-data-source-dialog>
        <delete-data-source-dialog
            v-if="!item.archived"
            @dataSourceDeleted="refreshTimeseriesDataSources()"
            @dataSourceArchived="refreshTimeseriesDataSources()"
            :containerID="item.container_id"
            :dataSource="item"
            icon="both"></delete-data-source-dialog>
        <delete-data-source-dialog
            v-else
            :containerID="item.container_id"
            @dataSourceDeleted="refreshTimeseriesDataSources()"
            @dataSourceArchived="refreshTimeseriesDataSources()"
            :dataSource="item"
            icon="trash"></delete-data-source-dialog>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {DataSourceT} from "@/api/types";
import CreateDataSourceDialog from "@/components/dataSources/createDataSourceDialog.vue"
import DeleteDataSourceDialog from "@/components/dataSources/deleteDataSourceDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import ReprocessDataSourceDialog from "@/components/dataImport/reprocessDataSourceDialog.vue";
import EditDataSourceDialog from "@/components/dataSources/editDataSourceDialog.vue";
import TimeseriesViewerDialog from '@/components/data/timeseriesViewerDialog.vue';

@Component({components:{
    CreateDataSourceDialog,
    EditDataSourceDialog,
    DeleteDataSourceDialog,
    ReprocessDataSourceDialog,
    TimeseriesViewerDialog
  }})
export default class DataSources extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  select = ""
  dataSourcesLoading = false
  timeseriesLoading = false
  dataSources: DataSourceT[] = []
  timeseriesDataSources: DataSourceT[] = []
  errorMessage = ""
  copy = mdiFileDocumentMultiple
  activeTab = 'datasources'
  timeseriesKey = 0

  headers() {
    const headers = [
      { text: '', value: 'copy'},
      { text: this.$t('general.id'), value: 'id'},
      { text: this.$t('general.name'), value: 'name' },
      { text: this.$t('dataSources.adapterType'), value: 'adapter_type'},
      { text: this.$t('general.active'), value: 'active'},
      { text: this.$t('general.actions'), value: 'actions', sortable: false }
    ]

    if (this.activeTab === 'timeseriesDatasources') {
      headers.splice(4, 0, {text: this.$t('timeseries.fastloadEnabled'), value: 'fastload'})
    }

    return headers;
  }

  mounted() {
    this.refreshDataSources()
    this.refreshTimeseriesDataSources()
  }

  refreshDataSources() {
    this.dataSourcesLoading = true
    this.$client.listDataSources(this.containerID, true, false)
        .then(dataSources => {
          this.dataSources = dataSources
        })
        .catch(e => this.errorMessage = e)
        .finally(() => this.dataSourcesLoading = false)
  }

  refreshTimeseriesDataSources() {
    this.timeseriesLoading = true
    this.$client.listDataSources(this.containerID, true, true)
        .then(dataSources => {
          this.timeseriesDataSources= dataSources
        })
        .catch(e => this.errorMessage = e)
        .finally(() => this.timeseriesLoading = false)
  }

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
  }

  incrementKey() {
    this.timeseriesKey += 1
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
