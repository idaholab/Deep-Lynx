<template>
    <v-dialog v-model="dialog" fullscreen hide-overlay transition="dialog-bottom-transition" persistent no-click-animation>
        <template v-slot:activator="{on}">
            <v-icon v-if="icon" small class="mr-2" v-on="on">mdi-eye</v-icon>
        </template>

        <TimeseriesAnnotationDialog
            :dialog.sync="createAnnotation"
            :x="annotationX"
            :y="annotationY"
            :z="annotationZ"
            @createAnnotation="createPlotlyAnnotation"
        />

        <v-card id="dialog">
            <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
            <success-banner :message="successMessage"></success-banner>
            <v-toolbar dark color="secondary" flat tile v-observe-visibility="loadPage">
                <v-btn icon dark @click="closeDialog">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
                <v-toolbar-title>{{ $t('timeseries.view') }}</v-toolbar-title>
                <v-spacer></v-spacer>
            </v-toolbar>

            <v-row class="mt-2">
                <v-col :cols="3">
                    <v-card class="pa-4 ml-3" style="height: 100%">
                        <v-progress-linear v-if="indexesLoading" indeterminate></v-progress-linear>
                        <v-switch
                            hide-details
                            class="d-flex justify-center mt-0 mb-3 pt-0"
                            v-model="timeseriesFlag"
                            :label="timeseriesFlag ? $t('timeseries.timestamp') : $t('timeseries.index')"
                            :disabled="streamActive"
                        />

                        <v-form ref="searchForm" v-model="validSearch" lazy-validation>
                            <div v-show="timeseriesFlag">
                                <div class="d-block">
                                    <label for="startDate" style="padding-right: 4px">{{$t('general.start')}}: </label
                                    ><input type="text" :placeholder="$t('timeseries.selectDate')" id="startDate" />
                                </div>
                                <div class="d-block">
                                    <label for="endDate" style="padding-right: 11px">{{$t('general.end')}}: </label
                                    ><input type="text" :placeholder="$t('timeseries.selectDate')" id="endDate" />
                                </div>
                            </div>

                            <v-text-field
                                v-show="!timeseriesFlag"
                                v-model.number="startIndex"
                                type="number"
                                :rules="[validateNumber]"
                                :label="$t('timeseries.startIndex')"
                            />

                            <v-text-field
                                v-show="!timeseriesFlag"
                                v-model.number="endIndex"
                                type="number"
                                :rules="[validateNumber]"
                                :label="$t('timeseries.endIndex')"
                            />

                            <v-text-field
                                class="pt-5"
                                v-model.number="defaultPlotLimit"
                                type="number"
                                :rules="[validatePositive, validateNumber]"
                                :label="$t('general.limit')"
                                :hint="$t('timeseries.limitHint')"
                            />

                            <v-row>
                                <v-col :cols="runType !== '--' && !timeseriesFlag ? 6 : 8">
                                    <v-select v-model="runType" :items="runTypes" :hint="$t('timeseries.replayOrStream')" persistent-hint />
                                </v-col>

                                <v-col v-if="runType !== '--' && !timeseriesFlag" :cols="3">
                                    <v-text-field v-model.number="replayRecordSize" type="number" :rules="[validateNumber]" :label="$t('timeseries.recordsPer')" />
                                </v-col>

                                <v-col :cols="runType !== '--' && !timeseriesFlag ? 3 : 4">
                                    <v-text-field
                                        v-if="runType !== '--'"
                                        v-model.number="replayStreamInterval"
                                        type="number"
                                        :rules="[validateNumber]"
                                        :label="$t('timeseries.interval')"
                                        suffix="s"
                                    />
                                </v-col>
                            </v-row>
                        </v-form>

                        <v-card-actions class="mt-2">
                            <v-btn v-if="!streamActive" color="primary" @click="submitSearch">{{ $t('general.search') }}</v-btn>
                            <v-btn v-else color="primary" @click="clearIntervals">{{ $t('timeseries.stopStream') }}</v-btn>
                            <v-spacer />
                            <v-progress-linear
                                v-if="streamActive && runType !== 'Live Stream'"
                                :value="streamEntireProgress"
                                color="primary"
                                class="mx-4"
                                height="25"
                                style="max-width: 150px"
                            >
                                <template v-slot:default="{value}">
                                    <strong>{{ Math.ceil(value) }}%</strong>
                                </template>
                            </v-progress-linear>
                            <v-progress-circular v-if="streamActive" :value="streamProgress" color="primary" />
                        </v-card-actions>
                    </v-card>
                </v-col>

                <v-col :cols="3">
                    <v-card class="pa-4" style="height: 100%">
                        <v-progress-linear v-if="dataSourceLoading" indeterminate></v-progress-linear>
                        <v-select v-model="chartType" :items="chartTypes" :hint="$t('timeseries.chartType')" persistent-hint @change="updatePlot(true)" />

                        <v-select
                            v-if="chartType === 'heatmap'"
                            v-model="colorScale"
                            :items="colorScales"
                            :hint="$t('timeseries.colorScale')"
                            persistent-hint
                            @change="updatePlot(true)"
                        />

                        <v-autocomplete
                            v-model="selectedDataSources"
                            :items="dataSources"
                            item-text="name"
                            :hint="$t('dataSources.selected')"
                            persistent-hint
                            return-object
                            multiple
                            chips
                            deletable-chips
                            @change="adjustColumnNames"
                        />

                        <ExploratoryDataAnalysisDialog
                            v-if="Object.keys(results).length > 0"
                            :selectedDataSources="selectedDataSources"
                            :results="results"
                            :dataSourceShapes="dataSourceShapes"
                        />
                    </v-card>
                </v-col>

                <v-col :cols="6">
                    <v-card class="pa-4 mr-3" style="height: 100%">
                        <v-progress-linear v-if="columnsLoading" indeterminate></v-progress-linear>
                        <v-data-table
                            v-if="selectedDataSources.length > 0"
                            :headers="columnHeaders"
                            :items="selectedColumns"
                            :items-per-page="10"
                            :footer-props="{'items-per-page-options': [10, 20, 50]}"
                            fixed-header
                            dense
                        >
                            <template v-slot:top v-if="(['line', 'markers', 'line and markers', 'bar'].includes(chartType))">
                                <v-toolbar flat color="white">
                                    <v-spacer></v-spacer>
                                    <v-btn color="primary" @click="toggleSelectY">
                                        <span v-if="ySelected === true">{{$t("timeseries.deselectAllYvals")}}</span>
                                        <span v-if="ySelected === false">{{$t("timeseries.selectAllYvals")}}</span>
                                    </v-btn>   
                                </v-toolbar>
                            </template>

                            <template v-slot:item.x="{item}">
                                <v-simple-checkbox v-if="chartType === 'scatter 3D'" v-model="item.x" />
                                <v-radio-group v-else v-model="selectedXColumn" @change="columnXChange(item.uniqueName)">
                                    <v-radio v-model="item.uniqueName" />
                                </v-radio-group>
                            </template>

                            <template v-slot:item.y="{item}">
                                <v-simple-checkbox v-model="item.y" :disabled="item.x" />
                            </template>

                            <template v-slot:header.z> <span v-if="chartType === 'bubble'">{{$t('general.size')}}</span><span v-else>Z</span> </template>
                            <template v-slot:item.z="{item}">
                                <v-simple-checkbox v-model="item.z" :disabled="item.x" />
                            </template>

                            <!-- Trace select for 3D scatter plots -->
                            <template v-slot:item.trace="{item}">
                                <v-select v-model="item.trace" :items="userTraces" multiple chips deletable-chips>
                                    <template v-slot:prepend-item>
                                        <v-btn @click="addTrace" color="primary" class="mx-3 elevation-0" style="width: calc(100% - 24px)"> {{$t('timeseries.addTrace')}} </v-btn>
                                        <v-divider class="mt-2"></v-divider>
                                    </template>
                                </v-select>
                            </template>
                        </v-data-table>
                    </v-card>
                </v-col>
            </v-row>

            <v-row>
                <v-col :cols="12">
                    <v-card class="pa-4 mx-3">
                        <v-progress-linear v-if="chartLoading" indeterminate></v-progress-linear>
                        <div id="timeseriesPlot"></div>
                        <v-btn v-show="Object.keys(results).length > 0" color="primary" dark class="mx-3" @click="showChart = !showChart">
                            <v-icon v-if="showChart">mdi-table</v-icon> <v-icon v-else>mdi-arrow-up-drop-circle</v-icon>
                        </v-btn>

                        <v-btn v-show="Object.keys(results).length > 0" color="primary" dark class="mx-3" @click="downloadCSV">
                            <v-icon>mdi-download</v-icon>
                        </v-btn>

                        <div v-show="!showChart">
                            <v-data-table
                                v-if="dataSource"
                                :headers="headers"
                                :items="tableResults"
                                group-by="datasource"
                                show-group-by
                                :items-per-page="1000"
                                :footer-props="{'items-per-page-options': [1000, 5000, 10000]}"
                                class="mx-3 elevation-2"
                                fixed-header
                                :height="tableHeight"
                            >
                                <template v-if="timeseriesFlag" v-slot:[tablePrimaryTimestampName]="{item}">
                                    {{ new Date(item[primaryTimestampName]).toUTCString() }}
                                </template>
                            </v-data-table>
                        </div>
                        <span v-if="Object.keys(results).length === 0">{{$t('general.noResults')}}</span>
                    </v-card>
                </v-col>
            </v-row>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {DataSourceT, TimeseriesDataSourceConfig} from '@/api/types';
  import TimeseriesAnnotationDialog from '@/components/data/TimeseriesAnnotationDialog.vue';
  import Plotly, {Datum} from 'plotly.js-dist-min';
  import {json2csv} from 'json-2-csv';
  import flatpickr from 'flatpickr';
  import 'flatpickr/dist/flatpickr.min.css';
  import ExploratoryDataAnalysisDialog from '@/components/data/ExploratoryDataAnalysisDialog.vue';
  require('flatpickr/dist/themes/material_blue.css');

  type selectedColumn = {
    name: string;
    dataSource: string;
    uniqueName: string;
    type: string;
    x: boolean;
    y: boolean;
    z: boolean;
    trace?: any;
  };

  interface TimeseriesViewerDialogModel {
    dataSource: DataSourceT | null
    results: any
    tableResults: any[]
    selectedDataSources: DataSourceT[]
    dataSources: DataSourceT[]
    selectedColumns: selectedColumn[]
    annotationX: Datum
    annotationY: Datum
    annotationZ: Datum
    streamInterval?: number | undefined
    timeseriesReplayInterval?: number | undefined
    indexReplayInterval?: number | undefined
    liveStreamInterval?: number | undefined
    dataSourceShapes: Map<string, any>
    dialog: boolean
    errorMessage: string
    successMessage: string
    endDate: string
    startDate: string
    timeseriesFlag: boolean
    startIndex: number
    endIndex: number
    defaultPlotLimit: number
    tableHeight: number
    showChart: boolean
    chartType: string
    chartTypes: string[]
    colorScale: string
    colorScales: string[]
    selectedXColumn: string
    userTraces: string[]
    validSearch: boolean
    createAnnotation: boolean
    runTypes: string[]
    runType: string
    replayStreamInterval: number
    streamActive: boolean
    streamProgress: number
    streamSeconds: number
    streamEntireProgress: number
    replayRecordSize: number
    columnsLoading: boolean
    dataSourceLoading: boolean
    indexesLoading: boolean
    chartLoading: boolean
    pageLoaded: boolean
    ySelected: boolean
  }

  export default Vue.extend ({
    name: 'TimeseriesViewerDialog',

    components: { ExploratoryDataAnalysisDialog, TimeseriesAnnotationDialog },

    props: {
      containerID: {type: String, required: true},
      dataSourceID: {type: String, required: false},
      icon: {type: Boolean, required: false, default: true},
    },

    data: (): TimeseriesViewerDialogModel => ({
      dataSource: null,
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      endDate: new Date().toISOString(),
      results: {},
      tableResults: [],
      selectedDataSources: [],
      dataSources: [],
      selectedColumns: [],
      annotationX: '',
      annotationY: '',
      annotationZ: null,
      streamInterval: undefined,
      timeseriesReplayInterval: undefined,
      indexReplayInterval: undefined,
      liveStreamInterval: undefined,
      dataSourceShapes: new Map(),
      dialog: false,
      errorMessage: '',
      successMessage: '',
      timeseriesFlag: true,
      startIndex: 0,
      endIndex: 10000,
      defaultPlotLimit: 10000,
      tableHeight: 500,
      showChart: true,
      chartType: 'line',
      chartTypes: ['line', 'markers', 'line and markers', 'bar', 'bubble', 'heatmap', 'scatter 3D'],
      colorScale: 'RdBu',
      colorScales: ['RdBu', 'YlOrRd', 'YlGnBu', 'Jet', 'Portland'],
      selectedXColumn: '',
      userTraces: ['1'],
      validSearch: true,
      createAnnotation: false,
      runTypes: ['--', 'Replay', 'Live Stream'],
      runType: '--',
      replayStreamInterval: 10,
      streamActive: false,
      streamProgress: 0,
      streamSeconds: 0,
      streamEntireProgress: 0,
      replayRecordSize: 100,
      columnsLoading: false,
      dataSourceLoading: false,
      indexesLoading: false,
      chartLoading: false,
      pageLoaded: false,
      ySelected: true
    }),

    watch: {
        streamActive: {handler: 'streamActiveChange', immediate: true}
    },

    computed: {
      tablePrimaryTimestampName(): string {
          return `item.${this.primaryTimestampName}`;
      },
      primaryTimestampName(): string {
          let found: string | undefined = undefined;

          if (this.dataSource && (this.dataSource?.config as TimeseriesDataSourceConfig).columns) {
              found = (this.dataSource?.config as TimeseriesDataSourceConfig).columns.find((c) => c.is_primary_timestamp)?.column_name;
          }

          if (found) return found;

          return '';
      },
      headers() {
          let columns = [{text: this.$t('dataSources.dataSource'), value: 'datasource'}];
          const columnNames = this.selectedColumns
              .filter((c) => c.x || c.y || c.z)
              .map((c) => {
                  return {
                      text: c.name,
                      value: c.name,
                      groupable: false,
                  };
              });
          columns = columns.concat(columnNames);
          return columns;
      },
      columnHeaders() {
          const columnNames = [
              {text: this.$t('general.columnName'), value: 'name', sortable: false},
              {text: this.$t('dataSources.dataSource'), value: 'dataSource', sortable: false},
              {text: this.$t('general.type'), value: 'type', sortable: false},
              {text: 'X', value: 'x', sortable: false},
          ];

          const yColumn = {text: 'Y', value: 'y', sortable: false};
          const zColumn = {text: 'Z', value: 'z', sortable: false};
          const traceColumn = {text: this.$t('timeseries.trace'), value: 'trace', sortable: false};

          if (['line', 'markers', 'line and markers', 'bar'].includes(this.chartType)) {
              columnNames.push(yColumn);
          } else if (this.chartType === 'bubble') {
              columnNames.push(yColumn);
              columnNames.push(zColumn);
          } else if (this.chartType === 'heatmap') {
              columnNames.push(zColumn);
          } else if (this.chartType === 'scatter 3D') {
              columnNames.push(yColumn);
              columnNames.push(zColumn);
              columnNames.push(traceColumn);
          }

          return columnNames;
      }
    },

    methods: {
      validatePositive(value: any): boolean | string {
        if (value < 0) return this.$t('validation.positive');
        return true;
      },
      validateNumber(value: any): boolean | string {
        const pattern = /^[0-9]+$/;
        return pattern.test(value) || this.$t('validation.nan');
      },
      streamActiveChange() {
          if (this.streamActive) {
              // progress should increase every second by 1/n where n is the interval in seconds between updates
              const increment = 100 / this.replayStreamInterval;

              this.streamInterval = setInterval(() => {
                  if (this.streamProgress >= 100) {
                      this.streamSeconds += this.replayStreamInterval;
                      return (this.streamProgress = increment);
                  }
                  this.streamProgress += increment;
              }, 1000);
          } else {
              clearInterval(this.streamInterval);
              this.streamProgress = 0;
              this.streamEntireProgress = 0;
              this.streamSeconds = 0;
          }
      },
      setDatePickers() {
          this.$router.replace(`/containers/${this.containerID}/data-sources/${this.dataSourceID}`)

          const startPickr = flatpickr('#startDate', {
              altInput: true,
              altFormat: 'F j, y h:i:S K',
              dateFormat: 'Z',
              enableTime: true,
              enableSeconds: true,
              allowInput: true,
          }) as flatpickr.Instance;

          (startPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => {
              this.startDate = dateStr;
          });
          (startPickr as flatpickr.Instance).setDate(this.startDate);

          const endPickr = flatpickr('#endDate', {
              altInput: true,
              altFormat: 'F j, y h:i:S K',
              dateFormat: 'Z',
              enableTime: true,
              enableSeconds: true,
              allowInput: true,
          });

          (endPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => {
              this.endDate = dateStr;
          });
          (endPickr as flatpickr.Instance).setDate(this.endDate);
      },
      columnXChange(uniqueName: string) {
          for (const column of this.selectedColumns) {
              if (column.uniqueName === uniqueName) {
                  column.x = true;
                  column.y = false;
                  column.z = false;
              } else {
                  column.x = false;
              }
          }
      },
      toggleSelectY() {
        this.ySelected = !this.ySelected
        this.selectedColumns.forEach(col => {
            if(!col.x) {
                col.y = this.ySelected
            } else {
                col.y = false
            }
        });
      },
      load() {
        this.dataSourceLoading = true;
          this.$client
              .retrieveDataSource(this.containerID, this.dataSourceID!)
              .then((result) => {
                  this.dataSource = result;
                  this.selectedDataSources = [this.dataSource];
                  this.adjustColumnNames();
              })
              .catch((e) => (this.errorMessage = e))
              .finally(() => this.dataSourceLoading = false);
      },
      loadDataSources() {
          this.dataSourceLoading = true;
          this.$client
              .listDataSources(this.containerID, false, true)
              .then((result) => {
                  this.dataSources = result;
              })
              .catch((e) => (this.errorMessage = e))
              .finally(() => this.dataSourceLoading = false);
      },
      addTrace() {
          const length = this.userTraces.length;
          this.userTraces.push(`${length + 1}`);
      },
      async createPlotlyAnnotation(annotation: any) {
          this.createAnnotation = false;

          if (!annotation) return;

          const plotlyDiv = document.getElementById('timeseriesPlot') as any;
          const currentLayout = plotlyDiv.layout;

          // default arrow direction to up, but change if specified
          let y = -40;
          if (annotation.direction === 'below') y = 40;

          if (annotation.z) {
              // scene.annotations used for 3D annotations
              if (!currentLayout.scene) currentLayout.scene = {};
              if (!currentLayout.scene.annotations) currentLayout.scene.annotations = [];

              currentLayout.scene.annotations.push({
                  x: annotation.x,
                  y: annotation.y,
                  z: annotation.z,
                  text: annotation.annotation,
                  showarrow: true,
                  arrowhead: 2,
                  ax: 0,
                  ay: y,
              });
          } else {
              if (!currentLayout.annotations) currentLayout.annotations = [];

              currentLayout.annotations.push({
                  x: annotation.x,
                  y: annotation.y,
                  xref: 'x',
                  yref: 'y',
                  text: annotation.annotation,
                  showarrow: true,
                  arrowhead: 2,
                  ax: 0,
                  ay: y,
              });
          }

          void Plotly.update(plotlyDiv, {}, currentLayout);
      },
      async updatePlot(styleUpdate = false) {
          const plotlyDiv = document.getElementById('timeseriesPlot');
          // remove chart to force proper refresh
          Plotly.purge(plotlyDiv!);

          if (Object.keys(this.results).length === 0) {
              return;
          }

          const plotData: Plotly.Data[] = [];
          this.tableResults = [];

          this.selectedDataSources.forEach((dataSource) => {
              let dataSourcePrimaryTimestamp = (dataSource.config as TimeseriesDataSourceConfig).columns.find((c) => c.is_primary_timestamp)?.column_name;
              const dataSourceColumns = this.selectedColumns.filter((c) => c.dataSource === dataSource.name);

              if (this.selectedColumns.find((c) => c.x)?.name !== dataSourcePrimaryTimestamp) {
                  dataSourcePrimaryTimestamp = this.selectedColumns.find((c) => c.x)?.name;
              }

              const yColumns = dataSourceColumns.filter((c) => c.y);
              const zColumns = dataSourceColumns.filter((c) => c.z);

              const dataSourceResults = this.results[dataSource.name];

              // take no action if there are no results for this data source
              if (dataSourceResults === undefined) return;
              if (dataSourceResults.length < 1) return;

              // populate the results to be displayed in the table, ordered by data source
              this.tableResults = this.tableResults.concat(
                  dataSourceResults.map((d: any) => {
                      d.datasource = dataSource.name;
                      return d;
                  }),
              );

              // determine max amount of results to loop through
              const resultLength =
                  Number(this.defaultPlotLimit) !== 0 ? Math.min(dataSourceResults.length, Number(this.defaultPlotLimit)) : dataSourceResults.length;

              if (['line', 'markers', 'line and markers'].includes(this.chartType)) {
                  let mode = 'line';
                  if (this.chartType === 'line and markers') {
                      mode = 'lines+markers';
                  } else if (this.chartType === 'markers') {
                      mode = 'markers';
                  }

                  for (const column of yColumns) {
                      const singlePlot: {x: number[]; y: number[]; mode: string; name: string} = {
                          x: [],
                          y: [],
                          mode: mode,
                          name: column.uniqueName,
                      };

                      for (let i = 0; i < resultLength; i++) {
                          singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!]);
                          singlePlot.y.push(dataSourceResults[i][column.name]);
                      }

                      plotData.push(singlePlot);
                  }
              } else if (this.chartType === 'bar') {
                  for (const column of yColumns) {
                      const singlePlot: {x: number[]; y: number[]; type: Plotly.PlotType; name: string} = {
                          x: [],
                          y: [],
                          type: 'bar',
                          name: column.uniqueName,
                      };

                      for (let i = 0; i < resultLength; i++) {
                          singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!]);
                          singlePlot.y.push(dataSourceResults[i][column.name]);
                      }

                      plotData.push(singlePlot);
                  }
              } else if (this.chartType === 'bubble') {
                  // set z columns to the size array for bubble charts
                  const sizeColumn = zColumns[0];
                  if (!sizeColumn) return;

                  for (const column of yColumns) {
                      const singlePlot: {x: number[]; y: number[]; mode: string; marker: any; name: string} = {
                          x: [],
                          y: [],
                          mode: 'markers',
                          marker: {size: []},
                          name: column.uniqueName,
                      };

                      for (let i = 0; i < resultLength; i++) {
                          singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!]);
                          singlePlot.y.push(dataSourceResults[i][column.name]);
                          singlePlot.marker.size.push(dataSourceResults[i][sizeColumn.name]);
                      }

                      plotData.push(singlePlot);
                  }
              } else if (this.chartType === 'heatmap') {
                  // current support for basic heat map utilizing z exclusively
                  const plot: {z: number[][]; type: Plotly.PlotType; colorscale: Plotly.ColorScale} = {
                      z: [],
                      type: 'heatmap',
                      colorscale: this.colorScale,
                  };

                  for (const column of zColumns) {
                      // each column specified is a new row in the heat map
                      const z = [];

                      for (let i = 0; i < resultLength; i++) {
                          z.push(dataSourceResults[i][column.name]);
                      }

                      plot.z.push(z);
                  }

                  plotData.push(plot);
              } else if (this.chartType === 'scatter 3D') {
                  // create a plot (trace) for each valid user-specified set of traces
                  for (const trace of this.userTraces) {
                      const traceColumns = dataSourceColumns.filter((c) => c.trace.includes(trace));
                      const xColumn = traceColumns.filter((c) => c.x);
                      const yColumn = traceColumns.filter((c) => c.y);
                      const zColumn = traceColumns.filter((c) => c.z);

                      if (xColumn.length === 0 || yColumn.length === 0 || zColumn.length === 0) return;

                      const xColumnName = xColumn[0].name;
                      const yColumnName = yColumn[0].name;
                      const zColumnName = zColumn[0].name;

                      const plot: {x: number[]; y: number[]; z: number[]; type: Plotly.PlotType; name: string} = {
                          x: [],
                          y: [],
                          z: [],
                          type: 'scatter3d',
                          name: trace,
                      };

                      for (let i = 0; i < resultLength; i++) {
                          plot.x.push(dataSourceResults[i][xColumnName]);
                          plot.y.push(dataSourceResults[i][yColumnName]);
                          plot.z.push(dataSourceResults[i][zColumnName]);
                      }

                      plotData.push(plot);
                  }
              }
          });

          // carryover any existing layout annotations if this is a style update
          const layout: any = {
              showlegend: true,
              xaxis: {
                  title: this.selectedColumns.find((c) => c.x)?.name,
              },
          };

          if (styleUpdate || this.runType !== '--') {
              const currentLayout = (plotlyDiv as any).layout;
              if (currentLayout && currentLayout.annotations) {
                  layout.annotations = currentLayout.annotations;
              }
          }

          this.chartLoading = false;

          const plot = await Plotly.react(plotlyDiv!, plotData, layout, {responsive: true, editable: true});

          // remove any existing listeners to avoid duplicate event listeners
          plot.removeAllListeners('plotly_click');

          // add plotly click events for adding annotations
          plot.on('plotly_click', (data) => {
              // retrieve annotation component
              this.createAnnotation = true;
              this.annotationX = data.points[0].x;
              this.annotationY = data.points[0].y;
              this.annotationZ = (data.points[0] as any).z ? (data.points[0] as any).z : null;
          });

          plotlyDiv!.lastElementChild!.scrollIntoView({behavior: 'auto'});
      },
      adjustColumnNames() {
          this.columnsLoading = true;
          // have at minimum the chosen data source selected
          if (this.selectedDataSources.length === 0) this.selectedDataSources.push(this.dataSource!);

          // save off current version of selectedColumns to keep state of any columns that will carry over in new selection
          const previousColumns = this.selectedColumns;
          this.selectedColumns = [];

          this.determineDataSourceShape();

          for (const dataSource of this.selectedDataSources) {
              const columns = (dataSource.config as TimeseriesDataSourceConfig).columns;

              for (const column of columns) {
                  const columnNameEntry: selectedColumn = {
                      name: column.column_name!,
                      dataSource: dataSource.name,
                      uniqueName: `${dataSource.name}_${column.column_name}`,
                      type: column.type!,
                      x: false,
                      y: false,
                      z: false,
                      trace: [],
                  };

                  // set the primary timestamp of a single selected datasource to be the default x
                  // set float and number type columns to have y selected by default
                  if (this.selectedDataSources.length === 1) {
                      if (column.is_primary_timestamp) {
                          columnNameEntry.x = true;
                          this.selectedXColumn = columnNameEntry.uniqueName;

                          // set timeseriesFlag based upon primary timestamp type
                          column.type !== 'date' ? (this.timeseriesFlag = false) : (this.timeseriesFlag = true);
                      }
                  }

                if (!column.is_primary_timestamp && (column.type?.toLowerCase().includes('float') || column.type?.toLowerCase().includes('number'))) {
                  columnNameEntry.y = true;
                }

                  const previousColumn = previousColumns.find((c) => c.uniqueName === columnNameEntry.uniqueName);
                  // keep previous columns if found and the column is not now the x column
                  if (!previousColumn || columnNameEntry.x) {
                      this.selectedColumns.push(columnNameEntry);
                  } else {
                      this.selectedColumns.push(previousColumn);
                  }
              }
          }
          this.ySelected = true;
          this.columnsLoading = false;
      },
      async determineDataSourceShape() {
          this.indexesLoading = true;
          for (const dataSource of this.selectedDataSources) {
              if(this.dataSourceShapes.get(dataSource.id!)) continue;

              const count = await this.$client.retrieveTimeseriesRowCount(this.containerID, dataSource.id!);

              const range = await this.$client.retrieveTimeseriesRange(this.containerID, dataSource.id!);

              this.dataSourceShapes.set(dataSource.id!, {
                  count: count.count || 0,
                  start: range.start || this.startDate,
                  end: range.end || this.endDate,
              });

              // set start and end times/index if main data source
              if (this.selectedDataSources.length === 1 && this.timeseriesFlag) {
                  if (range.start !== 'NaN') {
                      this.startDate = range.start;
                      this.endDate = range.end;
                  } else {
                      this.errorMessage = `${this.$t('dataSources.dataSource')} ${dataSource.name} ${this.$t('general.mayBeEmpty')}`;
                  }
              } else if (this.selectedDataSources.length === 1 && !this.timeseriesFlag) {
                  if (range.start !== 'NaN') {
                      this.startIndex = Number(range.start);
                      this.endIndex = Number(range.end);
                  } else {
                      this.errorMessage = `${this.$t('dataSources.dataSource')} ${dataSource.name} ${this.$t('general.mayBeEmpty')}`;
                  }
              }
          }
          this.indexesLoading = false;
      },
      async submitSearch() {
          // @ts-ignore
          if (!this.$refs.searchForm!.validate()) return;
          this.chartLoading = true;

          this.errorMessage = '';

          if (this.timeseriesFlag && new Date(this.endDate) <= new Date(this.startDate)) {
              this.errorMessage = this.$t('errors.endDate') as string;
              return;
          }

          // clear the results object
          this.results = {};

          if (this.runType === '--') {
              void this.runSearch();
          } else if (this.runType === 'Replay') {
              this.streamActive = true;

              // determine interval chunks
              if (this.timeseriesFlag) {
                  const seconds = Math.floor(new Date(this.endDate).getTime() / 1000 - new Date(this.startDate).getTime() / 1000);

                  let count = 0;
                  const intervals = seconds / this.replayStreamInterval;

                  const timeseriesData = await this.queryTimeseriesData();
                  this.chartLoading = false;

                  this.timeseriesReplayInterval = setInterval(() => {
                      if (!this.streamActive) clearInterval(this.timeseriesReplayInterval);

                      const intervalStart = new Date(this.startDate).getTime() + this.replayStreamInterval * 1000 * count; // seconds for start interval
                      const intervalEnd = intervalStart + this.replayStreamInterval * 1000; // seconds for end interval
                      const intervalStartDate = new Date(intervalStart);
                      const intervalEndDate = new Date(intervalEnd);

                      // loop through each dataSource and add the records that fall within the time/index to results
                      for (const [dataSourceName, records] of Object.entries(timeseriesData)) {
                          // determine the primary timestamp key for this data source and use to determine which entries fall within the current range
                          const dataSource = this.selectedDataSources.find((d) => d.name === dataSourceName);
                          if (!dataSource) return;

                          const primaryTimestampColumn = this.selectedColumns.find((c) => c.x)?.name;
                          if (!primaryTimestampColumn) return;

                          if (!this.results[dataSourceName]) this.results[dataSourceName] = []; // init the results array for this data source if it does not exist

                          let dataStartIndex = 0; // to be used for search as little of the data as possible in each iteration

                          for (dataStartIndex; dataStartIndex < (records as any).length; dataStartIndex++) {
                              const entry = (records as any)[dataStartIndex];
                              if (
                                  entry[primaryTimestampColumn] &&
                                  new Date(entry[primaryTimestampColumn]) > intervalStartDate &&
                                  new Date(entry[primaryTimestampColumn]) < intervalEndDate
                              ) {
                                  this.results[dataSourceName].push(entry);
                              }
                          }
                      }

                      count += 1;
                      this.updatePlot();

                      // check if we should stop the loop
                      if (!this.streamActive || count > intervals) {
                          clearInterval(this.timeseriesReplayInterval);
                          this.streamActive = false;
                      } else {
                          this.streamEntireProgress = (count / intervals) * 100;
                      }
                  }, this.replayStreamInterval * 1000);
              } else {
                  let recordCount = 0;

                  const timeseriesData = await this.queryTimeseriesData();

                  this.indexReplayInterval = setInterval(() => {
                      if (!this.streamActive) clearInterval(this.indexReplayInterval);

                      recordCount += this.replayRecordSize;

                      // loop through each dataSource and add the records that fall within the time/index to results
                      for (const [dataSourceName, records] of Object.entries(timeseriesData)) {
                          // determine the primary timestamp key for this data source and use to determine which entries fall within the current range
                          const dataSource = this.selectedDataSources.find((d) => d.name === dataSourceName);
                          if (!dataSource) return;

                          const primaryTimestampColumn = this.selectedColumns.find((c) => c.x)?.name;
                          if (!primaryTimestampColumn) return;

                          if (!this.results[dataSourceName]) this.results[dataSourceName] = [];

                          this.results[dataSourceName] = (records as any).slice(0, recordCount);
                      }

                      this.updatePlot();

                      // check if we should stop the loop
                      if (!this.streamActive || recordCount > this.endIndex) {
                          clearInterval(this.indexReplayInterval);
                          this.streamActive = false;
                      } else {
                          this.streamEntireProgress = (recordCount / this.endIndex) * 100;
                      }
                  }, this.replayStreamInterval * 1000);
              }
          } else if (this.runType === 'Live Stream') {
              this.streamActive = true;

              void this.runSearch();

              let count = 1;
              const firstEndDate = new Date(this.endDate);

              this.liveStreamInterval = setInterval(() => {
                  if (!this.streamActive) clearInterval(this.liveStreamInterval);

                  // increment end date or end index and rerun search
                  if (this.timeseriesFlag) {
                      // start with provided end date plus one iteration and then add time for each future iteration
                      this.endDate = new Date(firstEndDate.getTime() + this.replayStreamInterval * 1000 * count).toISOString();
                  } else {
                      this.endIndex += this.replayRecordSize;
                  }

                  void this.runSearch();

                  count += 1;
              }, this.replayStreamInterval * 1000);
          }
      },
      async queryTimeseriesData() {
          const dataToReturn: any = {};

          const xColumn = this.selectedColumns.find((c) => c.x);
          if (!xColumn) {
              this.errorMessage = this.$t('errors.xCol') as string;
              return {};
          }
          // number and number64 are compatible
          const xColumnType = xColumn.type.includes('number') ? 'number' : xColumn.type;

          for (const dataSource of this.selectedDataSources) {
              // don't query on data sources that we know are empty
              if (Number(this.dataSourceShapes.get(dataSource.id!).count) === 0) continue;

              // don't query on data sources that don't have columns selected
              let dataSourceSelected = false;
              for (const column of this.selectedColumns) {
                  if (column.dataSource === dataSource.name && (column.x || column.y || column.z)) dataSourceSelected = true;
              }

              if (!dataSourceSelected) continue;

              // don't query on data sources that have a differing primary timestamp type
              const dataSourcePrimaryColumn = (dataSource.config as TimeseriesDataSourceConfig).columns.find((c) => c.is_primary_timestamp);
              if (!dataSourcePrimaryColumn) continue;
              // number and number64 are compatible
              const dataSourceType = dataSourcePrimaryColumn.type!.includes('number') ? 'number' : dataSourcePrimaryColumn.type;

              // don't show data for data sources that are incompatible with the selected primary timestamp and not the current data source
              if (xColumnType !== dataSourceType && xColumn.dataSource !== dataSource.name) {
                  this.errorMessage = `${this.$t('errors.timestampType')} ${xColumnType}`;
                  continue;
              }

              const results = await this.$client.submitDataSourceGraphQLQuery(this.containerID, dataSource.id!, this.buildQuery(dataSource));
              if (results.errors) {
                  if (Array.isArray(results.errors) && results.errors.length > 0 && results.errors[0].message) {
                      this.errorMessage = results.errors.map((e: any) => `${e.message} `);
                  } else {
                      this.errorMessage = (results.errors as string[]).join(' ');
                  }
                  return {};
              }

              let data = results.data.Timeseries;
              if (!Array.isArray(data)) data = [data];
              dataToReturn[dataSource.name] = data;
          }
          return dataToReturn;
      },
      async runSearch() {
          this.results = await this.queryTimeseriesData();
          void this.updatePlot();
      },
      buildQuery(dataSource: DataSourceT) {
          let dataSourcePrimaryTimestamp = (dataSource.config as TimeseriesDataSourceConfig).columns.find((c) => c.is_primary_timestamp);
          let primaryTimestampColumn = dataSourcePrimaryTimestamp?.column_name;
          const original_primaryTimestampColumn = dataSourcePrimaryTimestamp?.column_name;
          const dataSourceColumns = this.selectedColumns.filter((c) => c.dataSource === dataSource.name);

          // override primary timestamp with selected x column if applicable
          if (this.selectedColumns.find((c) => c.x)?.name !== primaryTimestampColumn) {
              primaryTimestampColumn = this.selectedColumns.find((c) => c.x)?.name;
              dataSourcePrimaryTimestamp = (dataSource.config as TimeseriesDataSourceConfig).columns.find((c) => c.column_name === primaryTimestampColumn);
          }

          if (this.timeseriesFlag) {
              return {
                  query: `
        {
          Timeseries(
            _record: {
              limit: ${this.defaultPlotLimit},
              sortBy: "${primaryTimestampColumn}",
              sortDesc: false
            }
            ${original_primaryTimestampColumn}: {
              operator: "between", value: ["${this.startDate}", "${this.endDate}"]
            }
          ) {
            ${dataSourceColumns
                .filter((c) => c.x || c.y || c.z || c.uniqueName === `${dataSource.name}_${primaryTimestampColumn}`)
                .map((c) => c.name)
                .join(' ')}
          }
        }`,
              };
          } else {
              // if the primary timestamp is a number, any raw values must be ints
              // if the primary timestamp is number64 or float, raw values must be passed as strings
              if (dataSourcePrimaryTimestamp?.type === 'number') {
                  return {
                      query: `
        {
          Timeseries(
            _record: {
              limit: ${this.defaultPlotLimit},
              sortBy: "${primaryTimestampColumn}",
              sortDesc: false
            }
            ${original_primaryTimestampColumn}: {
              operator: "between", value: [${this.startIndex}, ${this.endIndex}]
            }
          ) {
            ${dataSourceColumns
                .filter((c) => c.x || c.y || c.z || c.uniqueName === `${dataSource.name}_${primaryTimestampColumn}`)
                .map((c) => c.name)
                .join(' ')}
          }
        }`,
                  };
              } else if (
                  dataSourcePrimaryTimestamp?.type === 'number64' ||
                  dataSourcePrimaryTimestamp?.type === 'float64' ||
                  dataSourcePrimaryTimestamp?.type === 'float'
              ) {
                  return {
                      query: `
        {
          Timeseries(
            _record: {
              limit: ${this.defaultPlotLimit},
              sortBy: "${primaryTimestampColumn}",
              sortDesc: false
            }
            ${original_primaryTimestampColumn}: {
              operator: "between", value: ["${this.startIndex}", "${this.endIndex}"]
            }
          ) {
            ${dataSourceColumns
                .filter((c) => c.x || c.y || c.z || c.uniqueName === `${dataSource.name}_${primaryTimestampColumn}`)
                .map((c) => c.name)
                .join(' ')}
          }
        }`,
                  };
              } else {
                  this.errorMessage = this.$t('errors.unrecognizedTimestamp') as string;
                  return '';
              }
          }
      },
      async performDownload(data: string, name = 'download') {
          const blob = new Blob([data], {type: 'text/csv'});

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.setAttribute('download', `${name}.csv`);
          document.body.append(link);
          link.click();
          link.remove();
      },
      downloadCSV() {
          for (const [dataSourceName, records] of Object.entries(this.results)) {
              const data = (records as object[]).map((r: any) => {
                  delete r.datasource;
                  return r;
              });
              json2csv(data)
                  .then((csv) => {
                      this.performDownload(csv, dataSourceName);
                  })
                  .catch((e) => (this.errorMessage = e));
          }
      },
      closeDialog() {
          this.clearIntervals();
          this.dialog = false;
          this.$emit('timeseriesDialogClose');
      },
      clearIntervals() {
          this.streamActive = false;
          clearInterval(this.streamInterval);
          clearInterval(this.timeseriesReplayInterval);
          clearInterval(this.indexReplayInterval);
          clearInterval(this.liveStreamInterval);
      },
      loadPage() {
        if (!this.pageLoaded) {
          this.load();
          this.loadDataSources();
          this.setDatePickers();
          this.pageLoaded = true;
        }
      },
    },
  });
</script>

<style lang="scss">
.form-control {
    width: 250px;
    border-width: 1px;
    border-style: solid;
    border-color: $primary;
    border-radius: 5px;
    padding: 8px;
}

.v-progress-linear {
  margin-bottom: 10px !important;
}
</style>
