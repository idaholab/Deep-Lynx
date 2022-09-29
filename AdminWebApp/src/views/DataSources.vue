<template>
  <div>
    <v-tabs grow>
      <v-tab @click="activeTab = 'datasources'; refreshDataSources()">
        {{ $t('dataSources.dataSources') }}
      </v-tab>
      <v-tab @click="activeTab = 'timeseriesDatasources'; refreshTimeseriesDataSources()">
        {{ $t('dataSources.timeseriesDatasources') }}
      </v-tab>
    </v-tabs>
    <error-banner :message="errorMessage"></error-banner>
    <v-data-table
        v-if="activeTab ==='datasources'"
        :headers="headers()"
        :items="dataSources"
        sort-by="calories"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('home.dataSourcesDescription')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-data-source-dialog :containerID="containerID" @dataSourceCreated="refreshDataSources(); refreshTimeseriesDataSources()"></create-data-source-dialog>
        </v-toolbar>
      </template>
      <template v-slot:[`item.copy`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
          </template>
          <span>{{$t('dataSources.copyID')}}</span>
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
        sort-by="calories"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('home.dataSourcesDescription')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-data-source-dialog :containerID="containerID" @dataSourceCreated="refreshDataSources(); refreshTimeseriesDataSources()" @timeseriesSourceCreated="activeTab === 'timeseriesDatasources'"></create-data-source-dialog>
        </v-toolbar>
      </template>
      <template v-slot:[`item.copy`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
          </template>
          <span>{{$t('dataSources.copyID')}}</span>
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

@Component({components:{
    CreateDataSourceDialog,
    EditDataSourceDialog,
    DeleteDataSourceDialog,
    ReprocessDataSourceDialog
  }})
export default class DataSources extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  dialog= false
  select = ""
  dataSources: DataSourceT[] = []
  timeseriesDataSources: DataSourceT[] = []
  errorMessage = ""
  copy = mdiFileDocumentMultiple
  activeTab = 'datasources'

  headers() {
    return [
      { text: '', value: 'copy'},
      { text: this.$t('dataSources.id'), value: 'id'},
      { text: this.$t('dataSources.name'), value: 'name' },
      { text: this.$t('dataSources.adapterType'), value: 'adapter_type'},
      { text: this.$t('dataSources.active'), value: 'active'},
      { text: this.$t('dataSources.actions'), value: 'actions', sortable: false }
    ]
  }

  mounted() {
    this.refreshDataSources()
    this.refreshTimeseriesDataSources()
  }

  refreshDataSources() {
    this.$client.listDataSources(this.containerID, true, false)
        .then(dataSources => {
          this.dataSources = dataSources
        })
        .catch(e => this.errorMessage = e)
  }

  refreshTimeseriesDataSources() {
    this.$client.listDataSources(this.containerID, true, true)
        .then(dataSources => {
          this.timeseriesDataSources= dataSources
        })
        .catch(e => this.errorMessage = e)
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

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
