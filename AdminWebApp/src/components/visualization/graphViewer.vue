<template>
  <div>
    <!-- v-if="graph.nodes.length > 0" -->
    <v-card style="width: 100%; height: 100%; position: relative">
      <v-toolbar flat color="lightgray" > 
        <v-toolbar-title>Graph</v-toolbar-title>
        <v-spacer></v-spacer>
        <div class="mr-5">
          <v-btn
            @click="centerGraph"
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
      
                <!-- <v-btn
                  icon
                  @click="showHints = !showHints"
                >
                  <v-icon>{{ showHints ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn> -->
              </v-card-actions>
              <v-expand-transition>
              <div v-show="showHints">
                <v-divider></v-divider>
        
                <v-card-text>
                  Controls <br>
                  - Pan : Left click drag on open area of graph <br>
                  - Zoom : Mousewheel scroll <br>
                  - Center on node: Right click node <br>
                  - Focus on node and connections/Return to full graph: Double click node (only nodes with outgoing edges)<br>
                  - View node information: Left click node (hover to see metatype & ID)<br>
                  - Move node: Left click and drag node. Note that this will recenter the graph after a short period <br>
                  - Highlight node/edge and related nodes/edges: Hover over node or edge <br><br>
                  Node labels show the "name" property (if present) or else the node ID.<br>
                  Node color is automatically set based on metatype name.
                </v-card-text>
              </div>
            </v-expand-transition>
            </v-card>
          </v-menu>
      </v-toolbar>
      <div id="forcegraph" ref="forcegraph" ></div>
    </v-card>
    <!-- End Graph Component -->

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
        <!-- <v-card-title class="grey lighten-2">
          <span class="headline text-h3">Node Properties</span>
        </v-card-title> -->

        <!-- <json-view
          class="pt-4 px-4"
          :data="selectedNode"
          :maxDepth=4
          style="overflow-x: auto"
        /> -->

        <div class="mt-2 pt-3 px-5 pb-5 height-full">
          <h4 class="primary--text">{{$t('dataQuery.nodeInformation')}}</h4>
          <div v-if="currentNodeInfo !== null">
            <v-row>
              <v-col>
                <div><span class="text-overline">{{$t('dataQuery.nodeID')}}:</span> {{currentNodeInfo.id}}</div>
                <div><span class="text-overline">{{$t('dataQuery.nodeType')}}:</span> {{currentNodeInfo.metatype.name}}</div>
                <div><span class="text-overline">DataSource:</span> {{datasources[currentNodeInfo.data_source_id].name}} ({{currentNodeInfo.data_source_id}})</div>
                <div><span class="text-overline">Created At:</span> {{currentNodeInfo.created_at}}</div>
                <div><span class="text-overline">Modified At:</span> {{currentNodeInfo.modified_at}}</div>
                <v-expansion-panels multiple v-model="openPanels">
                  <v-expansion-panel>
                    <v-expansion-panel-header>
                      <div><span class="text-overline">{{$t('dataQuery.nodeProperties')}}:</span></div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <v-data-table
                          :items="currentNodeInfo.properties"
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
        </div>

      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import NodeFilesDialog from "@/components/data/nodeFilesDialog.vue";
import NodeTimeseriesDataTable from "@/components/data/nodeTimeseriesDataTable.vue";
import {Component, Prop, Watch, Vue} from "vue-property-decorator";
import {NodeT, DataSourceT} from "@/api/types";
import ForceGraph, {ForceGraphInstance} from 'force-graph';
import {forceManyBody} from 'd3-force';

import {ResultSet} from "@/components/queryBuilder/queryBuilder.vue";
import {mdiInformation} from "@mdi/js";

@Component({components: {NodeFilesDialog, NodeTimeseriesDataTable}})
export default class GraphViewer extends Vue {
  @Prop()
  readonly containerID!: string

  @Prop()
  readonly results!: ResultSet | null

  dialog = false
  currentNodeInfo: any = null
  expanded = []
  openPanels: number[] = [0]

  forceGraph = ForceGraph();
  canvas: ForceGraphInstance | null = null;

  chargeForce = forceManyBody();

  graph: any = {
    nodes: [],
    links: []
  }

  nodesById: any = {}

  datasources: {[key: string]: DataSourceT} = {}

  nodeDialog = false
  selectedNode: any
  opacity = 1.0

  previousClick = 0
  currentClick = 0
  firstClickID = 0
  doubleClickFlag = false
  doubleClickTimer = 500

  info = mdiInformation
  showHelp = false
  showHints = true

  minZoom = 0.5
  maxMinZoom = 100
  minMinZoom = 0.01

  maxZoom = 125
  maxMaxZoom = 1000
  minMaxZoom = 10

  // mounted() {
  //   this.loadResults();
  // }

  @Watch('results', {immediate: true})
  graphUpdate() {
    // reset graph
    this.graph = {
      nodes: [],
      links: []
    }
    // this.canvas = null
    this.forceGraph = ForceGraph()

    this.loadResults();
  }

  propertyHeaders() {
    return [
      {text: this.$t('dataQuery.name'), value: 'key'},
      {text: this.$t('dataQuery.value'), value: 'value'}
    ]
  }

  async loadResults() {
    const originalJSON = this.results
    const nodes: any = []
    const edges: any = []

    function extractNodes(originalJSON: any) {
      for (let i = 0; i < originalJSON.length; i++) {
        const newObject = {
          data: originalJSON[i],
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
                  target: item.id,
                  name: item.incoming_edges[i].relationship.name
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
                  target: item.outgoing_edges[i].destination_node.id,
                  name: item.outgoing_edges[i].relationship.name
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

    this.graph.nodes = nodes.filter((thing: any, index: any) => {
      return index === nodes.findIndex((obj: any) => {
        obj.id = obj.data.id; // create id at root level for graph
        obj.data.obj_properties = JSON.parse(obj.data.raw_properties);
        obj.collapsed = false; // set nodes to be expanded by default
        obj.childLinks = []; // create an empty array for storing child links for use in collapsible graph
        return obj.id === thing.id;
      });
    });
    
    extractEdges(originalJSON)

    // create list of edge IDs in the links array of graph
    const edgesInGraph: any = {}

    if (edges) {
      edges.forEach((edge: any) => {
        // if both nodes of an edge are not included in graph, skip edge
        const aIndex = this.graph.nodes.findIndex((node: any) => { return node.id === edge.data.source});
        const bIndex = this.graph.nodes.findIndex((node: any) => { return node.id === edge.data.target});

        if (aIndex === -1 || bIndex === -1) {
          return
        }

        // if edge has already been added to links, skip
        if (edgesInGraph[edge.data.id]) {
          return
        }

        edgesInGraph[edge.data.id] = edge.data.id
        this.graph.links.push({
          source: edge.data.source,
          target: edge.data.target,
          name: edge.data.name,
          id: edge.data.id,
          collapsed: false // flag for showing/hiding links. set all to visible by default
        })
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
      if (aIndex !== -1) {
        !a.neighbors && (a.neighbors = []);
        if (b !== undefined) a.neighbors.push(b);

        !a.links && (a.links = []);
        a.links.push(link);
      }

      if (bIndex !== -1) {
        !b.neighbors && (b.neighbors = []);
        if (a !== undefined) b.neighbors.push(a);

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
      const sources = await this.$client.listDataSources(this.graph.nodes[0].data?.container_id)

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
          return `${node.data.metatype.name} : ${node.data.id}`
        }) // set node label when hovering
        .onNodeRightClick(node => {
          this.canvas!.centerAt(node.x, node.y, 1000);
          this.canvas!.zoom(4, 2000)
        }) // center on node on click
        .nodeCanvasObject((node: any, ctx, globalScale) => {

          if (highlightNodes.has(node)) {
            // add ring just for highlighted nodes
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
            ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
            ctx.fill();
          }

          // then apply normal colors and labels (must happen after highlight styles have been created)

          ctx.beginPath()
          ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI)
          ctx.fillStyle = node.color;
          ctx.fill()

          const nodeName = node.data.obj_properties.name ? node.data.obj_properties.name : node.data.id;
          const label = `${nodeName}` as string;
          const fontSize = 24/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#101020';
          ctx.fillText(label, node.x!, node.y!);

        }) // add text over nodes
        .nodeCanvasObjectMode(node => highlightNodes.has(node) ? 'after' : 'after') // this format required for correctly displaying styles and text for both highlighted and non-highlighted states
        .nodeAutoColorBy((node: any) => `${node.data.metatype.name}`) // auto color by metatype
        .linkColor(() => '#363642') // link color
        .linkCurvature('curvature')
        .linkDirectionalArrowLength(5) // use directional arrows for links and set size of link
        .linkDirectionalArrowRelPos(1) // size of directional arrow
        .linkCanvasObjectMode(() => 'after')
        .linkCanvasObject((link: any, ctx, globalScale) => {
          const MAX_FONT_SIZE = 24/globalScale;
          const LABEL_NODE_MARGIN = this.canvas!.nodeRelSize() * 2;

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
          ctx.fillStyle = 'darkgrey';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }) // add labels to links/edges
        .linkLabel((link: any) => `${link.id}`)
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
          
          // base case, first click on a node ever
          if (this.currentClick === 0) {
            this.previousClick = Date.now();
            this.currentClick = Date.now();
            this.firstClickID = node.data.id;
            void this.showNodeProperties(node);
          } else {

            // handle double click check
            this.currentClick = Date.now();

            if (this.currentClick - this.previousClick < this.doubleClickTimer) {

              // handle node ids
              if (node.data.id !== this.firstClickID) {
                // different nodes, go to one click behavior
                this.previousClick = Date.now();
                this.firstClickID = node.data.id;
                void this.showNodeProperties(node);
              } else {
                // handle double click
                this.previousClick = Date.now();
                this.firstClickID = node.data.id;
                this.doubleClickFlag = true;

                void this.toggleCollapsedNodes(node);
              }
              
            } else {
              // clicks too far apart, reset and perform single click
              this.previousClick = Date.now();
              this.firstClickID = node.data.id;
              void this.showNodeProperties(node);
            }

          }

        })
        .onNodeDrag(() => this.canvas?.d3Force('charge', this.chargeForce.strength(0)))
        .nodeRelSize(NODE_R)
        .onLinkHover(link => {
          highlightNodes.clear();
          highlightLinks.clear();

          if (link) {
            highlightLinks.add(link);
            highlightNodes.add(link.source);
            highlightNodes.add(link.target);
          }
        })
        // .autoPauseRedraw(false) // keep redrawing after engine has stopped // not sure why this would be necessary
        .linkWidth(link => highlightLinks.has(link) ? 5 : 1) // bold highlighted links
        .linkDirectionalParticles(4) // number of particles to display on highlighted links
        .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 4 : 0); // show particles only when link is highlighted

    
      this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat
      this.canvas.d3Force('charge', this.chargeForce.strength(-15))
      this.canvas.cooldownTime(1000) // set to a small render time
      this.canvas.d3Force('link')!.distance(60) // manually set length of links
      this.canvas.onEngineStop(() => this.canvas!.zoomToFit(1000, 10, () => true));
    }

  }

  showNodeProperties(node: any) {
    // only take sigle click action if the gap between previous and current clicks sufficiently far apart
    this.delay(this.doubleClickTimer).then(() => {
      if (this.doubleClickFlag) {
        this.doubleClickFlag = false
      } else {
        // ensure properties panel is already expanded (and only properties)
        this.openPanels = [0]
        // ensure properties panel has solid opacity
        this.opacity = 1.0

        this.getInfo(node.data)
        this.selectedNode = node.data
        this.nodeDialog = true;
      }
    })
  }

  toggleCollapsedNodes(node: any) {
    // expand/collapse nodes
    if (node.childLinks.length) {
      node.collapsed = !node.collapsed; // toggle collapse state
      this.canvas!.graphData(this.getPrunedTree(node));
    }
  }

  // since we don't work in a structure with one root node, we can only update around the node selected
  getPrunedTree(rootNode: any) {
    const parentThis = this;
    const rootNodeId = rootNode.id;

    const visibleNodes: any = [];
    const visibleLinks: any = [];

    // if node is collapsed, return only it and all connected links and nodes
    // otherwise return the full graph
    if (rootNode.collapsed) {
      visibleNodes.push(rootNode);

      (function traverseTree(node: any = rootNode) {

        for (const childNode of node.childLinks) {

          let target;
          if (typeof(childNode) === 'object') {
            target = childNode.target;
          } else {
            target = parentThis.nodesById[childNode.target];
          }

          // add link
          visibleLinks.push(childNode);

          // ensure we don't follow links to the rootNode or self-referencing links
          if (target.id !== rootNodeId && target.id !== node.id) {

            // add node
            visibleNodes.push(target);
          
            traverseTree(target);
          }
        }

      })();
    } else {
      return this.graph;
    }

    return { nodes: visibleNodes, links: visibleLinks };
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

  centerGraph() {
    if (this.graph.nodes.length > 0) {

      if (this.canvas != null) {

        this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat
        this.canvas.d3Force('charge', this.chargeForce.strength(0))
        this.canvas.cooldownTime(1000) // set to a small render time
        this.canvas.onEngineStop(() => this.canvas!.zoomToFit(1000, 10, () => true)); // after 1 s, zoom to the center in 1s showing all nodes on the canvas
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
        id: data.metatype.id,
        name: data.metatype.name
      },
      properties: data.properties.filter(prop => prop.value !== "null"),
      created_at: data.created_at.split(' (')[0], // remove timezone text if present
      modified_at: data.modified_at.split(' (')[0] // remove timezone text if present
    }
  }

}
</script>

<style lang="scss" scoped>
.height-full {
  height: 100% !important;
}

</style>