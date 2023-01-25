<template>
  <v-card>
    <error-banner :message="errorMessage"></error-banner>
    <success-banner :message="successMessage"></success-banner>
    <v-toolbar flat color="white">
      <v-toolbar-title>{{$t('home.dataEditorDescription')}}</v-toolbar-title>
    </v-toolbar>
    <div class="mx-2">
      <select-data-source
        :containerID="containerID"
        :showArchived="true"
        :dataSourceID="selectedDataSource"
        @selected="setDataSource">
      </select-data-source>
    </div>

    <v-divider v-if="(selectedDataSource !== null)"></v-divider>

    <div v-if="(selectedDataSource !== null)">
      <v-data-table
        :headers="headersNode()"
        :items="nodes"
        :options.sync="listOptions"
        :loading="nodesLoading"
        :items-per-page="25"
        :footer-props="{
          'items-per-page-options': [25, 50, 100]
        }"
      >
        <template v-slot:top>
          <v-col class="d-flex flex-row">
            <h3 class="text-h3">{{$t('dataManagement.nodeTableTitle')}}</h3>
            <v-spacer></v-spacer>
            <create-node-button
              :dataSourceID="selectedDataSource.id"
              :containerID="containerID"
              :disabled="!selectedDataSource.active || selectedDataSource.archived"
              @nodeCreated="listNodes() && listEdges()"
            >
          </create-node-button>
          </v-col>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <edit-node-dialog
            :node="item"
            :icon="true"
            :dataSourceID="selectedDataSource.id"
            :containerID="containerID"
            :disabled="!selectedDataSource.active || selectedDataSource.archived"
            @nodeUpdated="listNodes() && listEdges()"
            >
          </edit-node-dialog>
          <v-icon
              small
              @click="deleteNode(item)"
          >
            mdi-delete
          </v-icon>
        </template>
      </v-data-table>
    </div>

    <v-divider v-if="(selectedDataSource !== null)"></v-divider>

    <div v-if="(selectedDataSource !== null)">
      <v-data-table
        :headers="headersEdge()"
        :items="edges"
        :options.sync="listOptions"
        :loading="edgesLoading"
        :items-per-page="25"
        :footer-props="{
          'items-per-page-options': [25, 50, 100]
        }"
      >
        <template v-slot:top>
          <v-col class="d-flex flex-row">
            <h3 class="text-h3">{{$t('dataManagement.edgeTableTitle')}}</h3>
            <v-spacer></v-spacer>
            <create-edge-dialog
              :dataSourceID="selectedDataSource.id"
              :containerID="containerID"
              :disabled="!selectedDataSource.active || selectedDataSource.archived"
              @edgeCreated="listEdges()"
            >
            </create-edge-dialog>
          </v-col>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-icon
            small
            @click="deleteEdge(item)"
          >
            mdi-delete
          </v-icon>
        </template>
      </v-data-table>
    </div>
  </v-card>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {DataSourceT, NodeT, EdgeT} from "@/api/types";
import SelectDataSource from "@/components/dataSources/selectDataSource.vue";
import CreateNodeButton from "@/components/data/createNodeButton.vue";
import CreateEdgeDialog from "@/components/data/createEdgeDialog.vue";
import EditNodeDialog from "@/components/data/editNodeDialog.vue";


@Component({filters: {
    pretty: function(value: any) {
      return JSON.stringify(JSON.parse(value), null, 2);
    }
  },
  components: {
    SelectDataSource,
    CreateNodeButton,
    CreateEdgeDialog,
    EditNodeDialog
  }
})
export default class DataEditor extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  dataErrorMessage = ""
  dialog = false
  dataDialog = false
  mappingDialog = false
  selectedData: {[key: string]: any} | null = null
  selectedDataSource: DataSourceT | null = null
  dataSources: DataSourceT[] = []
  nodes: NodeT[] = []
  edges: EdgeT[] = []
  successMessage = ""
  dataSuccessMessage = ""
  listOptions: {
    page: number;
    itemsPerPage: number;
  } = {page: 1, itemsPerPage: 25}
  options: {
    page: number;
    itemsPerPage: number;
  } = {page: 1, itemsPerPage: 25}
  nodesLoading = false
  edgesLoading = false
  selectedNode = {} as NodeT

  headersNode() {
    return  [{
      text: this.$t('dataManagement.id'),
      value: "id",
      },
      {
        text: this.$t('dataManagement.metatype'),
        value: "metatype_name"
      },
      {
        text: this.$t('dataManagement.name'),
        value: "properties.name"
      },
      { text: this.$t('dataManagement.viewDeleteData'),
        value: 'actions', sortable: false
      }]
  }

    headersEdge() {
    return  [{
      text: this.$t('dataManagement.id'),
      value: "id",
      },
      {
        text: this.$t('dataManagement.originNode'),
        value: "metatypeRelationshipPair.originMetatype.name"
      },
       {
        text: this.$t('dataManagement.relationship'),
        value: "metatype_relationship_name"
      },
       {
        text: this.$t('dataManagement.destinationNode'),
        value: "metatypeRelationshipPair.destinationMetatype.name"
      },
       {
        text: this.$t('dataManagement.relationshipType'),
        value: "metatypeRelationshipPair.relationship_type"
      },
      { text: this.$t('dataManagement.viewDeleteData'),
        value: 'actions', sortable: false
      }]
  }

  @Watch('options')
  onOptionChange() {
    this.listNodes()
    this.listEdges()
  }

  @Watch('listOptions')
  onListOptionsChange() {
    this.listNodes()
    this.listEdges()
  }

  setDataSource(dataSource: any) {
    this.selectedDataSource = dataSource
    this.$router.replace(`/containers/${this.containerID}/data-management/${this.selectedDataSource?.id}`)
    this.listNodes()
    this.listEdges()
  }

  listNodes() {
    if(this.selectedDataSource) {
      this.nodesLoading = true
      this.nodes = []

      const {page, itemsPerPage} = this.listOptions;
      const pageNumber = page - 1;

      this.$client.listNodes(this.containerID, {
        limit: itemsPerPage,
        offset: itemsPerPage * pageNumber,
        dataSourceID: this.selectedDataSource.id!,
        loadMetatypes: 'true'
      })
          .then(nodes => {
            this.nodesLoading = false
            this.nodes = nodes
            this.$forceUpdate()
          })
          .catch(e => this.errorMessage = e)
    }
  }

  listEdges() {
    if(this.selectedDataSource) {
      this.edgesLoading = true
      this.edges = []

      const {page, itemsPerPage} = this.listOptions;
      const pageNumber = page - 1;

      this.$client.listEdges(this.containerID, {
        limit: itemsPerPage,
        offset: itemsPerPage * pageNumber,
        dataSourceID: this.selectedDataSource.id!,
        loadRelationshipPairs: 'true'
      })
          .then(edges => {
            this.edgesLoading = false
            this.edges = edges
            this.$forceUpdate()
          })
          .catch(e => this.errorMessage = e)
    }
  }

  deleteNode(nodeT: NodeT) {
    this.$client.deleteNode(this.containerID, nodeT.id)
        .then(()=> {
          this.listNodes()
          this.successMessage = this.$t('dataManagement.successfullyDeleted') as string
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteEdge(edgeT: EdgeT) {
    this.$client.deleteEdge(this.containerID, edgeT.id)
        .then(()=> {
          this.listEdges()
          this.successMessage = this.$t('dataManagement.successfullyDeleted') as string
        })
        .catch((e: any) => this.errorMessage = e)
  }
}
</script>
