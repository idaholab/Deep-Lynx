<template>
  <div>
    <v-card style="width: 100%; height: 100%; position: relative">
      <v-toolbar style="z-index: 4;" flat color="lightgray" >
        <v-toolbar-title>{{$t('graph.graph')}}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-progress-circular indeterminate v-if="loading"  style="margin-right: 16px"></v-progress-circular>
        <div class="mr-5">
          <v-btn
            @click="resetGraph"
            :disabled="graph.nodes.length < 1"
          >
            {{$t('graph.reset')}}
          </v-btn>
        </div>

        <!-- Help Menu -->
        <v-menu
          v-model="showHelp"
          :close-on-content-click="false"
          :nudge-left="25"
          :nudge-bottom="25"
          left
          attach
        >
          <template v-slot:activator="{on, attrs}">
            <v-tooltip bottom>
              <template v-slot:activator="{ on: onTooltip }">

                <v-btn
                  color="primary"
                  dark
                  fab
                  small
                  v-bind="attrs" v-on="{...on, ...onTooltip}"
                >
                  <v-icon >{{info}}</v-icon>
                </v-btn>

              </template>
              <span>{{$t('graph.help')}}</span>
            </v-tooltip>
          </template>
          <v-card max-width="364" :style="'justify-content: left; overflow-y: scroll; overflow-x: hidden; max-height: ' + graphHeight + 'px;'">

            <v-card-text class="text-h5 font-weight-bold">
              {{$t('help.graphHover')}}
            </v-card-text>

            <v-list style="padding: 0">
              <v-subheader>{{$t('graph.display')}}</v-subheader>
              <v-divider></v-divider>

              <v-tooltip bottom nudge-top=135>
                <template v-slot:activator="{ on, attrs }">
                  <v-list-item v-bind="attrs" v-on="on">

                    <v-slider
                      v-model="chargeStrength"
                      thumb-label
                      :max="maxChargeStrength"
                      :min="minChargeStrength"
                      :label="$t('graph.nodeDistance')"
                      step=1
                    ></v-slider>

                  </v-list-item>
                </template>
                <span>{{$t('help.nodeDistance')}}</span>
              </v-tooltip>

              <v-tooltip bottom nudge-top=135>
                <template v-slot:activator="{ on, attrs }">
                  <v-list-item v-bind="attrs" v-on="on">
                    <v-slider
                      v-model="linkDistance"
                      thumb-label
                      :max="maxLinkDistance"
                      :min="minLinkDistance"
                      :label="$t('graph.edgeDistance')"
                      step=1
                    ></v-slider>
                  </v-list-item>
                </template>
                <span>{{$t('help.edgeDistance')}}</span>
              </v-tooltip>

              <v-list-item>
                <v-list-item-action style="margin-top: 0">
                  <v-btn
                    @click="applyGraphForce"
                    :disabled="graph.nodes.length < 1"
                    color="primary"
                    dark
                  >
                    {{$t('graph.update')}}
                  </v-btn>
                </v-list-item-action>
              </v-list-item>

            </v-list>

            <v-list style="padding: 0">
              <v-subheader>{{$t('graph.zoom')}}</v-subheader>
              <v-divider></v-divider>
              <v-list-item>
                <v-slider
                  v-model="minZoom"
                  thumb-label
                  :max="maxMinZoom < maxZoom ? maxMinZoom : maxZoom"
                  :min="minMinZoom"
                  :label="$t('graph.minZoom')"
                  step=0.1
                ></v-slider>
              </v-list-item>
              <v-list-item>
                <v-slider
                  v-model="maxZoom"
                  thumb-label
                  :max="maxMaxZoom"
                  :min="minMaxZoom > minZoom ? minMaxZoom : minZoom"
                  :label="$t('graph.maxZoom')"
                  step=1
                ></v-slider>
              </v-list-item>

              <v-row>
                <v-col cols="6">
                  <v-list-item>
                    <v-list-item-action style="margin-top: 0">
                      <v-btn
                        @click="updateGraphZoom"
                        :disabled="graph.nodes.length < 1"
                        color="primary"
                        dark
                      >
                      {{$t('graph.updateZoom')}}
                      </v-btn>
                    </v-list-item-action>
                  </v-list-item>
                </v-col>
                <v-col cols="6">
                  <v-list-item>
                    <v-list-item-action style="margin-top: 0">
                      <v-btn
                          @click="resetGraphZoom"
                          :disabled="graph.nodes.length < 1"
                          color="primary"
                          dark
                      >
                      {{$t('graph.resetZoom')}}
                      </v-btn>
                    </v-list-item-action>
                  </v-list-item>
                </v-col>
              </v-row>

            </v-list>

              <v-subheader>{{$t('graph.controls')}}</v-subheader>
              <v-spacer></v-spacer>

            <v-expand-transition>
              <div v-show="showHints">
                <v-divider></v-divider>

                <v-card-text>
                  - {{$t('help.graphPan')}} <br>
                  - {{$t('help.graphZoom')}}<br>
                  - {{$t('help.graphCenter')}}<br>
                  - {{$t('help.graphNearby')}}<br>
                  - {{$t('help.nodeInfo')}}<br>
                  - {{$t('help.edgeInfo')}}<br>
                  - {{$t('help.graphMove')}}<br>
                  - {{$t('help.graphHighlight')}}<br><br>
                  {{$t('help.graphLabels')}}<br>
                  {{$t('help.graphColor')}}
                </v-card-text>
              </div>
            </v-expand-transition>
          </v-card>
        </v-menu>
      </v-toolbar>

      <GraphItemCard
        v-if="nodeDialog || edgeDialog"
        :graphItem="selectedGraphItem"
        :containerID="containerID"
        :type="nodeDialog ? 'node' : 'edge'"
        :rawDataEnabled="results.rawMetadataEnabled"
        :maxHeight="graphHeight"
        :pointInTime="pointInTime"
        @resetNode="resetNode"
        @deleteGraphItem="deleteGraphItem"
      />

      <error-banner :message="errorMessage" style="z-index: 9; width: fit-content; margin-left: 480px; margin-top: 6px;" @closeAlert="errorMessage = ''"></error-banner>
      <!-- Graph edit tools -->
      <v-speed-dial
        v-model="editFab"
        top
        left
        direction="bottom"
        absolute
        style="margin-top: 62px; z-index: 3"
        open-on-hover
        transition="slide-x-transition"
      >
        <template v-slot:activator>
          <v-tooltip v-model="edgeFlag" right>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-model="editFab"
                :color="edgeFlag ? 'purple' : 'primary'"
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
              {{$t('help.dragNode')}} <br/>
              {{$t('help.releaseNode')}}
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
          <span>{{$t('nodes.create')}}</span>
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
          <span>{{$t('graph.toggleEdge')}}</span>
        </v-tooltip>
      </v-speed-dial>

      <!-- Graph Search -->
      <v-speed-dial
        top
        left
        direction="right"
        absolute
        style="margin-top: 62px; margin-left: 100px; z-index: 3"
        transition="slide-x-transition"
      >
        <template v-slot:activator>

          <v-tooltip bottom>
            <template v-slot:activator="{ on: onTooltip }">

              <v-btn
                color="primary"
                dark
                v-on="onTooltip"
              >
                <v-icon>
                  mdi-magnify
                </v-icon>
              </v-btn>

            </template>
            <span>{{$t('general.search')}}</span>
          </v-tooltip>
        </template>

        <v-text-field
          style="width: max-content; margin-top: 35px"
          background-color="white"
          :label="$t('general.search')"
          :placeholder="$t('general.typeToSearch')"
          outlined
          v-model="searchInput"
          autofocus
          clearable
          append-icon="mdi-arrow-right-drop-circle"
          @click:append="findNode(searchInput)"
          v-on:keyup.enter="findNode(searchInput)"
        ></v-text-field>

      </v-speed-dial>

      <!-- Time Slider/Picker -->
      <v-speed-dial
        top
        left
        direction="right"
        absolute
        style="margin-top: 62px; margin-left: 204px; z-index: 1"
        transition="slide-x-transition"
      >
        <template v-slot:activator>

          <v-tooltip bottom>
            <template v-slot:activator="{ on: onTooltip }">

              <v-btn
                color="primary"
                dark
                v-on="onTooltip"
              >
                <v-icon>
                  mdi-calendar-clock
                </v-icon>
              </v-btn>

            </template>
            <span>{{$t('graph.pointInTime')}}</span>
          </v-tooltip>
        </template>

        <v-card
          @click.native.stop
          v-model="timeSlider"
          flat
          style="position: absolute; margin-left: -950px; margin-top: 560px;"
        >
          <v-date-picker
            v-if="!datePickerSet"
            v-model="pointInTimeString"
            :max="now.toISOString().split('T')[0]"
            :min="then.toISOString().split('T')[0]"
            @change="datePickerUpdate"
            @click.native.stop
            style="height: 460px;"
          ></v-date-picker>

          <v-btn
            v-if="datePickerSet"
            @click="datePickerSet = !datePickerSet"
            color="primary"
            dark
            fab
            small
            style="position: absolute;
              margin-top: -10px;
              z-index: 1;
              margin-left: 35px;"
          >
            <v-icon>
              mdi-arrow-left
            </v-icon>
          </v-btn>

          <v-time-picker
            v-if="datePickerSet"
            v-model="datePickerTime"
            use-seconds
            ampm-in-title
            @click.native.stop
            @input="timePickerUpdate"
            width="335"
            style="margin-left: 45px"
          ></v-time-picker>
        </v-card>

        <v-slider
          v-model="pointInTime"
          :max="now.getTime()"
          :min="then.getTime()"
          step=1000
          :label="new Date(pointInTime).toLocaleString()"
          :hint="$t('query.earliestDate') + then.toLocaleString()"
          persistent-hint
          style="width: 600px; margin-top: 20px"
          @click.stop
        ></v-slider>

        <v-btn
          dark
          color="primary"
          @click="setPointInTime"
        >
          GO
        </v-btn>

      </v-speed-dial>

      <!-- Color Legend and Filter -->
      <v-navigation-drawer
        v-model="showColorLegend"
        absolute
        right
        permanent
        :mini-variant.sync="mini"
        :style="'margin-top: 64px; width: fit-content; max-height:' + graphHeight + 'px'"
      >
        <v-list-item class="px-2">

          <v-btn
            icon
            @click.stop="mini = !mini"
          >
            <v-icon v-if="!mini">mdi-chevron-right</v-icon>
            <v-icon v-else>mdi-chevron-left</v-icon>
          </v-btn>

          <v-list-item-title>{{$t('graph.legend')}}</v-list-item-title>
        </v-list-item>

        <v-list-item>
          <v-switch
            hide-details
            class="d-flex justify-center"
            v-model="edgeLabelFlag"
            :label="$t('graph.toggleEdgeLabels')"
            v-if="!mini"
          ></v-switch>
        </v-list-item>

        <v-list-item>
          <v-switch
            hide-details
            class="d-flex justify-center"
            v-model="nodeLabelFlag"
            :label="$t('graph.extendNodeLabels')"
            v-if="!mini"
          ></v-switch>
        </v-list-item>

        <v-list-item>
          <v-select
            v-model="colorGroup"
            :items="colorGroupOptions"
            @input="updateColorGroup"
            hide-selected
            :hint="$t('graph.groupNodeColor')"
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
              @click="filterOnGroupItem(Number(i))"
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

      <div ref="forcegraph" ></div>
    </v-card>
    <!-- End Graph Component -->

    <!-- New Graph dialog -->
    <v-dialog
      v-model="newGraphDialog"
      width="30%"
    >
      <v-card v-if="newGraphNode !== null">

        <v-card-title>
        {{$t('nodes.selected')}}: {{newGraphNode.id}} ({{newGraphNode.metatype_name}})
        </v-card-title>

        <v-text-field
          class="px-6"
          :label="$t('graph.depth')"
          v-model="newGraphDepth"
          :hint="$t('graph.nthDepth')"
          :rules="[newGraphDepthRule]"
          maxlength="2"
        ></v-text-field>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="newGraphDialog = false" >{{$t("general.cancel")}}</v-btn>
          <v-btn color="primary" text @click="openNodeGraph(newGraphNode, newGraphDepth)">Go</v-btn>
        </v-card-actions>

      </v-card>
    </v-dialog>

    <!-- New Node dialog -->
    <v-dialog
      v-model="newNodeDialog"
      width="50%"
      @click:outside="resetNodeDialog"
    >
      <v-card class="pt-1 pb-3 px-2">
        <SelectDataSource
          :key="dataSourceKey"
          :containerID="containerID"
          @selected="setDataSource">
        </SelectDataSource>
        <div v-if="(selectedDataSource !== null)">
          <v-divider></v-divider>
          <create-node-card
            :dataSourceID="selectedDataSource.id"
            :containerID="containerID"
            :disabled="!selectedDataSource.active || selectedDataSource.archived"
            @nodeCreated="createNode"
            @closed="resetNodeDialog"
          />
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
              <span class="headline text-h3">{{$t("edges.create")}}</span>
            </v-card-title>

            <v-col cols="12">
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    :value="interimLink.source.metatype_name"
                    :label="$t('edges.originClass')"
                    readonly
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    :value="interimLink.target.metatype_name"
                    :label="$t('edges.destinationClass')"
                    readonly
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row v-if="relationshipPairs.length === 0">
                <div class="pa-6 pb-0">
                  <p>{{ $t('errors.noValidRelationships') }}</p>
                </div>
              </v-row>

              <div v-else>
                <v-row>
                  <v-col cols="6">
                    <v-text-field
                      :value="interimLink.source.id"
                      :label="$t('edges.originID')"
                      readonly
                    ></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      :value="interimLink.target.id"
                      :label="$t('edges.destinationID')"
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
                  :label="$t('relationships.choose')"
                  return-object
                  :rules="[validateRequired]"
                  required
                  @change="listRelationshipKeys"
                >
                  <template slot="append-outer"><info-tooltip :message="$t('help.relationshipSearch')"></info-tooltip></template>

                  <template slot="item" slot-scope="$data">
                    {{$data.item.origin_metatype_name}} - {{$data.item.relationship_name}} - {{$data.item.destination_metatype_name}}
                  </template>

                </v-select>

                <div v-if="selectedRelationshipPair">
                  <v-col :cols="12" v-if="relationshipKeys && relationshipKeys.length !== 0">
                    <v-checkbox
                      v-model="optional"
                      :label="$t('general.showOptional')"
                    />
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

                <SelectDataSource
                  @selected="setDataSource"
                  :dataSourceID="interimLink.source.data_source_id"
                  :containerID="containerID">
                </SelectDataSource>
              </div>
            </v-col>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" text @click="closeEdgeDialog()" >{{$t("general.cancel")}}</v-btn>
              <v-btn v-if="relationshipPairs.length > 0" color="primary" text :disabled="!validEdge" @click="createEdge()">{{$t("general.save")}}</v-btn>
            </v-card-actions>
          </v-form>
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import SelectDataSource from "@/components/dataSources/SelectDataSource.vue";
import CreateNodeCard from "@/components/data/CreateNodeCard.vue";
import GraphItemCard from "./GraphItemCard.vue";
import {ResultSet} from "@/components/queryBuilder/QueryBuilder.vue";
import Vue, {PropType} from 'vue';
import {NodeT, DataSourceT, MetatypeRelationshipPairT, MetatypeRelationshipKeyT, EdgeT, OntologyVersionT} from "@/api/types";
import ForceGraph, {ForceGraphInstance} from 'force-graph';
import {forceX, forceY, forceManyBody} from 'd3-force';
import {mdiInformation} from "@mdi/js";

interface GraphViewerModel {
  query: string | null
  optional: boolean;
  currentEdgeID: string;
  loading: boolean;
  graphHeight: number;
  forceGraph: ForceGraphInstance | null;
  canvas: ForceGraphInstance | null;
  graph: { nodes: any[], links: any[] };
  graphRenderTime: number; // time in ms to spend rendering the graph on changes
  zoomToFitDuration: number; // time in ms to spend on zoom transition after graph changes
  nodesById: {[key: string]: any};
  nodeColorsArray: {key: string, value: string}[];
  colorGroup: string;
  colorGroupOptions: string[];
  colorGroupFilter: number[];
  selectedFilters: any[];
  errorMessage: string;
  dataSources: Map<string, DataSourceT>;
  nodeDialog: boolean;
  edgeDialog: boolean;
  previousClick: number;
  currentClick: number;
  firstClickID: number;
  doubleClickFlag: boolean;
  doubleClickTimer: number;
  info: string;
  showHelp: boolean;
  showHints: boolean;
  showColorLegend: boolean;
  mini: boolean;
  minZoom: number;
  maxMinZoom: number;
  minMinZoom: number;
  maxZoom: number;
  maxMaxZoom: number;
  minMaxZoom: number;
  minChargeStrength: number;
  chargeStrength: number;
  maxChargeStrength: number;
  minLinkDistance: number;
  linkDistance: number;
  maxLinkDistance: number;
  editFab: boolean;
  newNodeDialog: boolean;
  newEdgeDialog: boolean;
  searchInput: string;
  edgeFlag: boolean;
  dragSourceNode: any;
  interimLink: any;
  linkIdCounter: number;
  snapInDistance: number;
  snapOutDistance: number;
  selectedDataSource: DataSourceT | null;
  relationshipPairs: MetatypeRelationshipPairT[];
  selectedRelationshipPair: MetatypeRelationshipPairT | null;
  relationshipKeys: MetatypeRelationshipKeyT[];
  validEdge: boolean;
  edgeLabelFlag: boolean;
  booleanOptions: boolean[];
  edgeProperties: {[key: string]: any};
  nodeLabelFlag: boolean;
  blankGraphFlag: boolean;
  newGraphDialog: boolean;
  newGraphDepth: number;
  newGraphNode: NodeT | null;
  now: Date;
  then: Date;
  timeSlider: boolean;
  datePickerSet: boolean;
  datePickerTime: string | null;
  pointInTime: number;
  pointInTimeString: string;
  selectedLink: any;
  selectedNodeID: string | null;
  selectedEdgeID: string | null;
  selectedGraphItem: NodeT | EdgeT | {[key: string]: any};
  dataSourceKey: number;
}

export default Vue.extend({
  name: 'GraphViewer',

  components: {
    SelectDataSource,
    CreateNodeCard,
    GraphItemCard
  },

  props: {
    containerID: {type: String, required: true},
    results: {type: Object as PropType<ResultSet>, required: true},
  },

  data: (): GraphViewerModel => ({
    query: null,
    optional: false,
    currentEdgeID: '',
    loading: false,
    graphHeight: 0,
    forceGraph: ForceGraph(),
    canvas: null,
    graph: { nodes: [], links: [] },
    graphRenderTime: 2000, // time in ms to spend rendering the graph on changes
    zoomToFitDuration: 1000, // time in ms to spend on zoom transition after graph changes
    nodesById: {},
    nodeColorsArray: [],
    colorGroup: 'class',
    colorGroupOptions: ['class', 'data source'],
    colorGroupFilter: [],
    selectedFilters: [],
    errorMessage: '',
    dataSources: new Map(),
    nodeDialog: false,
    edgeDialog: false,
    previousClick: 0,
    currentClick: 0,
    firstClickID: 0,
    doubleClickFlag: false,
    doubleClickTimer: 500,
    info: mdiInformation,
    showHelp: false,
    showHints: true,
    showColorLegend: true,
    mini: false,
    minZoom: 0.2,
    maxMinZoom: 100,
    minMinZoom: 0.01,
    maxZoom: 125,
    maxMaxZoom: 1000,
    minMaxZoom: 10,
    minChargeStrength: -200,
    chargeStrength: -80,
    maxChargeStrength: 0,
    minLinkDistance: 20,
    linkDistance: 30,
    maxLinkDistance: 120,
    editFab: false,
    newNodeDialog: false,
    newEdgeDialog: false,
    searchInput: '',
    edgeFlag: false, // edge creation disabled by default
    dragSourceNode: null,
    interimLink: null,
    linkIdCounter: 0,
    snapInDistance: 35,
    snapOutDistance: 40,
    selectedDataSource: null,
    relationshipPairs: [],
    selectedRelationshipPair: null,
    relationshipKeys: [],
    validEdge: false,
    edgeLabelFlag: false,
    booleanOptions: [true, false],
    edgeProperties: {},
    nodeLabelFlag: false,
    blankGraphFlag: false,
    newGraphDialog: false,
    newGraphDepth: 1,
    newGraphNode: null,
    now: new Date(),
    then: new Date(),
    timeSlider: false,
    datePickerSet: false,
    datePickerTime: null,
    pointInTime: new Date().getTime(),
    pointInTimeString: (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString().substring(0, 10),
    selectedLink: null,
    selectedNodeID: null,
    selectedEdgeID: null,
    selectedGraphItem: {},
    dataSourceKey: 0,
  }),

  watch: {
    results: {handler: 'graphUpdate', immediate: true}
  },

  methods: {
    graphUpdate() {
      // reset graph
      this.graph = {
        nodes: [],
        links: []
      }
      this.forceGraph = ForceGraph()

      // ensure that components are loaded before creating the graph
      // this is particularly an issue when no results are returned
      this.$nextTick(() => {
        this.loadResults();
      });

    },
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
        // remove any parts of the string in brackets or parentheses
        let colorList = this.nodeColorsArray[i].value.replace(/(\[\d+])/g, "").trim()
        colorList = colorList.replace(/( \(.+\))/g, "").trim()

        // if the nodeColorsArray value is a string with multiple values separated by spaces, separate out the values
        // there should be two spaces between metatype and data source names after the regex replacements
        const colorValues = colorList.split('  ')

        colorValues.forEach((value: string) => {
          if (this.colorGroup === 'data source') {
            // retrieve corresponding data source id
            let datasourceID = ''

            this.dataSources.forEach((datasource: DataSourceT, key: string) => {
              if (datasource.name === value) {
                datasourceID = key
              }
            });

            filterList.push(datasourceID) // leave as a string for matching against node.data_source_id
          } else {
            // default to behavior for metatype filtering
            filterList.push(value.trim())
          }
        });

      });

      this.graph.nodes.forEach((node: NodeT) => {
        // use a nodes "collapsed" property to determine whether to hide it
        if (this.colorGroup === 'data source') {

          node.collapsed = filterList.indexOf(node.data_source_id) === -1;
        } else { // default filter on metatype
          node.collapsed = filterList.indexOf(node.metatype_name) === -1;
        }
      });

      // if no filters are selected, show all nodes
      if (this.colorGroupFilter.length === 0) {
        this.graph.nodes.forEach((node: NodeT) => {
          node.collapsed = false
        })
      }
    },
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

        this.graph.nodes = this.results.nodes.map((node: any) => {
          nodeIDs.push(node.id)

          node.collapsed = false
          node.childLinks = []
          return node
        });

        // save the query for future use
        this.query = (this.results.query) ? this.results.query : null
      }

      // fetch the edges
      // returns all edges in the container where either the origin or destination id is in the provided list of node IDs
      if (nodeIDs.length > 0) {
        this.blankGraphFlag = false

        const query = {
          pointInTime: new Date(this.pointInTime).toISOString(),
          limit: this.results.limit && this.results.limit > 10000 ? this.results.limit : 10000 // if greater than 10000, override default
        }

        edges = await this.$client.listEdgesForNodeIDs(this.containerID, nodeIDs, query)

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
      } else {
        // we need to load a blank graph to allow editing
        // mark the flag as true to accomodate a blank graph
        this.blankGraphFlag = true

        // push a simple node to force the graph to render
        this.graph.nodes.push({
          "id": "test"
        })
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

      const graphElem = this.$refs.forcegraph as HTMLElement;

      if (graphElem) {
        this.canvas = this.forceGraph!(graphElem)
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
              this.openNodeGraphDialog(node as NodeT)
            }) // open node properties on right click
            .nodeCanvasObject((node: any, ctx, globalScale) => {
              const MAX_FONT_SIZE = 24/globalScale; // ranges from 1 zoomed in to ~30 zoomed out

              // don't draw the full node if it is marked as collapsed
              if (!node.collapsed) {

                if (highlightNodes.has(node)) {
                  // add ring just for highlighted nodes
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
                  ctx.fill();
                } else if (this.selectedNodeID && node.id === this.selectedNodeID) { // add ring for newly created or selected nodes
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
                  ctx.fillStyle = 'yellow';
                  ctx.fill();
                }

                // then apply normal colors and labels (must happen after highlight styles have been created)
                const radius = 10

                ctx.beginPath()
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
                ctx.fillStyle = node.color;
                ctx.fill()

                const nodeName = node.properties.name ? node.properties.name : node.id;
                const label = `${nodeName}` as string;
                node.label = label // used for search

                const fontSize = Math.min(MAX_FONT_SIZE, 10); // set a max font size with a constant value

                ctx.font = `${fontSize}px Sans-Serif`;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#101020';

                let maxWidth: number | undefined = radius * 2 - 2
                if (this.nodeLabelFlag) maxWidth = undefined
                ctx.fillText(label, node.x!, node.y!, maxWidth); // keep text inside the bounds of the node circle
              }

            }) // add text over nodes
            .nodeCanvasObjectMode(node => highlightNodes.has(node) ? 'after' : 'after') // this format required for correctly displaying styles and text for both highlighted and non-highlighted states
            .nodeAutoColorBy((node: any) => {
              if (this.colorGroup === 'class') {
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
              this.selectedLink = null

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

                // freeze all other graph elements
                this.canvas?.cooldownTime(0)

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
            .onNodeDragEnd(async () => {

              // bring up create edge dialog if edgeFlag enabled and intermLink is populated
              if (this.edgeFlag && this.interimLink) {

                // grab metatype relationship pairs

                // provide the origin metatype to use its corresponding ontology version if available
                const originMetatype = await this.$client.retrieveMetatype(this.containerID, this.interimLink.source.metatype_id);

                this.$client.listMetatypeRelationshipPairs(this.containerID, {
                  name: undefined,
                  limit: 1000,
                  offset: 0,
                  originID: this.interimLink.source.metatype_id,
                  destinationID: this.interimLink.target.metatype_id,
                  ontologyVersion: originMetatype.ontology_version || this.$store.getters.currentOntologyVersionID,
                  metatypeID: undefined,
                  loadRelationships: false,
                })
                    .then((pairs: MetatypeRelationshipPairT[] | number) => {
                      this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
                    })
                    .catch(e => this.errorMessage = e)

                this.newEdgeDialog = true
              }

              // reset cooldown time to unfreeze the graph
              this.canvas?.cooldownTime(15000) // 15000 default
            })
            .nodeRelSize(NODE_R)
            .onLinkClick((link: any) => {
              // close node dialog if open
              this.nodeDialog = false;
              this.selectedNodeID = null;

              this.selectedLink = link;

              this.currentEdgeID = link.id;
              this.$client.retrieveEdge(this.containerID, link.id).then((edge) => {
                this.showEdgeProperties(edge);
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
            .linkWidth((link: any) => {
              let linkWidth = 1;
              if (this.selectedLink && link.id === this.selectedLink.id) {
                linkWidth = 5;
              }

              if (highlightLinks.has(link)) {
                linkWidth = 5;
              }
              return linkWidth;
            }) // bold highlighted links
            .linkDirectionalParticles(2) // number of particles to display on highlighted links
            .linkDirectionalParticleWidth((link: any) => {
              let linkParticleWidth = 0;
              if (this.selectedLink && link.id === this.selectedLink.id) {
                linkParticleWidth = 6;
              }

              if (highlightLinks.has(link)) {
                linkParticleWidth = 6;
              }
              return linkParticleWidth;
            }) // show particles only when link is highlighted
            .linkDirectionalParticleColor(() => 'cyan') // set link particle color
            .linkDirectionalParticleSpeed(.015) // set link particle speed
            .onBackgroundClick(() => {
              this.nodeDialog = false // hide node and edge dialog on background clicks
              this.edgeDialog = false
              this.selectedLink = null
              this.selectedNodeID = null
            })
        // handle potential empty results
        if (this.blankGraphFlag) {
          this.graph.nodes = []
          this.loading = false
        }

        this.graphHeight = graphElem.clientHeight;

        this.applyGraphForce()

        this.canvas.cooldownTime(this.graphRenderTime) // set to a small render time
        this.canvas.onEngineStop(() => {
          this.buildNodeColorLegend()
          this.canvas!.zoomToFit(this.zoomToFitDuration, 10, () => {
            this.loading = false
            return true
          })
        }) // zoom to fit all nodes (if possible) in screen and determine the node color legend
      }

    },
    applyGraphForce() {
      const manyBody = forceManyBody()
      manyBody.strength(this.chargeStrength)

      this.canvas!.graphData(this.graph) // this call is necessary to force the canvas to reheat

      this.canvas!.d3Force('charge', manyBody) // applies some distance between nodes
      this.canvas!.d3Force('link')!.distance(this.linkDistance) // apply link force for spacing
      this.canvas!.d3Force('x', forceX()) // apply forces to keep nodes centered
      this.canvas!.d3Force('y', forceY())
    },
    openNodeGraphDialog(node: NodeT) {
      this.newGraphNode = node
      this.newGraphDialog = true
    },
    async openNodeGraph(node: NodeT, depth = 1) {
      this.loading = true

      this.resetFilters()
      // make new graph call for the selected node
      // retrieve a graph of depth 1 around the selected node
      const newGraph = await this.$client.submitGraphQLQuery(this.containerID, { query:
            `{
            graph(
                root_node: "${node.id}"
                depth: "${depth}"
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

      this.newGraphDialog = false

      // load newly created graph
      void this.loadResults(graphResults)
      // Reset Graph may be used to return to original results
    },
    showNodeProperties(node: NodeT) {
      // only take single click action if the gap between previous and current clicks sufficiently far apart
      this.delay(this.doubleClickTimer).then(async () => {
        if (this.doubleClickFlag) {

          // on double click, center and zoom
          this.centerGraphOnNode(node)
          this.doubleClickFlag = false

        } else {
          this.selectedNodeID = node.id
          this.selectedGraphItem = node;

          // minimize the legend
          this.mini = true;

          this.edgeDialog = false;
          this.nodeDialog = true;
        }

        this.loading = false
      })
    },
    showEdgeProperties(edge: EdgeT) {
      this.selectedEdgeID = edge.id;
      this.selectedGraphItem = edge;

      // minimize the legend
      this.mini = true;

      this.nodeDialog = false;
      this.edgeDialog = true;
    },
    listRelationshipKeys(pair: MetatypeRelationshipPairT) {
      this.$client.listMetatypeRelationshipKeys(this.containerID, pair.relationship_id!).then((keys) => {
        this.relationshipKeys = keys;
      })
    },
    centerGraphOnNode(node: any) {
      this.canvas!.centerAt(node.x, node.y, 1000);
      this.canvas!.zoom(5, 1500)
    },
    buildNodeColorLegend() {
      const nodeColorsMap = new Map();

      this.graph.nodes.forEach((node: NodeT) => {
        // check if color has already been set, and then append name if so
        let colorEntry = nodeColorsMap.get(node.color!)
        const dataSourceName = `${this.dataSources.get(node.data_source_id)?.name} (#${node.data_source_id})`

        if (colorEntry) {

          // create string of all current names and check if this name is present
          let names = ''
          colorEntry.forEach((colorObject: any) => {
            names += colorObject.name + ' '
          })

          if (this.colorGroup === 'data source') {
            // if the data source name is not already part of colorEntry, add it
            const match = names.search(`${this.dataSources.get(node.data_source_id)?.name} \\(#${node.data_source_id}\\)`)

            if (match === -1) {
              // add the new name and count for this color
              colorEntry[colorEntry.length] =
                {
                  name: node.metatype_name,
                  count: 0
                }

              nodeColorsMap.set(node.color, colorEntry)
            }

          } else { // default to 'metatype'
            // if the metatype name is not already part of colorEntry, add it
            const match = names.search(node.metatype_name)

            if (match === -1) {
              // add the new name and count for this color
              colorEntry[colorEntry.length] =
                {
                  name: node.metatype_name,
                  count: 0
                }

              nodeColorsMap.set(node.color, colorEntry)
            }
          }


        } else {
          if (this.colorGroup === 'data source') {
            nodeColorsMap.set(node.color, [
              {
                name: dataSourceName,
                count: 0
              }
            ]);
          } else {
            nodeColorsMap.set(node.color, [
              {
                name: node.metatype_name,
                count: 0
              }
            ]);
          }

        }

        // increment counter
        colorEntry = nodeColorsMap.get(node.color)
        if (this.colorGroup === 'data source') {
          const colorNode = colorEntry.filter((x: any) => (x.name === dataSourceName))[0]
          ++colorNode.count
        } else {
          const colorNode = colorEntry.filter((x: any) => (x.name === node.metatype_name))[0]
          ++colorNode.count
        }

      });

      // reset the array for new queries
      this.nodeColorsArray = [];

      // convert to an array so that Vue2 can iterate over it reactively
      nodeColorsMap.forEach((value: any, key: string) => {
        // loop through list in value to create a combined string of names and counts
        let legendEntry = ''
        value.forEach((colorObject: any) => {
          legendEntry = legendEntry.concat(colorObject.name, ' [', colorObject.count.toString(), '] ')
        })
        this.nodeColorsArray.push({'key': key, 'value': legendEntry});
      });
    },
    updateColorGroup(groupSelection: string) {
      this.resetFilters()

      this.loading = true

      // delete the node color to force recoloring the node
      this.graph.nodes.forEach((node: any) => {
        delete node.color
      });

      if (groupSelection === 'class') {
        this.canvas!.nodeAutoColorBy((node: any) => `${node.metatype_name}`) // auto color by metatype
      } else if (groupSelection === 'data source') {
        this.canvas!.nodeAutoColorBy((node: any) => `${node.data_source_id}`) // auto color by data source
      }

      this.resetFilters()
    },
    getQuadraticXY(t: number, sx: number, sy: number, cp1x: number, cp1y: number, ex: number, ey: number) {
      return {
        x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cp1x + t * t * ex,
        y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cp1y + t * t * ey,
      };
    },
    delay(time: number) {
      return new Promise(resolve => setTimeout(resolve, time));
    },
    resetGraph() {
      if (this.graph.nodes.length > 0) {

        if (this.canvas != null) {

          this.graph = {
            nodes: [],
            links: []
          }

          this.loadResults()
          this.updateColorGroup(this.colorGroup)

          this.resetFilters()
        }
      }
    },
    resetFilters() {
      this.colorGroupFilter = []
      this.selectedFilters = []
      this.filterOnGroupItem(null)
    },
    updateGraphZoom() {
      if (this.canvas != null) {

        this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat
        this.canvas.minZoom(this.minZoom)
        this.canvas.maxZoom(this.maxZoom)
      }
    },
    resetGraphZoom() {
      if (this.canvas != null) {

        this.minZoom = 0.5
        this.maxZoom = 125

        this.canvas.graphData(this.graph) // this call is necessary to force the canvas to reheat
        this.canvas.minZoom(this.minZoom)
        this.canvas.maxZoom(this.maxZoom)
      }
    },
    nodeDistance(node1: NodeT, node2: NodeT) {
      return Math.sqrt(Math.pow(node1.x! - node2.x!, 2) + Math.pow(node1.y! - node2.y!, 2));
    },
    setInterimLink(source: any, target: any) {
      const linkId = this.linkIdCounter ++;
      this.interimLink = { id: linkId, source: source, target: target, name: 'link_' + linkId };
      this.graph.links.push(this.interimLink);
      this.canvas?.graphData(this.graph)
    },
    removeLink(link: any) {
      this.graph.links.splice(this.graph.links.indexOf(link), 1);
    },
    removeInterimLinkWithoutAddingIt() {
      this.removeLink(this.interimLink);
      this.interimLink = null;
      this.canvas?.graphData(this.graph)
    },
    setDataSource(dataSource: any) {
      this.selectedDataSource = dataSource
    },
    resetNode(id: string) {
      this.selectedNodeID = id;
    },
    resetNodeDialog() {
      this.selectedDataSource = null;
      this.dataSourceKey += 1;
      this.newNodeDialog = false;
    },
    createNode(node: any) {
      this.newNodeDialog = false
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
        selected_node: true // extra property to be used for highlighting newly created nodes
      }

      this.graph.nodes.push(refinedNode)
      this.canvas?.graphData(this.graph)

      // rebuild legend
      this.buildNodeColorLegend()
      this.applyGraphForce()

      // returns an array with one object. returned node will have graph position
      const nodeInGraph = this.graph.nodes.filter((graphNode: any) => {
        return graphNode.id === refinedNode.id
      })

      // wait for the graph to refresh and then zoom and center on the new node
      setTimeout(() => {
        this.centerGraphOnNode(nodeInGraph[0])
        this.loading = false
      }, this.graphRenderTime + this.zoomToFitDuration)
    },
    deleteGraphItem(toDelete: {type: string, id: string}) {
      if (toDelete.type === 'node') {
        this.deleteNode(toDelete.id);
      } else if (toDelete.type === 'edge') {
        this.deleteEdge(toDelete.id);
      }
    },
    deleteNode(nodeID: string) {
      this.nodeDialog = false;
      this.$client.deleteNode(this.containerID, nodeID)
          .then((result) => {
            if(result) {
              this.graph.nodes = this.graph.nodes.filter((n: any) => n.id !== nodeID)
              // remove any connected edges to avoid errors
              this.graph.links = this.graph.links.filter((l: any) => {
                return l.source.id !== nodeID && l.target.id !== nodeID
              })
              this.canvas?.graphData(this.graph)
            }
          })
          .catch(e => this.errorMessage = e)
    },
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
    },
    closeEdgeDialog() {
      // if the user cancels or clicks outside the create edge dialog box, remove the temporary edge
      this.removeInterimLinkWithoutAddingIt()
      this.newEdgeDialog = false
    },
    createEdge() {
      this.setEdgeProperties()
      this.$client.createEdge(this.containerID,
          {
            "container_id": this.containerID,
            "data_source_id": this.selectedDataSource!.id,
            "origin_id": this.interimLink!.source.id,
            "destination_id": this.interimLink!.target.id,
            "relationship_pair_id": this.selectedRelationshipPair!.id,
            "properties": this.edgeProperties,
          }
      )
          .then((results: EdgeT[]) => {
            // update graph edge with returned edge and reheat the graph

            const refinedEdge = {
              collapsed: false,
              id: results[0].id,
              name: (this.selectedRelationshipPair) ? this.selectedRelationshipPair.relationship_name : this.$t('query.queryMissing') as string,
              nodePairId: this.interimLink!.source.id + '_' + this.interimLink!.target.id,
              source: this.interimLink!.source,
              target: this.interimLink!.target
            }
            this.graph.links.push(refinedEdge)
            this.canvas?.graphData(this.graph)

            this.newEdgeDialog = false
          })
          .catch(e => this.errorMessage = e)
    },
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
    },
    findNode(label: string) {
      // handle empty search
      if (label === '') {
        return
      }

      // perform case-insensitive searches
      label = label.toLowerCase()
      this.loading = true

      // first look for an exact match
      const searchNode = this.graph.nodes.filter((node: NodeT) => node.label.toLowerCase() === label)

      if (searchNode.length > 0) {
        // center on the new node
        setTimeout(() => {
          this.centerGraphOnNode(searchNode[0])
          this.loading = false
        }, this.zoomToFitDuration)

      } else {

        // attempt to find the first instance of a match that contains the input
        const partialMatch = this.graph.nodes.filter((node: NodeT) => node.label.toLowerCase().includes(label))

        if (partialMatch.length > 0) {
          // center on the new node
          setTimeout(() => {
            this.centerGraphOnNode(partialMatch[0])
            this.loading = false
          }, this.zoomToFitDuration)

        } else {
          this.loading = false
          this.errorMessage = `${this.$t('query.nodeContaining')}${label}${this.$t('query.labelNotFound')}`
        }

      }
    },
    setPointInTime() {
      this.loading = true
      this.datePickerSet = false
      const pointInTime = new Date(this.pointInTime).toISOString()

      // update the variables for the date and time pickers to ensure both the pickers and slider are consistent
      this.pointInTimeString = pointInTime.substring(0, 10)
      this.datePickerTime = pointInTime.substring(11, 19)


      // Add the current pointInTime to the query, resubmit, and redo graph results
      this.$client.submitGraphQLQuery(this.containerID, { query: this.query }, {pointInTime: pointInTime, rawMetadataEnabled: this.results.rawMetadataEnabled})
          .then((results: any) => {
            if(results.errors) {
              this.errorMessage = results.errors[0].message ?
                results.errors.map(function(result: any) { return result.message }).join(", ") : (results.errors as string[]).join(' ')
              return
            }

            // reset graph and filters
            this.graph = {
              nodes: [],
              links: []
            }
            this.resetFilters()

            this.loadResults(results.data.nodes)
          })
          .catch(e => {
            this.errorMessage = e
          })
          .finally(() => this.loading = false)
    },
    datePickerUpdate(date: string) {
      // update the selected date to this day at 00:00:00 and show the time picker
      // add 'T00:00' to force Date to assume a local time zone
      this.pointInTime = new Date(date + 'T00:00').getTime()
      this.datePickerSet = true
    },
    timePickerUpdate(time: string) {
      // update the selected time of the selected date
      const currentDate = new Date(this.pointInTime).toISOString().split('T')[0]
      this.pointInTime = new Date(currentDate + 'T' + time).getTime()
    },
    validateRequired(value: any) {
      return !!value || this.$t('validation.required');
    },
    newGraphDepthRule(value: string) {
      const pattern = /^\d+$/
      return pattern.test(value) || this.$t('validation.nan') as string
    },
  },

  async mounted() {
    // create a map of datasource IDs and names for reference by nodes
    const sources = await this.$client.listDataSources(this.containerID)

    for (const datasource of sources) {
      if (datasource.id !== undefined) {
        this.dataSources.set(datasource.id, datasource);
      }
    }

    // retrieve the earliest creation_date for all published ontology versions for this container
    const ontologyVersions = await this.$client.listOntologyVersions(this.containerID, {status: ['published', 'ready']})

    ontologyVersions.forEach((ontologyVersion: OntologyVersionT) => {
      const createdDate = new Date(ontologyVersion.created_at!)
      if (createdDate < this.then) this.then = createdDate
    });
  }
});
</script>

<style lang="scss" scoped>
.height-full {
  height: 100% !important;
}

$list-item-icon-margin: 0 px;

</style>