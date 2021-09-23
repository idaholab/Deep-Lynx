<template>
  <v-card>
    <v-toolbar flat color="white">
      <v-toolbar-title>{{$t('queryData.queryData')}}</v-toolbar-title>
    </v-toolbar>
    <query-builder :containerID="containerID" @results="parseJSON"></query-builder>

    <v-toolbar flat color="white" class="toolbar-results mt-4">
      <v-toolbar-title>{{$t('queryData.results')}}</v-toolbar-title>
    </v-toolbar>
    <v-row>
      <v-col
          cols="12"
      >
        <v-container flat class="pa-0">
          <v-tabs
              v-model="tab"
              background-color="lightgray"
              slider-color="darkgray"
          >
            <v-tab
                v-for="tab in tabs"
                :key="tab.name"
                @click.prevent="setActiveTabName(tab.name)"
            >
              {{ tab.name }}
            </v-tab>
          </v-tabs>
          <v-tabs-items v-model="tab">
            <v-tab-item>
              <v-card flat>
                <json-view
                    class="json-viewer px-1 py-5 text-wrap"
                    :data="results"
                    :maxDepth=4
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
                      <h4 class="primary--text">Node Information</h4>
                      <json-view
                          v-if="currentNodeInfo !== null"
                          class="json-viewer px-1 py-5 text-wrap"
                          :data="currentNodeInfo"
                          :maxDepth=4
                      />
                      <p v-if="currentNodeInfo === null">Select node to see info</p>
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
// import Cola for Cytoscape graph
import cola from "cytoscape-cola";
import QueryBuilder from "../components/queryBuilder/queryBuilder.vue"
import {Component, Prop, Vue} from "vue-property-decorator";
import {NodeT} from "@/api/types";
let resolveCy: any = null
export const cyPromise = new Promise(resolve => (resolveCy = resolve))

@Component({components: {QueryBuilder}})
export default class DataQuery extends Vue {
  @Prop()
  readonly containerID!: string

  currentNodeInfo: any = null
  tab = null
  results: any = null

  tabs = [
    { id: 0, name: 'JSON'},
    { id: 1, name: 'Graph'},
  ]

  activeTabName = 'JSON'

  queryExample = {
    dataJSON: 'sample text1',
    dataGraph: [
      {
        data: { id: "a" },
        position: { x: 589, y: 182 },
        group: "nodes"
      },
      {
        data: { id: "b" },
        position: { x: 689, y: 282 },
        group: "nodes"
      },
      {
        data: { id: "c" },
        position: { x: 489, y: 282 },
        group: "nodes"
      },
      {
        data: { id: "ab", source: "a", target: "b" },
        group: "edges"
      }
    ]
  }

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

  mounted() {
    // The currently active tab, init as the 1st item in the tabs array
    this.activeTabName = this.tabs[0].name;
  }

  async onChange() {
    const cy = await cyPromise;
    (cy as any).layout(this.cytoscapeConfig.layout).run()
  }

  async parseJSON (queryResult: any) {
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
          if (typeof item[key] === "object") {
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