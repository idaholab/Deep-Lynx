<template>
  <v-card>
    <v-toolbar flat color="white">
      <v-toolbar-title>{{$t('dataQuery.dataQuery')}}</v-toolbar-title>
    </v-toolbar>
    <query-builder :containerID="containerID" @results="loadResults"></query-builder>

    <v-row>
      <v-col
          cols="12"
      >
        <v-container flat class="pa-0">
          <v-row v-if="!results">
            <v-col align="center">
              <p>{{$t('dataQuery.noResults')}}</p>
            </v-col>
          </v-row>
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
                <v-data-table
                    :headers="headers()"
                    :items="results"
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
                      <span>{{$t('dataQuery.copyID')}} </span>
                      <span>{{item.id}}</span>
                    </v-tooltip>
                  </template>
                  <template v-slot:item:[`created_at`]="{ item }">
                    {{prettyPrintDate(item.created_at)}}
                  </template>

                  <template v-slot:expanded-item="{headers, item }">
                    <td :colspan="headers.length">
                      <v-container>
                        <v-row>
                          <v-col :cols="12">
                            <v-toolbar
                                flat
                            >
                              <v-toolbar-title>{{$t('dataQuery.viewProperties')}}</v-toolbar-title>
                            </v-toolbar>

                            <json-view :data="JSON.parse(item.raw_properties)"></json-view>
                          </v-col>
                        </v-row>
                        <node-files-dialog :icon="true" :node="item"></node-files-dialog>
                      </v-container>
                    </td>
                  </template>

                </v-data-table>
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card flat>
                <json-view
                    class="json-viewer px-1 py-5 text-wrap"
                    :data="results"
                    :maxDepth=1
                />
              </v-card>
            </v-tab-item>
            <v-tab-item>
              <v-card flat>
                <v-row>
                  <v-col
                      cols="6"
                      class="graph"
                  >
                    <cytoscape
                        :config="cytoscapeConfig"
                        :preConfig="preConfig"
                        :afterCreated="afterCreated"
                        layout="spread"
                    >
                      <cy-element
                          v-for="def in cytoscapeElements.elements.nodes"
                          :key="`${def.data.id}`"
                          :definition="def"
                          v-on:mousedown="getInfo(def.data)"
                      />
                      <cy-element
                          v-for="def in cytoscapeElements.elements.edges"
                          :key="`${def.data.id}`"
                          :definition="def"
                      />
                    </cytoscape>
                  </v-col>
                  <v-col
                      cols="6"
                      class="node-info"
                  >
                    <div class="mt-2 pt-3 px-5 pb-5 height-full">
                      <h4 class="primary--text">{{$t('dataQuery.nodeInformation')}}</h4>
                      <json-view
                          v-if="currentNodeInfo !== null"
                          class="json-viewer px-1 py-5 text-wrap"
                          :data="currentNodeInfo"
                          :maxDepth=4
                      />
                      <p v-if="currentNodeInfo === null">{{$t('dataQuery.selectNode')}}</p>
                    </div>
                  </v-col>
                </v-row>
              </v-card>
            </v-tab-item>
          </v-tabs-items>
        </v-container>
      </v-col>
    </v-row>
  </v-card>
</template>

<script lang="ts">
import cola from "cytoscape-cola";
import QueryBuilder from "../components/queryBuilder/queryBuilder.vue"
import NodeFilesDialog from "@/components/nodeFilesDialog.vue";
import {Component, Prop, Vue} from "vue-property-decorator";
import {NodeT} from "@/api/types";
import IfcViewer from "@/components/ifcViewer.vue";

import {ResultSet} from "@/components/queryBuilder/queryBuilder.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
let resolveCy: any = null
export const cyPromise = new Promise(resolve => (resolveCy = resolve))

@Component({components: {QueryBuilder, NodeFilesDialog}})
export default class DataQuery extends Vue {
  @Prop()
  readonly containerID!: string

  dialog = false
  currentNodeInfo: any = null
  tab: any | null = null
  results: ResultSet | null = null
  selectedProperties: any| null = null
  expanded = []

  copy = mdiFileDocumentMultiple
  activeTabName = 'list'

  cytoscapeConfig = {
    boxSelectionEnabled: false,
    layout: {
      name: "cola"
    },
    style: [
      {
        selector: "node",
        css: {
          "background-color": "#f68c20"
        }
      },
      {
        selector: ':selected',
        style: {
          'background-color': '#000000',
        }
      },
      {
        selector: "edge",
        css: {
          "line-color": "#f68c20"
        }
      }
    ]
  }

  cytoscapeElements = {
    elements: {
      nodes: [],
      edges: []
    }
  }

  tabs() {
    return  [
      { id: 0, name: 'list', display: this.$t('dataQuery.list') },
      { id: 1, name: 'json', display: this.$t('dataQuery.json')},
      { id: 2, name: 'graph', display: this.$t('dataQuery.graph')},
    ]
  }

  headers() {
    return [
      {text: this.$t('dataQuery.id'), value: 'id', sortable: false},
      {text: this.$t('dataQuery.metatypeName'), value: 'metatype.name'},
      {text: this.$t('dataQuery.createdAt'), value: 'created_at'},
      {value: 'data-table-expand'}
    ]
  }

  async onChange() {
    const cy = await cyPromise;
    (cy as any).layout(this.cytoscapeConfig.layout).run()
  }

  async loadResults(queryResult: any) {
    this.activeTabName = 'list'
    this.tab = this.tabs()[0]
    this.results = queryResult.nodes
    const originalJSON = queryResult.nodes
    const nodes: any = []
    const edges: any = []

    function extractNodes(originalJSON: any) {
      for (let i = 0; i < originalJSON.length; i++) {
        const newObject = {
          data: originalJSON[i]
        }
        nodes.push(newObject)
      }
    }

    function extractEdges(originalJSON: any) {
      function searchItem(item: any) {
        Object.keys(item).forEach(key => {
          if (typeof item[key] === "object" && item[key] != null) {
            searchItem(item[key])
          }
          if (typeof item[key] === "string") {
            const searchAsRegEx = new RegExp("edges", "gi");
            if (item[key].match(searchAsRegEx)) {
              edges.push(item.id)
            }
          }
        })
      }

      function getEachItem(object: any) {
        object.forEach((item: any) => {
          searchItem(item)
          if (item.incoming_edges.length !== 0) {
            for (let i = 0; i < item.incoming_edges.length; i++) {
              const newObject = {
                data: {
                  id: item.incoming_edges[i].id,
                  source: item.incoming_edges[i].origin_node.id,
                  target: item.id
                }
              }
              edges.push(newObject)
            }
          } else if (item.outgoing_edges.length !== 0) {
            for (let i = 0; i < item.outgoing_edges.length; i++) {
              const newObject = {
                data: {
                  id: item.outgoing_edges[i].id,
                  source: item.id,
                  target: item.outgoing_edges[i].destination_node.id
                }
              }
              edges.push(newObject)
            }
          }
        })
      }

      getEachItem(originalJSON)
    }

    extractNodes(originalJSON)
    this.cytoscapeElements.elements.nodes = nodes.filter((thing: any, index: any) => {
      const _thing = JSON.stringify(thing);
      return index === nodes.findIndex((obj: any) => {
        return JSON.stringify(obj) === _thing;
      });
    });

    extractEdges(originalJSON)
    this.cytoscapeElements.elements.edges = edges.filter((thing: any, index: any) => {
      const _thing = JSON.stringify(thing);
      return index === edges.findIndex((obj: any) => {
        return JSON.stringify(obj) === _thing;
      });
    });

    await this.onChange()
  }

  setActiveTabName(name: any) {
    this.activeTabName = name;
  }

  getInfo(data: NodeT) {
    this.currentNodeInfo = {
      id: data.id,
      metatype: {
        id: data.metatype.id,
        name: data.metatype.name
      },
      properties:JSON.parse(data.raw_properties)
    }
  }

  preConfig(cytoscape: any) {
    console.log("calling pre-config");

    // cytoscape: this is the cytoscape constructor
    cytoscape.use(cola);
  }

  async afterCreated(cy: any) {
    // cy: this is the cytoscape instance
    await cy
    cy.layout(this.cytoscapeConfig.layout).run()
    resolveCy(cy)
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }

  viewProperties(properties: any) {
    this.selectedProperties = JSON.parse(properties)
    this.dialog = true
  }

  prettyPrintDate(date: string) {
    return new Date(Date.parse(date)).toISOString().split("T").join(' ').slice(0, 16) + ' UTC'
  }
}
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

    & ::v-deep .v-data-table__wrapper {
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

  & ::v-deep .v-window__container {
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
  // min-width: 300px;

  div:first-child {
    border-left: 1px solid $darkgray;
  }
}

</style>