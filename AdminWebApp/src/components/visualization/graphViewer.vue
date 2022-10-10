<template>
  <div>
    <v-card style="width: 100%; height: 100%; position: relative">
      <v-toolbar flat color="lightgray" >
        <v-toolbar-title>Graph</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-progress-circular indeterminate v-if="loading"  style="margin-right: 16px"></v-progress-circular>
        <div class="mr-5">
          <v-btn
              @click="resetGraph"
              :disabled="graph.nodes.length < 1"
          >
            Reset Graph
          </v-btn>
        </div>

        <v-menu
            v-model="showHelp"
            :close-on-content-click="false"
            :nudge-left="25"
            :nudge-bottom="25"
            left
        >
          <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on" >{{info}}</v-icon>
          </template>
          <v-card max-width="364" style="justify-content: left">

            <v-card-text class="text-h5 font-weight-bold">
            Hover over the blue "+" icon in the top left of the graph view to find graph edit tools!
            </v-card-text>

            <v-list>
              <v-list-item>
                <v-slider
                    v-model="minZoom"
                    thumb-label
                    :max="maxMinZoom < maxZoom ? maxMinZoom : maxZoom"
                    :min="minMinZoom"
                    label="Min Zoom"
                    step=0.1
                ></v-slider>
              </v-list-item>
              <v-list-item>
                <v-slider
                    v-model="maxZoom"
                    thumb-label
                    :max="maxMaxZoom"
                    :min="minMaxZoom > minZoom ? minMaxZoom : minZoom"
                    label="Max Zoom"
                    step=1
                ></v-slider>
              </v-list-item>
              <v-list-item>
                <v-list-item-action>
                  <v-btn
                      icon
                      @click="updateGraphZoom"
                      :disabled="graph.nodes.length < 1"
                  >
                    <v-icon>{{ 'mdi-autorenew' }}</v-icon>
                  </v-btn>
                </v-list-item-action>
                <v-list-item-title>Update Zoom</v-list-item-title>
              </v-list-item>
              <v-list-item>
                <v-list-item-action>
                  <v-btn
                      icon
                      @click="resetGraphZoom"
                      :disabled="graph.nodes.length < 1"
                  >
                    <v-icon>{{ 'mdi-autorenew' }}</v-icon>
                  </v-btn>
                </v-list-item-action>
                <v-list-item-title>Reset Zoom</v-list-item-title>
              </v-list-item>
            </v-list>

            <v-card-actions>
              Graph Help
              <v-spacer></v-spacer>

            </v-card-actions>
            <v-expand-transition>
              <div v-show="showHints">
                <v-divider></v-divider>

                <v-card-text>
                  <b>Controls</b> <br>
                  - Pan : Left click drag on open area of graph <br>
                  - Zoom : Mousewheel scroll <br>
                  - Center on node: Double click node <br>
                  - New graph with node and connections: Right click node<br>
                  - View node information: Left click node (hover to see metatype & ID)<br>
                  - Move node: Left click and drag node<br>
                  - Highlight node/edge and related nodes/edges: Hover over node or edge <br><br>
                  Node labels show the "name" property (if present) or else the node ID.<br>
                  Node color is automatically set based on metatype name or data source.
                </v-card-text>
              </div>
            </v-expand-transition>
          </v-card>
        </v-menu>
      </v-toolbar>

      <error-banner :message="errorMessage"></error-banner>
      <!-- Graph edit tools -->
      <v-speed-dial
          v-model="editFab"
          top
          left
          direction="bottom"
          absolute
          style="margin-top: 62px"
          open-on-hover
          transition="slide-x-transition"
      >
        <template v-slot:activator>
          <v-tooltip v-model="edgeFlag" right>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-model="editFab"
                :color="edgeFlag ? 'purple' : 'blue darken-2'"
                dark
                editFab
                v-on="edgeFlag ? on : null"
                v-bind="attrs"
              >
                <v-icon v-if="editFab">
                  mdi-close
                </v-icon>
                <v-icon v-else-if="edgeFlag">
                  mdi-vector-circle
                </v-icon>
                <v-icon v-else>
                  mdi-plus
                </v-icon>
              </v-btn>
            </template>
            <span>
              Drag a node towards other nodes to create new edges. <br/>
              Release the node once the desired edge is indicated to bring up the dialog for edge creation.
            </span>
          </v-tooltip>
        </template>

        <v-tooltip open-delay=500 right>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
                editFab
                dark
                small
                color="green"
                v-bind="attrs"
                v-on="on"
                @click="newNodeDialog = true"
            >
              <v-icon>mdi-plus-circle</v-icon>
            </v-btn>
          </template>
          <span>Create a node</span>
        </v-tooltip>

        <!-- Future: Implement multinode creation -->
        <!-- <v-tooltip open-delay=500 right>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              editFab
              dark
              small
              color="indigo"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon>mdi-plus-circle-multiple</v-icon>
            </v-btn>
          </template>
          <span>Create multiple nodes</span>
        </v-tooltip> -->

        <v-tooltip open-delay=500 right>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
                editFab
                dark
                small
                color="purple"
                v-bind="attrs"
                v-on="on"
                @click="edgeFlag = !edgeFlag"
            >
              <v-icon>mdi-vector-circle</v-icon>
            </v-btn>
          </template>
          <span>Enable/disable edge creation</span>
        </v-tooltip>
      </v-speed-dial>

      <!-- Color Legend and Filter -->
      <v-navigation-drawer
          v-model="showColorLegend"
          absolute
          right
          permanent
          :mini-variant.sync="mini"
          style="margin-top: 64px"
      >
        <v-list-item class="px-2">

          <v-btn
              icon
              @click.stop="mini = !mini"
          >
            <v-icon v-if="!mini">mdi-chevron-right</v-icon>
            <v-icon v-else>mdi-chevron-left</v-icon>
          </v-btn>

          <v-list-item-title>Legend</v-list-item-title>
        </v-list-item>

        <v-list-item>
          <v-switch
              hide-details
              class="d-flex justify-center"
              v-model="edgeLabelFlag"
              label="Toggle edge labels"
          ></v-switch>
        </v-list-item>

        <v-list-item>
          <v-select
              v-model="colorGroup"
              :items="colorGroupOptions"
              @input="updateColorGroup"
              hide-selected
              hint="Choose how to group node color"
              persistent-hint
              v-if="!mini"
          >
          </v-select>
        </v-list-item>
        <v-list dense style="width: fit-content">
          <v-list-item-group
              color="primary"
              multiple
              v-model="selectedFilters"
          >
            <v-list-item
                v-for="(item, i) in nodeColorsArray"
                :key="i"
                @click="filterOnGroupItem(i)"
            >
              <v-list-item-icon style="margin-right: 12px">
                <v-icon color="#b2df8a" :style='`color: ` + item.key + `!important`'>mdi-circle</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{item.value}}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-navigation-drawer>

      <div id="forcegraph" ref="forcegraph" ></div>
      
    </v-card>
    <!-- End Graph Component -->

    <!-- New Node dialog -->
    <v-dialog
        v-model="newNodeDialog"
        width="50%"
    >
      <v-card class="pt-1 pb-3 px-2">
        <select-data-source
            :containerID="containerID"
            :dataSourceID="selectedDataSource"
            @selected="setDataSource">
        </select-data-source>
        <div v-if="(selectedDataSource !== null)">
          <v-divider></v-divider>
          <create-node-card
              :dataSourceID="selectedDataSource.id"
              :containerID="containerID"
              :disabled="!selectedDataSource.active || selectedDataSource.archived"
              @nodeCreated="createNode"
              @close="newNodeDialog = false"
          >
          </create-node-card>
        </div>
      </v-card>
    </v-dialog>

    <!-- New Edge dialog -->
    <v-dialog
        v-model="newEdgeDialog"
        @click:outside="closeEdgeDialog()"
        width="50%"
    >
      <v-card class="pt-1 pb-3 px-2">
        <template v-if="interimLink">
          <v-form
              ref="edgeForm"
              v-model="validEdge"
          >
            <v-card-title>
              <span class="headline text-h3">{{$t("createEdge.formTitle")}}</span>
            </v-card-title>

            <v-col cols="12">
              <v-row>
                <v-col cols="6">
                  <v-text-field
                      :value="interimLink.source.metatype_name"
                      label="Origin Metatype"
                      readonly
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                      :value="interimLink.target.metatype_name"
                      label="Destination Metatype"
                      readonly
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row v-if="relationshipPairs.length === 0">
                <div class="pa-6 pb-0">
                  <p>No valid relationships for this metatype pair.</p>
                </div>
              </v-row>

              <div v-else>

                <v-row>
                  <v-col cols="6">
                    <v-text-field
                        :value="interimLink.source.id"
                        label="Origin ID"
                        readonly
                    ></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                        :value="interimLink.target.id"
                        label="Destination ID"
                        readonly
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-select
                    :items="relationshipPairs"
                    v-model="selectedRelationshipPair"
                    :single-line="false"
                    item-text="name"
                    clearable
                    :label="$t('dataMapping.chooseRelationship')"
                    return-object
                    :rules="[v => !!v || $t('createEdge.relationshipRequired')]"
                    required
                    @change="listRelationshipKeys(selectedRelationshipPair.relationship_id)"
                >
                  <template slot="append-outer"><info-tooltip :message="$t('dataMapping.relationshipPairSearchHelp')"></info-tooltip></template>

                  <template slot="item" slot-scope="data">
                    {{data.item.origin_metatype_name}} - {{data.item.relationship_name}} - {{data.item.destination_metatype_name}}
                  </template>

                </v-select>

                <div v-if="selectedRelationshipPair">
                    <v-col :cols="12" v-if="relationshipKeys && relationshipKeys.length !== 0">
                        <v-checkbox
                            v-model="optional"
                            :label="'Show Optional Fields'"
                        ></v-checkbox>
                        <v-col :cols="12">
                            <v-data-table
                                :items="relationshipKeys"
                                :disable-pagination="true"
                                :hide-default-footer="true"
                                v-if="optional === true"
                            >
                              <template v-slot:[`item`]="{item}">

                                  <div v-if="item['data_type'] === 'enumeration'">
                                    <v-combobox
                                      v-model="item['default_value']"
                                      :label="item['name']"
                                      :items="item['options']"
                                    ></v-combobox>
                                  </div>

                                  <div v-if="item['data_type'] === 'boolean'">
                                    <v-select
                                      v-model="item['default_value']"
                                      :label="item['name']"
                                      :items="booleanOptions"
                                    ></v-select>
                                  </div>

                                  <div v-if="item['data_type'] !== 'enumeration' && item['data_type'] !== 'boolean'">
                                    
                                    <v-text-field 
                                        v-if="item['data_type'] === 'number'||item['data_type'] === 'float'"
                                        v-model="item['default_value']"
                                        type="number"
                                        :label="item['name']"
                                    ></v-text-field>

                                    <v-text-field
                                        v-else
                                        v-model="item['default_value']"
                                        :label="item['name']"
                                        :disabled="item['data_type'] === 'file'"
                                    ></v-text-field>

                                  </div>
                                  
                              </template>
                            </v-data-table>
                        </v-col>
                    </v-col>
                </div>

                <select-data-source
                    @selected="setDataSource"
                    :dataSourceID="interimLink.source.data_source_id"
                    :containerID="containerID">
                </select-data-source>

              </div>

            </v-col>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" text @click="closeEdgeDialog()" >{{$t("createNode.cancel")}}</v-btn>
              <v-btn v-if="relationshipPairs.length > 0" color="blue darken-1" text :disabled="!validEdge" @click="createEdge()">{{$t("createNode.save")}}</v-btn>
            </v-card-actions>
          </v-form>
        </template>
      </v-card>
    </v-dialog>

    <!-- Node Properties dialog -->
    <v-dialog
        v-model="nodeDialog"
        width="50%"
    >
      <v-card
          @mouseover="opacity = 1.0"
          @mouseleave="opacity = 0.5"
          :style="`opacity: ${opacity}`"
      >

        <div class="mt-2 pt-3 px-5 pb-5 height-full">
          <h4 class="primary--text">{{$t('dataQuery.nodeInformation')}}</h4>
          <div v-if="currentNodeInfo !== null">
            <v-row>
              <v-col>
                <div><span class="text-overline">{{$t('dataQuery.nodeID')}}:</span> {{currentNodeInfo.id}}</div>
                <div><span class="text-overline">{{$t('dataQuery.nodeType')}}:</span> {{currentNodeInfo.metatype.name}}</div>
                <div><span class="text-overline">DataSource:</span> {{datasources[currentNodeInfo.data_source_id]?.name}} ({{currentNodeInfo.data_source_id}})</div>
                <div><span class="text-overline">Created At:</span> {{currentNodeInfo.created_at}}</div>
                <div><span class="text-overline">Modified At:</span> {{currentNodeInfo.modified_at}}</div>
                <v-expansion-panels multiple v-model="openPanels">
                  <v-expansion-panel>
                    <v-expansion-panel-header>
                      <div><span class="text-overline">{{$t('dataQuery.nodeProperties')}}:</span></div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-data-table
                          :items="Object.keys(currentNodeInfo.properties).map(k => {
                            return {key: k, value: currentNodeInfo.properties[k]}
                          })"
                          :headers="propertyHeaders()"
                      >
                      </v-data-table>

                    </v-expansion-panel-content>
                  </v-expansion-panel>

                  <v-expansion-panel>
                    <v-expansion-panel-header>
                      <div><span class="text-overline">{{$t('dataQuery.nodeFiles')}}:</span></div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <node-files-dialog :icon="true" :node="currentNodeInfo"></node-files-dialog>
                    </v-expansion-panel-content>
                  </v-expansion-panel>

                  <v-expansion-panel>
                    <v-expansion-panel-header>
                      <div><span class="text-overline">{{$t('dataQuery.nodeTimeseries')}}:</span></div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <node-timeseries-data-table :nodeID="currentNodeInfo.id" :containerID="containerID"></node-timeseries-data-table>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>

            </v-row>

          </div>

          <p v-if="currentNodeInfo === null">{{$t('dataQuery.selectNode')}}</p>
          <v-row>
            <v-col :cols="12">
              <v-btn color="red darken-1" style="color: white" @click="deleteNode(currentNodeInfo)">{{$t('dataQuery.deleteNode')}}</v-btn>
            </v-col>
          </v-row>
        </div>
      </v-card>
    </v-dialog>

    <!-- Edge Properties dialog -->
    <v-dialog
        v-model="edgeDialog"
        width="50%"
    >
      <v-card
          @mouseover="opacity = 1.0"
          @mouseleave="opacity = 0.5"
          :style="`opacity: ${opacity}`"
      >

        <div class="mt-2 pt-3 px-5 pb-5 height-full">
          <h4 class="primary--text">{{$t('dataQuery.edgeInformation')}}</h4>
          <div v-if="currentEdgeInfo !== null">
            <v-row>
              <v-col>
                <div><span class="text-overline">{{$t('dataQuery.edgeID')}}:</span> {{currentEdgeInfo.id}}</div>
                <div><span class="text-overline">{{$t('dataQuery.relType')}}:</span> {{currentEdgeInfo.metatype_relationship.name}}</div>
                <div><span class="text-overline">DataSource:</span> {{datasources[currentEdgeInfo.data_source_id]?.name}} ({{currentEdgeInfo.data_source_id}})</div>
                <div><span class="text-overline">Created At:</span> {{currentEdgeInfo.created_at}}</div>
                <div><span class="text-overline">Modified At:</span> {{currentEdgeInfo.modified_at}}</div>
                <v-expansion-panels 
                  multiple v-model="openPanels" 
                  v-if="currentEdgeInfo.properties !== null"
                >
                  <v-expansion-panel>
                    <v-expansion-panel-header>
                      <div><span class="text-overline">{{$t('dataQuery.edgeProperties')}}:</span></div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-data-table
                        :items="Object.keys(currentEdgeInfo.properties).map(k => {
                          return {key: k, value: currentEdgeInfo.properties[k]}
                        })"
                        :headers="propertyHeaders()"
                      ></v-data-table>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>
            </v-row>

          </div>

          <p v-if="currentEdgeID === null">{{$t('dataQuery.selectEdge')}}</p>
          <v-row>
            <v-col :cols="12">
              <v-btn color="red darken-1" style="color: white" @click="deleteEdge(currentEdgeID)">{{$t('dataQuery.deleteEdge')}}</v-btn>
            </v-col>
          </v-row>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import NodeFilesDialog from "@/components/data/nodeFilesDialog.vue";
import NodeTimeseriesDataTable from "@/components/data/nodeTimeseriesDataTable.vue";
import SelectDataSource from "@/components/dataSources/selectDataSource.vue";
import CreateNodeCard from "@/components/data/createNodeCard.vue";
import CreateEdgeDialog from "@/components/data/createEdgeDialog.vue";
import {Component, Prop, Watch, Vue} from "vue-property-decorator";
import {NodeT, DataSourceT, MetatypeRelationshipPairT, MetatypeRelationshipKeyT} from "@/api/types";
import ForceGraph, {ForceGraphInstance} from 'force-graph';
import {forceX, forceY} from 'd3-force';

import {mdiInformation} from "@mdi/js";
import { EdgeT } from "../../api/types";

@Component({components: {
    NodeFilesDialog,
    NodeTimeseriesDataTable,
    CreateNodeCard,
    CreateEdgeDialog,
    SelectDataSource
  }})
export default class GraphViewer extends Vue {
  @Prop()
  readonly containerID!: string

  @Prop()
  readonly results!: NodeT[]

  dialog = false
  optional = false
  currentNodeInfo: any = null
  currentEdgeInfo: any = null
  currentEdgeID: any = null
  openPanels: number[] = [0]
  loading = false

  forceGraph: ForceGraphInstance | null = ForceGraph();
  canvas: ForceGraphInstance | null = null;

  forceX = forceX()
  forceY = forceY()

  graph: any | null = {
    nodes: [],
    links: []
  }

  graphRenderTime = 2000 // time in ms to spend rendering the graph on changes
  zoomToFitDuration = 1000 // time in ms to spend on zoom transition after graph changes

  nodesById: any = {}
  nodeColorsArray: any = []

  colorGroup = 'metatype'
  colorGroupOptions = ['metatype', 'data source']
  colorGroupFilter: any = []
  selectedFilters: any = []
  errorMessage = ""

  datasources: {[key: string]: DataSourceT} = {}

  nodeDialog = false
  edgeDialog = false
  selectedNode: any
  selectedEdge: any
  opacity = 1.0

  previousClick = 0
  currentClick = 0
  firstClickID = 0
  doubleClickFlag = false
  doubleClickTimer = 500

  info = mdiInformation
  showHelp = false
  showHints = true

  showColorLegend = true
  mini = false

  minZoom = 0.2
  maxMinZoom = 100
  minMinZoom = 0.01

  maxZoom = 125
  maxMaxZoom = 1000
  minMaxZoom = 10

  editFab = false
  newNodeDialog = false
  newEdgeDialog = false

  edgeFlag = false // edge creation disabled by default
  dragSourceNode: any | null = null
  interimLink: any | null = null
  linkIdCounter = 0
  snapInDistance = 25
  snapOutDistance = 40

  selectedDataSource: DataSourceT | null = null

  relationshipPairs: MetatypeRelationshipPairT[] = []
  relationshipPairSearch = ""
  selectedRelationshipPair: MetatypeRelationshipPairT | null = null
  relationshipKeys: any = {}
  validEdge = false
  edgeLabelFlag = false
  booleanOptions = [true, false]
  edgeProperties = {}

  @Watch('results', {immediate: true})
  graphUpdate() {
    // reset graph
    this.graph = {
      nodes: [],
      links: []
    }
    this.forceGraph = ForceGraph()

    this.loadResults();
  }

  filterOnGroupItem(index: number | null) {
    if (index != null) {

      const filterIndex = this.colorGroupFilter.indexOf(index)

      if (filterIndex !== -1) { // if the index provided is already in the array, remove
        this.colorGroupFilter.splice(filterIndex, 1)
      } else { // else add the index to the array
        this.colorGroupFilter.push(index)
      }
    }

    // apply filter to graph
    const filterList: any = []

    // create array of data source IDs or metatype names from the given index(es)
    this.colorGroupFilter.forEach((i: number) => {
      // if the nodeColorsArray value is a string with multiple values separated by commas, separate out the values
      const colorValues = this.nodeColorsArray[i].value.split(',')

      colorValues.forEach((value: string) => {
        if (this.colorGroup === 'data source') {
          const match = value.trim().match(/\((\d*)\)/) ?? []
          filterList.push(match[1]) // retrieves the string data source id from the value property, finding the matched digit within parentheses
          // leave as a string for matching against node.data_source_id
        } else {
          // default to behavior for metatype filtering
          filterList.push(value.trim())
        }
      });

    });

    this.graph.nodes.forEach((node: NodeT) => {
      // use a nodes "collapsed" property to determine whether to hide it
      if (this.colorGroup === 'data source') {

        if (filterList.indexOf(node.data_source_id) === -1) {
          node.collapsed = true
        } else {
          node.collapsed = false
        }
      } else { // default filter on metatype
        if (filterList.indexOf(node.metatype_name) === -1) {
          node.collapsed = true
        } else {
          node.collapsed = false
        }
      }
    });

    // if no filters are selected, show all nodes
    if (this.colorGroupFilter.length === 0) {
      this.graph.nodes.forEach((node: NodeT) => {
        node.collapsed = false
      })
    }
  }

  propertyHeaders() {
    return [
      {text: this.$t('dataQuery.name'), value: 'key'},
      {text: this.$t('dataQuery.value'), value: 'value'}
    ]
  }

  async loadResults(graphResults: NodeT[] | null = null) {
    this.loading = true

    const nodeIDs: string[] =  []
    let edges: any = []

    if (graphResults != null) {
      // if custom results are provided, use those

      this.graph.nodes = graphResults.map((node: any) => {
        nodeIDs.push(node.id)

        node.collapsed = false
        node.childLinks = []
        return node
      });

    } else {

      this.graph.nodes = this.results.map((node: any) => {
        nodeIDs.push(node.id)

        node.collapsed = false
        node.childLinks = []
        return node
      });

    }

    // fetch the edges
    // returns all edges in the container where either the origin or destination id is in the provided list of node IDs
    edges = await this.$client.listEdgesForNodeIDs(this.containerID, nodeIDs)

    if (edges) {
      edges.forEach((edge: any) => {
        // only push links where both source and target IDs are present in the graph
        if (nodeIDs.indexOf(edge.origin_id) != -1 && nodeIDs.indexOf(edge.destination_id) != -1) {
          this.graph.links.push({
            source: edge.origin_id,
            target: edge.destination_id,
            name: edge.metatype_relationship_name,
            id: edge.id,
            collapsed: false // flag for showing/hiding links. set all to visible by default
          })
        }
      });
    }


    const highlightNodes = new Set();
    const highlightLinks = new Set();
    let hoverNode: any = null;
    const NODE_R = 8;

    // required for enabling node and link highlighting
    this.graph.links.forEach((link: any) => {
      const aIndex = this.graph.nodes.findIndex((node: any) => { return node.id === link.source});
      const bIndex = this.graph.nodes.findIndex((node: any) => { return node.id === link.target});
      const a = this.graph.nodes[aIndex];
      const b = this.graph.nodes[bIndex];

      // need to handle links where the source or target node may not be in the graph
      if (aIndex !== -1 && b) {
        !a.neighbors && (a.neighbors = []);
        a.neighbors.push(b);

        !a.links && (a.links = []);
        a.links.push(link);
      }

      if (bIndex !== -1 && a) {
        !b.neighbors && (b.neighbors = []);
        b.neighbors.push(a);

        !b.links && (b.links = []);
        b.links.push(link);
      }

    });

    // link parent/children for collapsing/expanding graph
    this.nodesById = Object.fromEntries(this.graph.nodes.map((node: any) => [node.id, node]));
    this.graph.links.forEach((link: any) => {
      if (this.nodesById[link.source]) this.nodesById[link.source].childLinks.push(link);
    });

    // HANDLE OVERLAPPING EDGES AND SELF-EDGES
    const selfLoopLinks: any = {};
    const sameNodesLinks: any = {};
    const curvatureMinMax = 0.5;

    // 1. assign each link a nodePairId that combines their source and target independent of the links direction
    // 2. group links together that share the same two nodes or are self-loops
    this.graph.links.forEach((link: any) => {
      link.nodePairId = link.source <= link.target ? (link.source + "_" + link.target) : (link.target + "_" + link.source);
      const map = link.source === link.target ? selfLoopLinks : sameNodesLinks;
      if (!map[link.nodePairId]) {
        map[link.nodePairId] = [];
      }
      map[link.nodePairId].push(link);
    });

    // Compute the curvature for self-loop links to avoid overlaps
    Object.keys(selfLoopLinks).forEach(id => {
      const links = selfLoopLinks[id];
      const lastIndex = links.length - 1;
      links[lastIndex].curvature = 1;
      const delta = (1 - curvatureMinMax) / lastIndex;
      for (let i = 0; i < lastIndex; i++) {
        links[i].curvature = curvatureMinMax + i * delta;
      }
    });

    // Compute the curvature for links sharing the same two nodes to avoid overlaps
    Object.keys(sameNodesLinks).filter(nodePairId => sameNodesLinks[nodePairId].length > 1).forEach(nodePairId => {
      const links = sameNodesLinks[nodePairId];
      const lastIndex = links.length - 1;
      const lastLink = links[lastIndex];
      lastLink.curvature = curvatureMinMax;
      const delta = 2 * curvatureMinMax / lastIndex;
      for (let i = 0; i < lastIndex; i++) {
        links[i].curvature = - curvatureMinMax + i * delta;
        if (lastLink.source !== links[i].source) {
          links[i].curvature *= -1; // flip it around, otherwise they overlap
        }
      }
    });

    // create a map of datasource IDs and names for reference by nodes
    if (this.graph.nodes.length > 0) {
      const sources = await this.$client.listDataSources(this.graph.nodes[0].container_id)

      for (const datasource of sources) {
        if (datasource.id != undefined) {
          this.datasources[datasource.id] = datasource;
        }
      }
    }

    const graphElem = this.$refs.forcegraph as HTMLElement;

    if (graphElem != null) {
      this.canvas = this.forceGraph(graphElem)
          .width(graphElem.offsetWidth) // canvas width
          .height(graphElem.offsetHeight) // canvas height
          .minZoom(this.minZoom)
          .maxZoom(this.maxZoom)
          .graphData(this.graph) // graph data
          // .backgroundColor('#101020') // set background color of canvas
          .nodeLabel((node: any) => {
            return `${node.metatype_name} : ${node.id}`
          }) // set node label when hovering
          .onNodeRightClick(node => {
            // double clicks can be difficult to do dragging a node and custom timing to determine single or double click
            // right clicks will open up a new graph around the selected node, while double clicks will center and zoom
            this.openNodeGraph(node)
          }) // open node properties on right click
          .nodeCanvasObject((node: any, ctx, globalScale) => {

            // don't draw the full node if it is marked as collapsed
            if (!node.collapsed) {

              if (highlightNodes.has(node)) {
                // add ring just for highlighted nodes
                ctx.beginPath();
                ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
                ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
                ctx.fill();
              } else if (node.new_node) { // add ring for newly created nodes
                ctx.beginPath();
                ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'yellow';
                ctx.fill();
              }

              // then apply normal colors and labels (must happen after highlight styles have been created)

              ctx.beginPath()
              ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI)
              ctx.fillStyle = node.color;
              ctx.fill()

              const nodeName = node.properties.name ? node.properties.name : node.id;
              const label = `${nodeName}` as string;
              const fontSize = Math.min(24/globalScale, NODE_R * 1.4);

              ctx.font = `${fontSize}px Sans-Serif`;

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#101020';
              ctx.fillText(label, node.x!, node.y!);
            }

          }) // add text over nodes
          .nodeCanvasObjectMode(node => highlightNodes.has(node) ? 'after' : 'after') // this format required for correctly displaying styles and text for both highlighted and non-highlighted states
          .nodeAutoColorBy((node: any) => {
            if (this.colorGroup === 'metatype') {
              return `${node.metatype_name}`
            } else if (this.colorGroup === 'data source') {
              return `${node.data_source_id}`
            } else {
              return `${node.metatype_name}` // default to metatype
            }
          }) // auto color node
          .linkColor(() => '#363642') // link color
          .linkCurvature('curvature')
          .linkDirectionalArrowLength(5) // use directional arrows for links and set size of link
          .linkDirectionalArrowRelPos(1) // size of directional arrow
          .linkCanvasObjectMode(() => 'after')
          .linkCanvasObject((link: any, ctx, globalScale) => {
            if (this.edgeLabelFlag) {
              const MAX_FONT_SIZE = 24/globalScale;
              const LABEL_NODE_MARGIN = this.canvas!.nodeRelSize() * 1.6;

              const start = link.source;
              const end = link.target;

              // ignore unbound links
              if (typeof start !== 'object' || typeof end !== 'object') return;

              // calculate label positioning
              let coordinates = {x: 0, y: 0};
              coordinates.x = start.x + (end.x - start.x) / 2;
              coordinates.y = start.y + (end.y - start.y) / 2;

              // handle curved links
              if (+link.curvature > 0) {
                coordinates = this.getQuadraticXY(
                    0.5,
                    start.x,
                    start.y,
                    link.__controlPoints[0],
                    link.__controlPoints[1],
                    end.x,
                    end.y
                );
              }

              const relLink = { x: end.x - start.x, y: end.y - start.y };

              let maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2;

              let textAngle = Math.atan2(relLink.y, relLink.x);
              // maintain label vertical orientation for legibility
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

              const label = `${link.name}`; // link label

              // need to make maxTextLength positive for self-referencing links
              if (link.source.id === link.target.id) {
                if (maxTextLength < 0) {
                  maxTextLength = maxTextLength * -1;
                }
              }

              // estimate fontSize to fit in link length
              ctx.font = '1px Sans-Serif';
              const fontSize = Math.min(MAX_FONT_SIZE, maxTextLength / ctx.measureText(label).width);
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

              // draw text label (with background rect)
              ctx.save();
              ctx.translate(coordinates.x, coordinates.y);
              ctx.rotate(textAngle);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.fillRect(- bckgDimensions[0] / 2, - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'black';
              ctx.fillText(label, 0, 0);
              ctx.restore();
            }
          }) // add labels to links/edges
          .linkLabel((link: any) => `${link.name} : ${link.id}`)
          .onNodeHover((node: any) => {
            highlightNodes.clear();
            highlightLinks.clear();

            if (node) {
              highlightNodes.add(node);
              if (node.neighbors) node.neighbors.forEach((neighbor: any) => highlightNodes.add(neighbor));
              if (node.links) node.links.forEach((link: any) => highlightLinks.add(link));
            }

            hoverNode = node || null;
          })
          .onNodeClick((node: any) => {

            this.loading = true

            // base case, first click on a node ever
            if (this.currentClick === 0) {
              this.previousClick = Date.now();
              this.currentClick = Date.now();
              this.firstClickID = node.id;
              void this.showNodeProperties(node);
            } else {

              // handle double click check
              this.currentClick = Date.now();

              if (this.currentClick - this.previousClick < this.doubleClickTimer) {

                // handle node ids
                if (node.id !== this.firstClickID) {
                  // different nodes, go to one click behavior
                  this.previousClick = Date.now();
                  this.firstClickID = node.id;
                  void this.showNodeProperties(node);
                } else {
                  // handle double click
                  this.previousClick = Date.now();
                  this.firstClickID = node.id;
                  this.doubleClickFlag = true;
                }

              } else {
                // clicks too far apart, reset and perform single click
                this.previousClick = Date.now();
                this.firstClickID = node.id;
                void this.showNodeProperties(node);
              }

            }

          })
          .onNodeDrag((dragNode: any) => {
            // overwrite the default behavior of resetting the graph zoom
            this.canvas?.onEngineStop(() => true)

            // add edge sensing logic if enabled
            if (this.edgeFlag) {
              this.dragSourceNode = dragNode;
              for (const node of this.graph.nodes) {
                if (dragNode === node) {
                  continue;
                }
                // close enough: snap onto node as target for suggested link
                if (!this.interimLink && this.nodeDistance(dragNode, node) < this.snapInDistance) {
                  this.setInterimLink(this.dragSourceNode, node);
                }
                // close enough to other node: snap over to other node as target for suggested link
                if (this.interimLink && node !== this.interimLink.target && this.nodeDistance(dragNode, node) < this.snapInDistance) {
                  this.removeLink(this.interimLink);
                  this.setInterimLink(this.dragSourceNode, node);
                }
              }
              // far away enough: snap out of the current target node
              if (this.interimLink && this.nodeDistance(dragNode, this.interimLink.target) > this.snapOutDistance) {
                this.removeInterimLinkWithoutAddingIt();
              }
            }
          })
          .onNodeDragEnd(() => {

            // bring up create edge dialog if edgeFlag enabled and intermLink is populated
            if (this.edgeFlag && this.interimLink) {

              // grab metatype relationship pairs
              this.$client.listMetatypeRelationshipPairs(this.containerID, {
                name: undefined,
                limit: 1000,
                offset: 0,
                originID: this.interimLink.source.metatype_id,
                destinationID: this.interimLink.target.metatype_id,
                ontologyVersion: this.$store.getters.currentOntologyVersionID,
                metatypeID: undefined,
                loadRelationships: false,
              })
                  .then((pairs: MetatypeRelationshipPairT[]) => {
                    this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
                  })
                  .catch(e => this.errorMessage = e)

              this.newEdgeDialog = true
            }
          })
          .nodeRelSize(NODE_R)
          .onLinkClick((link: any) => {
            this.currentEdgeID = link.id;
            this.edgeDialog = true;
            this.$client.retrieveEdge(this.containerID, link.id).then((edge) => {
              this.getEdgeInfo(edge)
            });
          })
          .onLinkHover(link => {
            highlightNodes.clear();
            highlightLinks.clear();

            if (link) {
              highlightLinks.add(link);
              highlightNodes.add(link.source);
              highlightNodes.add(link.target);
            }
          })
          .linkWidth(link => highlightLinks.has(link) ? 5 : 1) // bold highlighted links
          .linkDirectionalParticles(3) // number of particles to display on highlighted links
          .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 6 : 0) // show particles only when link is highlighted
          .linkDirectionalParticleColor(() => 'cyan') // set link particle color
          .linkDirectionalParticleSpeed(.015) // set link particle speed


      this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat

      this.canvas.d3Force('charge') // applies some distance between nodes
      this.canvas.d3Force('link') // apply link force for spacing
      this.canvas.d3Force('x', this.forceX) // apply forces to keep nodes centered
      this.canvas.d3Force('y', this.forceY)


      this.canvas.cooldownTime(this.graphRenderTime) // set to a small render time
      this.canvas.onEngineStop(() => {
        this.buildNodeColorLegend()
        this.canvas!.zoomToFit(this.zoomToFitDuration, 10, () => {
          this.loading = false
          return true
        })
      }) // zoom to fit all nodes (if possible) in screen and determine the node color legend

    }

  }

  async openNodeGraph(node: any) {
    this.loading = true

    this.colorGroupFilter = []
    this.selectedFilters = []
    this.filterOnGroupItem(null)
    // make new graph call for the selected node
    // retrieve a graph of depth 1 around the selected node
    const newGraph = await this.$client.submitGraphQLQuery(this.containerID, { query:
          `{
          graph(
              root_node: "${node.id}"
              depth: "1"
          ){
              destination_id
              destination_metatype_id
              destination_metatype_name
              destination_data_source
              destination_created_at
              destination_modified_at
              destination_properties
          }
      }`
    })

    // if an error is found, skip remainder of function
    if (newGraph.error || !newGraph.data) {
      return
    }

    // add the origin node, selecting only the base properties
    const graphResults: NodeT[] = [{
      id: node.id,
      original_id: node.original_id,
      container_id: node.container_id,
      data_source_id: node.data_source_id,
      metatype_id: node.metatype_id,
      metatype_name: node.metatype_name,
      created_at: node.created_at,
      modified_at: node.modified_at,
      properties: node.properties
    }]

    // deduplicate the return (e.g. remove any nodes returned more than once)
    const uniqueResults = Array.from(new Map(newGraph.data.graph.map((node: any) => [node.destination_id, node])).values());

    // map returned results to the format expected by loadResults
    uniqueResults.forEach((node: any) => {
      const newNode: NodeT = {
        id: node.destination_id,
        original_id: node.destination_properties.id ? node.destination_properties.id : null,
        container_id: this.containerID,
        data_source_id: node.destination_data_source,
        metatype_id: node.destination_metatype_id,
        metatype_name: node.destination_metatype_name,
        created_at: node.destination_created_at,
        modified_at: node.destination_modified_at,
        properties: node.destination_properties
      }

      // add destination nodes to the origin node
      graphResults.push(newNode)
    });

    // reset graph structure
    this.graph = {
      nodes: [],
      links: []
    }

    // load newly created graph
    this.loadResults(graphResults)
    // Reset Graph may be used to return to original results
  }

  showNodeProperties(node: any) {
    // only take single click action if the gap between previous and current clicks sufficiently far apart
    this.delay(this.doubleClickTimer).then(() => {
      if (this.doubleClickFlag) {

        // on double click, center and zoom
        this.centerGraphOnNode(node)
        this.doubleClickFlag = false

      } else {
        // ensure properties panel is already expanded (and only properties)
        this.openPanels = [0]
        // ensure properties panel has solid opacity
        this.opacity = 1.0

        this.getInfo(node)
        this.selectedNode = node
        this.nodeDialog = true;
      }

      this.loading = false
    })
  }

  showEdgeProperties(edge: any) {
    this.openPanels = [0]
    this.opacity = 1.0
    this.getEdgeInfo(edge)
    this.selectedEdge = edge
    this.edgeDialog = true;
  }

  listRelationshipKeys(relationshipID: string) {
    this.$client.listMetatypeRelationshipKeys(this.containerID, relationshipID).then((keys) => {
      this.relationshipKeys = keys;
    })
  }

  centerGraphOnNode(node: any) {
    this.canvas!.centerAt(node.x, node.y, 1000);
    this.canvas!.zoom(5, 1500)
  }

  buildNodeColorLegend() {
    const nodeColorsMap = new Map();

    this.graph.nodes.forEach((node: NodeT) => {
      // check if color has already been set, and then append name if so
      const colorEntry = nodeColorsMap.get(node.color)
      const dataSourceName = `${this.datasources[node.data_source_id]?.name} (${node.data_source_id})`

      if (colorEntry) {

        if (this.colorGroup === 'data source') {
          // if the data source name is not already part of colorEntry, add it
          const match = colorEntry.search(`${this.datasources[node.data_source_id]?.name} \\(${node.data_source_id}\\)`)

          if (match === -1) {
            nodeColorsMap.set(node.color, `${colorEntry}, ${dataSourceName}`);
          }

        } else { // default to 'metatype'
          // if the metatype name is not already part of colorEntry, add it
          const match = colorEntry.search(node.metatype_name)

          if (match === -1) {
            nodeColorsMap.set(node.color, `${colorEntry}, ${node.metatype_name}`);
          }
        }


      } else {
        if (this.colorGroup === 'data source') {
          nodeColorsMap.set(node.color, dataSourceName);
        } else {
          nodeColorsMap.set(node.color, node.metatype_name);
        }

      }
    });

    // reset the array for new queries
    this.nodeColorsArray = [];

    // convert to an array so that Vue2 can iterate over it reactively
    nodeColorsMap.forEach((value: string, key: string) => {
      this.nodeColorsArray.push({'key': key, 'value': value});
    });
  }

  updateColorGroup(groupSelection: string) {
    this.colorGroupFilter = []
    this.selectedFilters = []
    this.filterOnGroupItem(null)

    this.loading = true

    // delete the node color to force recoloring the node
    this.graph.nodes.forEach((node: any) => {
      delete node.color
    });

    if (groupSelection === 'metatype') {
      this.canvas!.nodeAutoColorBy((node: any) => `${node.metatype_name}`) // auto color by metatype
    } else if (groupSelection === 'data source') {
      this.canvas!.nodeAutoColorBy((node: any) => `${node.data_source_id}`) // auto color by data source
    }

    this.colorGroupFilter = []
    this.filterOnGroupItem(null)

  }

  // used for calculating where to place a link label on curved links
  // returns an object {x: number, y: number}
  getQuadraticXY(t: number, sx: number, sy: number, cp1x: number, cp1y: number, ex: number, ey: number) {
    return {
      x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cp1x + t * t * ex,
      y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cp1y + t * t * ey,
    };
  }

  delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  resetGraph() {
    if (this.graph.nodes.length > 0) {

      if (this.canvas != null) {

        this.graph = {
          nodes: [],
          links: []
        }

        this.loadResults()
        this.updateColorGroup(this.colorGroup)

        this.colorGroupFilter = []
        this.selectedFilters = []
        this.filterOnGroupItem(null)
      }
    }
  }

  updateGraphZoom() {
    if (this.canvas != null) {

      this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat
      this.canvas.minZoom(this.minZoom)
      this.canvas.maxZoom(this.maxZoom)
    }
  }

  resetGraphZoom() {
    if (this.canvas != null) {

      this.minZoom = 0.5
      this.maxZoom = 125

      this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat
      this.canvas.minZoom(this.minZoom)
      this.canvas.maxZoom(this.maxZoom)
    }
  }

  getInfo(data: NodeT) {
    this.currentNodeInfo = {
      id: data.id,
      container_id: this.containerID,
      data_source_id: data.data_source_id,
      metatype: {
        id: data.metatype_id,
        name: data.metatype_name
      },
      properties: data.properties,
      created_at: data.created_at.split(' (')[0], // remove timezone text if present
      modified_at: data.modified_at.split(' (')[0] // remove timezone text if present
    }
  }

  getEdgeInfo(data: EdgeT) {
    this.currentEdgeInfo = {
      id: data.id,
      container_id: this.containerID,
      data_source_id: data.data_source_id,
      origin_id: data.origin_id,
      destination_id: data.destination_id,
      metatype_relationship: {
        name: data.metatype_relationship_name,
        id: data.relationship_id
      },
      properties: data.properties,
      created_at: data.created_at.split(' (')[0], // remove timezone text if present
      modified_at: data.modified_at.split(' (')[0] // remove timezone text if present
    }
  }

  nodeDistance(node1: NodeT, node2: NodeT) {
    return Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));
  }

  setInterimLink(source: any, target: any) {
    const linkId = this.linkIdCounter ++;
    this.interimLink = { id: linkId, source: source, target: target, name: 'link_' + linkId };
    this.graph.links.push(this.interimLink);
    this.canvas?.graphData(this.graph)
  }

  removeLink(link: any) {
    this.graph.links.splice(this.graph.links.indexOf(link), 1);
  }

  removeInterimLinkWithoutAddingIt() {
    this.removeLink(this.interimLink);
    this.interimLink = null;
    this.canvas?.graphData(this.graph)
  }

  setDataSource(dataSource: any) {
    this.selectedDataSource = dataSource
  }

  createNode(node: any) {

    this.loading = true

    const refinedNode = {
      id: node.id,
      container_id: node.container_id,
      data_source_id: node.data_source_id,
      metatype_id: node.metatype_id,
      metatype_name: node.metatype_name,
      created_at: node.created_at,
      modified_at: node.modified_at,
      properties: node.properties,
      original_id: null,
      collapsed: false,
      childLinks: [],
      new_node: true // extra property to be used for highlighting newly created nodes
    }

    this.graph.nodes.push(refinedNode)
    this.canvas?.graphData(this.graph)

    // returns an array with one object. returned node will have graph position
    const nodeInGraph = this.graph.nodes.filter((graphNode: any) => {
      return graphNode.id === refinedNode.id
    })

    // wait for the graph to refresh and then zoom and center on the new node
    setTimeout(() => {
      this.centerGraphOnNode(nodeInGraph[0])
      this.loading = false
    }, this.graphRenderTime + this.zoomToFitDuration)

  }

  deleteNode(node: any) {
    this.nodeDialog = false;
    this.$client.deleteNode(this.containerID, node.id)
        .then((result) => {
          if(result) {
            this.graph.nodes = this.graph.nodes.filter((g: any) => g.id !== node.id)
            this.canvas?.graphData(this.graph)
          }
        })
        .catch(e => this.errorMessage = e)
  }

  deleteEdge(edgeID: string) {
    this.edgeDialog = false;
    this.$client.deleteEdge(this.containerID, edgeID)
        .then((result) => {
          if(result) {
            this.graph.links = this.graph.links.filter((g: any) => g.id !== edgeID)
            this.canvas?.graphData(this.graph)
          }
        })
        .catch(e => this.errorMessage = e)
  }

  closeEdgeDialog() {
    // if the user cancels or clicks outside the create edge dialog box, remove the temporary edge
    this.removeInterimLinkWithoutAddingIt()
    this.newEdgeDialog = false
  }

  createEdge() {
    this.setEdgeProperties()
    this.$client.createEdge(this.containerID,
        {
          "container_id": this.containerID,
          "data_source_id": this.selectedDataSource.id,
          "origin_id": this.interimLink.source.id,
          "destination_id": this.interimLink.target.id,
          "relationship_pair_id": this.selectedRelationshipPair.id,
          "properties": this.edgeProperties,
        }
    )
        .then((results: EdgeT[]) => {
          // update graph edge with returned edge and reheat the graph

          const refinedEdge = {
            collapsed: false,
            id: results[0].id,
            name: this.selectedRelationshipPair.relationship_name,
            nodePairId: this.interimLink.source.id + '_' + this.interimLink.target.id,
            source: this.interimLink.source,
            target: this.interimLink.target
          }
          this.graph.links.push(refinedEdge)
          this.canvas?.graphData(this.graph)

          this.newEdgeDialog = false
        })
        .catch(e => this.errorMessage = e)
  }

  setEdgeProperties() {
    const properties: { [key: string]: any } = {};
    this.relationshipKeys.forEach((key: MetatypeRelationshipKeyT) => {
      if (String(key.default_value).toLowerCase() === "true") {
        key.default_value = true
      } else if (String(key.default_value).toLowerCase() === "false") {
        key.default_value = false
      } else if (String(key.default_value) === "" || String(key.default_value) === "null") {
        key.default_value = undefined
      }

      if (key.data_type === "number") {
        key.default_value = parseInt(key.default_value as string, 10)
      }

      if (key.data_type === "float") {
        key.default_value = parseFloat(key.default_value as string)
      }

      properties[key.property_name] = key.default_value
    })
    this.edgeProperties = properties
  }

}
</script>

<style lang="scss" scoped>
.height-full {
  height: 100% !important;
}

$list-item-icon-margin: 0 px;

</style>