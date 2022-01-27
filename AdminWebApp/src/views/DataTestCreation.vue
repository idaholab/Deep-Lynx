<template>
  <v-card>
    <error-banner :message="errorMessage"></error-banner>
    <success-banner :message="successMessage"></success-banner>
    <select-data-source
        :containerID="containerID"
        :showArchived="true"
        :dataSourceID="selectedDataSource"
        @selected="setDataSource">
    </select-data-source>

    <v-card v-if="(selectedDataSource !== null)">

      <v-data-table
          :headers="headersNode()"
          :items="nodes"
          :options.sync="listOptions"
          :loading="nodesLoading"
          :items-per-page="25"
          :footer-props="{
                  'items-per-page-options': [25, 50, 100]
                }"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-col>
            <create-node-dialog
                :dataSourceID="selectedDataSource.id" 
                :containerID="containerID" 
                :disabled="!selectedDataSource.active || selectedDataSource.archived"
                @nodeCreated="listNodes"
                >
            </create-node-dialog>
          </v-col>

          <v-col>
            <h2>{{$t('dataTestCreation.nodeTableTitle')}}</h2>
          </v-col>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-icon
              small
              @click="deleteNode(item)"
          >
            mdi-delete
          </v-icon>
        </template>
      </v-data-table>
    </v-card>

        <v-card v-if="(selectedDataSource !== null)">

      <v-data-table
          :headers="headersEdge()"
          :items="edges"
          :options.sync="listOptions"
          :loading="edgesLoading"
          :items-per-page="25"
          :footer-props="{
                  'items-per-page-options': [25, 50, 100]
                }"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-col>
            <create-edge-dialog
                :dataSourceID="selectedDataSource.id" 
                :containerID="containerID" 
                :disabled="!selectedDataSource.active || selectedDataSource.archived"
                @edgeCreated="listEdges"
                >
            </create-edge-dialog>
          </v-col>

          <v-col>
            <h2>{{$t('dataTestCreation.edgeTableTitle')}}</h2>
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
    </v-card>
  </v-card>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {DataSourceT, NodeT, EdgeT} from "@/api/types";
import SelectDataSource from "@/components/selectDataSource.vue";
import CreateNodeDialog from "@/components/createNodeDialog.vue";
import CreateEdgeDialog from "@/components/createEdgeDialog.vue";


@Component({filters: {
    pretty: function(value: any) {
      return JSON.stringify(JSON.parse(value), null, 2);
    }
  },
  components: {
    SelectDataSource,
    CreateNodeDialog,
    CreateEdgeDialog
  }
})
export default class DataTestCreation extends Vue {
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
      text: this.$t('dataTestCreation.id'),
      value: "id",
      },
      {
        text: this.$t('dataTestCreation.metatype'),
        value: "metatype_name"
      },
      { text: this.$t('dataTestCreation.viewDeleteData'),  
        value: 'actions', sortable: false 
      }]
  }

    headersEdge() {
    return  [{
      text: this.$t('dataTestCreation.id'),
      value: "id",
      },
      {
        text: this.$t('dataTestCreation.originNode'),
        value: "metatypeRelationshipPair.originMetatype.name"
      },
       {
        text: this.$t('dataTestCreation.relationship'),
        value: "metatype_relationship_name"
      },
       {
        text: this.$t('dataTestCreation.destinationNode'),
        value: "metatypeRelationshipPair.destinationMetatype.name"
      },
       {
        text: this.$t('dataTestCreation.relationshipType'),
        value: "metatypeRelationshipPair.relationship_type"
      },
      { text: this.$t('dataTestCreation.viewDeleteData'),  
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
    this.$router.replace(`/containers/${this.containerID}/test-data/${this.selectedDataSource?.id}`)
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
          this.successMessage = this.$t('dataTestCreation.successfullyDeleted') as string
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteEdge(edgeT: EdgeT) {
    this.$client.deleteEdge(this.containerID, edgeT.id)
        .then(()=> {
          this.listEdges()
          this.successMessage = this.$t('dataTestCreation.successfullyDeleted') as string
        })
        .catch((e: any) => this.errorMessage = e)
  }
}
</script>
