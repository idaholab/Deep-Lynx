<template>
  <v-card
  >
    <error-banner :message="errorMessage"></error-banner>
    <success-banner :message="successMessage"></success-banner>
    <select-data-source
        :containerID="containerID"
        :showArchived="true"
        :dataSourceID="argument"
        @selected="setDataSource">
    </select-data-source>

    <v-card v-if="(selectedDataSource !== null)">

      <v-data-table
          :headers="headersNode()"
          :items="nodes"
          :server-items-length="nodeCount"
          :options.sync="listOptions"
          :loading="nodesLoading"
          :items-per-page="100"
          :footer-props="{
                  'items-per-page-options': [25, 50, 100]
                }"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-col v-if="selectedDataSource.adapter_type === 'standard' || selectedDataSource.adapter_type === 'manual'">
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
        <template v-slot:item[actions]="{ item }">
          <v-icon
              small
              class="mr-2"
              @click="viewItem(item)"
          >
            mdi-eye
          </v-icon>
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
          :server-items-length="edgeCount"
          :options.sync="listOptions"
          :loading="edgesLoading"
          :items-per-page="100"
          :footer-props="{
                  'items-per-page-options': [25, 50, 100]
                }"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-col v-if="selectedDataSource.adapter_type === 'standard' || selectedDataSource.adapter_type === 'manual'">
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

        <template v-slot:[`item.id`]="{ item }">
          <v-span @click="copyID(item)"> {{ item.id }} </v-span>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-icon
              small
              class="mr-2"
              @click="viewItem(item)"
          >
            mdi-eye
          </v-icon>
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
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 25}
  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 25}

  edgeExtendedInfo: {
    nodes: NodeT;
  } = {nodes: {name}}
  importCount = 0
  nodesLoading = false
  edgesLoading = false
  selectedNode: NodeT[] = [] 
  importDataCount = 0
  importLoading = false

  headersNode() {
    return  [{
      text: this.$t('dataTestCreation.id'),
      value: "id",
      },
      {
        text: this.$t('dataTestCreation.metatype'),
        value: "metatype_name"
      },
      {
        text: this.$t('dataTestCreation.properties'),
        value: "metatype.keys[1].name"
      },
      { text: this.$t('dataTestCreation.viewDeleteData'),  value: 'actions', sortable: false }]
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
      { text: this.$t('dataTestCreation.viewDeleteData'),  value: 'actions', sortable: false }]
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

    this.$client.countImports(this.containerID, dataSource.id)
        .then(importCount => {
          this.importCount = importCount
        })
        .catch(e => this.errorMessage = e)
  }

  listNodes() {
    if(this.selectedDataSource) {
      this.nodesLoading = true
      this.nodes = []

      const {page, itemsPerPage, sortBy, sortDesc } = this.listOptions;
      let sortParam: string | undefined
      let sortDescParam: boolean | undefined

      const pageNumber = page - 1;
      if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
      if(sortDesc) sortDescParam = sortDesc[0]

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

      const {page, itemsPerPage, sortBy, sortDesc } = this.listOptions;
      let sortParam: string | undefined
      let sortDescParam: boolean | undefined

      const pageNumber = page - 1;
      if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
      if(sortDesc) sortDescParam = sortDesc[0]

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

  mounted() {
    this.$client.listDataSources(this.containerID)
        .then(dataSources => {
          this.dataSources = dataSources
        })
        .catch(e => this.errorMessage = e)
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

  viewItem(nodeT: NodeT) {
    this.selectedNode = nodeT
    this.loadImportData()

    this.$client.countImportData(this.containerID, nodeT.id)
        .then((count) => {
          this.importDataCount = count
          this.dialog = true
        })
        .catch((e: any) => this.errorMessage = e)
  }

  loadImportData() {
    this.importLoading = true
    this.importData = []

    const {page, itemsPerPage, sortBy, sortDesc } = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1;
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listImportData(this.containerID, this.selectedImport!.id,{
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam
    })
        .then((results) => {
          this.importData = results
          this.importLoading = false

        })
        .catch((e: any) => this.errorMessage = e)

  }

  viewImportData(importData: ImportDataT) {
    this.selectedData = importData.data
    this.dataDialog = true
  }

  deleteImportData(importData: ImportDataT) {
    if(importData.inserted_at) {
      this.dataErrorMessage= "Unable to delete data that has already been inserted"
      return
    }

    this.$client.deleteImportData(this.containerID, importData.import_id, importData.id)
        .then(() => {
          this.loadImportData()
        })
        .catch((e: any) => this.dataErrorMessage= e)
  }

    copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
