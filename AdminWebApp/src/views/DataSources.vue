<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-data-table
        :headers="headers()"
        :items="dataSources"
        sort-by="calories"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('dataSources.title')}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <create-data-source-dialog :containerID="containerID" @dataSourceCreated="refreshDataSources"></create-data-source-dialog>
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
        <p v-if="!item.archived">{{item.name}}</p>
        <p v-else class="text--disabled">{{item.name}}</p>
      </template>
      <template v-slot:[`item.adapter_type`]="{ item }">
        <p v-if="!item.archived">{{item.adapter_type}}</p>
        <p v-else class="text--disabled">{{item.adapter_type}}</p>
      </template>
      <template v-slot:[`item.active`]="{ item }">
        <v-switch v-if="!item.archived" @change="toggleDataSourceActive(item)" v-model="item.active"></v-switch>
        <v-switch v-else :value="false" disabled></v-switch>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
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
import CreateDataSourceDialog from "@/components/createDataSourceDialog.vue"
import DeleteDataSourceDialog from "@/components/deleteDataSourceDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";

@Component({components:{CreateDataSourceDialog, DeleteDataSourceDialog}})
export default class DataSources extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  dialog= false
  select = ""
  dataSources: DataSourceT[] = []
  errorMessage = ""
  copy = mdiFileDocumentMultiple

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
  }

  refreshDataSources() {
    this.$client.listDataSources(this.containerID, true)
        .then(dataSources => {
          this.dataSources = dataSources
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
