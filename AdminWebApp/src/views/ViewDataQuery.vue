<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('query.viewerDescription')}}</v-toolbar-title>
      </v-toolbar>
      <query-builder
          :initialQuery="true"
          :containerID="containerID"
          @results="loadResults"
          @disableGraphEdit="disableGraphEdit"></query-builder>

      <v-row>
        <v-col
            cols="12"
            class="pb-0"
        >
          <v-container flat class="pa-0" style="max-width: 100%" v-show="showGraph">
            <v-tabs
                v-if="results"
                v-model="tab"
                background-color="lightgray"
                slider-color="darkgray"
            >
              <v-tab
                  v-for="tab in tabs()"
                  :key="tab.name"
                  @click.prevent="setActiveTabName(tab.name)"
              >
                {{ tab.display}}
              </v-tab>
            </v-tabs>
            <v-tabs-items v-model="tab">
              <v-tab-item>
                <v-card flat>
                  <v-row>
                    <v-col
                        :cols="12"
                        class="graph"
                    >
                      <graph-viewer :containerID="containerID" :results="results" ref="graph"></graph-viewer>
                    </v-col>
                  </v-row>
                </v-card>
              </v-tab-item>
              <v-tab-item>
                <v-card flat>
                  <v-data-table
                      :headers="headers()"
                      :items="nodes"
                      show-expand
                      :expanded.sync="expanded"
                      :items-per-page="100"
                      item-key="id"
                      :footer-props="{
                        'items-per-page-options': [25, 50, 100]
                        }"
                  >
                    <template v-slot:[`item.id`]="{ item }">
                      <v-tooltip top>
                        <template v-slot:activator="{on, attrs}">
                          <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
                        </template>
                        <span>{{$t('general.copyID')}} </span>
                        <span>{{item.id}}</span>
                      </v-tooltip>
                    </template>
                    <template v-slot:item:[`created_at`]="{ item }">
                      {{prettyPrintDate(item.created_at)}}
                    </template>

                    <template v-slot:expanded-item="{headers, item }">
                      <td :colspan="headers.length">
                        <v-expansion-panels v-model="openPanels">
                        <!-- Properties -->
                          <v-expansion-panel>
                            <v-expansion-panel-header>
                              <div><span class="text-overline">{{$t('properties.properties')}}:</span></div>
                            </v-expansion-panel-header>
                            <v-expansion-panel-content>
                              <json-viewer :value="item.properties" copyable/>
                            </v-expansion-panel-content>
                          </v-expansion-panel>
                        <!-- Files -->
                          <v-expansion-panel>
                            <v-expansion-panel-header>
                              <div><span class="text-overline">{{$t('files.files')}}:</span></div>
                            </v-expansion-panel-header>
                            <v-expansion-panel-content>
                              <node-files-dialog :icon="true" :node="item"></node-files-dialog>
                            </v-expansion-panel-content>
                          </v-expansion-panel>
                        <!-- Edges -->
                          <v-expansion-panel v-if="item.links">
                            <v-expansion-panel-header>
                              <div><span class="text-overline">{{$t('edges.edges')}}:</span></div>
                            </v-expansion-panel-header>
                            <v-expansion-panel-content>
                              <v-data-table
                                :headers="edgeHeaders()"
                                :items="Object.keys(item.links).map(k => {
                                  return {
                                    id: item.links[k].id,
                                    origin: item.links[k].source.metatype_name,
                                    rel: item.links[k].name,
                                    destination: item.links[k].target.metatype_name,
                                    type: getEdgeType(item.links[k], item.id)
                                  }
                                })"
                              >
                              <template v-slot:[`item.id`]="{ item }">
                                <v-tooltip top>
                                  <template v-slot:activator="{on, attrs}">
                                    <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
                                  </template>
                                  <span>{{$t('general.copyID')}} </span>
                                  <span>{{item.id}}</span>
                                </v-tooltip>
                              </template>
                              </v-data-table>
                            </v-expansion-panel-content>
                          </v-expansion-panel>
                        <!-- Metadata Properties -->
                          <v-expansion-panel v-if="item.metadata_properties">
                            <v-expansion-panel-header>
                              <div><span class="text-overline">{{$t('query.metadataProperties')}}:</span></div>
                            </v-expansion-panel-header>
                            <v-expansion-panel-content>
                              <json-viewer :value="item.metadata_properties" copyable/>
                            </v-expansion-panel-content>
                          </v-expansion-panel>
                        <!-- Raw Data -->
                          <v-expansion-panel v-if="item.raw_data_history && results?.rawMetadataEnabled">
                            <v-expansion-panel-header>
                              <div><span class="text-overline">{{$t('query.rawData')}}:</span></div>
                            </v-expansion-panel-header>
                            <v-expansion-panel-content>
                              <json-viewer :value="item.raw_data_history" copyable/>
                            </v-expansion-panel-content>
                          </v-expansion-panel>
                        </v-expansion-panels>
                      </td>
                    </template>

                  </v-data-table>
                </v-card>
              </v-tab-item>
              <v-tab-item>
                <v-card flat>
                  <json-viewer
                      class="json-viewer px-1 py-5 text-wrap"
                      :value="nodes"
                      copyable
                      :maxDepth=1
                  />
                </v-card>
              </v-tab-item>
            </v-tabs-items>
          </v-container>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import QueryBuilder, {ResultSet} from "../components/queryBuilder/QueryBuilder.vue"
  import NodeFilesDialog from "@/components/data/nodeFilesDialog.vue";
  import GraphViewer from "@/components/visualization/graphViewer.vue"

  import {mdiFileDocumentMultiple} from "@mdi/js";
  import { NodeT } from "../api/types";

  interface DataQueryModel {
    tab: any | null,
    results: ResultSet | null,
    nodes: NodeT[] | null,
    selectedProperties: any | null,
    openPanels: number[],
    dialog: boolean,
    showGraph: boolean,
    expanded: [],
    copy: typeof mdiFileDocumentMultiple,
    activeTabName: 'graph',
  }

  interface GraphRefs {
    graph: {
      disableGraphEdit: () => void;
    };
  }

  export default Vue.extend ({
    name: 'DataQuery',

    components: { QueryBuilder, NodeFilesDialog, GraphViewer },

    props: {
      containerID: {type: String, required: true},
    },

    data: (): DataQueryModel => ({
      tab: null,
      results: null,
      nodes: null,
      selectedProperties: null,
      openPanels: [0],
      dialog: false,
      showGraph: false,
      expanded: [],
      copy: mdiFileDocumentMultiple,
      activeTabName: 'graph'
    }),

    methods: {
      tabs() {
        return  [
          { id: 0, name: 'graph', display: this.$t('graph.graph')},
          { id: 1, name: 'list', display: this.$t('general.list') },
          { id: 2, name: 'json', display: this.$t('general.json')},
        ]
      },
      headers() {
        return [
          {text: this.$t('general.id'), value: 'id', sortable: false},
          {text: this.$t('classes.class'), value: 'metatype_name'},
          {text: this.$t('general.dateCreated'), value: 'created_at'},
          {value: 'data-table-expand'}
        ]
      },
      edgeHeaders() {
        return [
          {text: this.$t('general.id'), value: 'id'},
          {text: this.$t('edges.originClass'), value: 'origin'},
          {text: this.$t('relationships.relationship'), value: 'rel'},
          {text: this.$t('edges.destinationClass'), value: 'destination'},
          {text: this.$t('general.type'), value: 'type'},
          {value: 'data-table-expand'}
        ]
      },
      getEdgeType(edge: any, nodeID: string) {
        const type = edge.source.id === nodeID ? this.$t('edges.outgoing') : this.$t('edges.incoming')
        return type
      },
      async loadResults(queryResult: any) {
        // if queryResult === null, do not show graph
        if (queryResult === null) {
          this.showGraph = false
          return
        }

        this.showGraph = true
        this.activeTabName = 'graph'
        this.tab = this.tabs()[0]
        this.results = queryResult
        this.nodes = queryResult.nodes
      },
      disableGraphEdit() {
        const refs = (this as unknown as { $refs: GraphRefs }).$refs;
        // Ensure graph editing is disabled on tab change
        if (refs.graph) {
          refs.graph.disableGraphEdit();
        }
      },
      setActiveTabName(name: any) {
        this.activeTabName = name;
        const refs = (this as unknown as { $refs: GraphRefs }).$refs;
        // Ensure graph editing is disabled on tab change
        if (refs.graph) {
          refs.graph.disableGraphEdit();
        }
      },
      copyID(id: string) {
        navigator.clipboard.writeText(id)
      },
      viewProperties(properties: any) {
        this.selectedProperties = JSON.parse(properties)
        this.dialog = true
      },
      prettyPrintDate(date: string) {
        return new Date(Date.parse(date)).toISOString().split("T").join(' ').slice(0, 16) + ' UTC'
      }
    }
  });
</script>

<style lang="scss" scoped>
.height-full {
  height: 100% !important;
}

.queries-col {
  @media screen and (min-width: 960px) {
    border-right: 1px solid $darkgray;
  }

  .v-data-table {
    margin-bottom: 5px;

    & :deep(.v-data-table__wrapper ){
      border-top-left-radius: 4px;

      @media screen and (max-width: 959px) {
        border-top-right-radius: 4px;
      }
    }

    .highlight {
      // border-top: 1px solid transparent;
      background-color: $lightgray;
    }

    thead {
      background-color: $primary;

      th {
        border-bottom: 0 !important;
        color: white !important;
      }
    }

    tbody {

      tr:hover,
      td:hover {
        border-radius: 0 !important;
      }

      tr {
        td {
          cursor: pointer;
          border-bottom: thin solid $lightgray !important;
        }

        &:last-child td {
          border-bottom: 0 !important;
        }
      }
    }
  }
}

.toolbar-results {
  height: 50px!important;
}

.v-window {
  height: calc(100% - 48px);

  & :deep(.v-window__container) {
    height: 100% !important;
  }
}

.v-tabs-slider {
  border-bottom: 2px solid $darkgray;
}

.btn-submit {
  position: absolute;
  z-index: 2;
  right: 6px;
  top: 6px
}

.btn-new-query {
  border-bottom: 1px solid $lightgray;
}

.graphql-editor {
  background: white;
  color: black;
  font-family: $body-font-family;
  font-size: 14px;
  line-height: 1.5;
}

.node-info {
    border-left: 1px solid $darkgray;
}
</style>