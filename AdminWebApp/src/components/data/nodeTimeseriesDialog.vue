<template>
  <v-dialog
      v-model="dialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
      persistent
      no-click-animation
      ref="dialog"
  >
    <template v-slot:activator="{ on }">
      <v-icon v-if="icon" small class="mr-2" v-on="on">mdi-eye</v-icon>
    </template>

    <timeseries-annotation-dialog :dialog="createAnnotation" :x="annotationX" :y="annotationY" @createAnnotation="createPlotlyAnnotation"></timeseries-annotation-dialog>

    <v-card id="dialog">
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-toolbar
          dark
          color="warning"
          flat
          tile
          v-observe-visibility="setDatePickers"
      >
        <v-btn
            icon
            dark
            @click="closeDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{$t("timeseries.searchView")}}<span v-if="transformation"> - {{transformation.name}}</span></v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-row class="mt-2">
        <v-col :cols="3">

          <v-card class="pa-4 ml-3" style="height: 100%">

            <v-switch
                hide-details
                class="d-flex justify-center mt-0 mb-3 pt-0"
                v-model="timeseriesFlag"
                :label="(timeseriesFlag ? 'Timeseries' : 'Index')"
                :disabled="streamActive"
            ></v-switch>

            <v-form
                ref="searchForm"
                v-model="validSearch"
                lazy-validation
            >

              <div v-show="timeseriesFlag">
                <div class="d-block">
                  <label for="startDate" style="padding-right: 4px">Start: </label><input type="text" placeholder="Select Date.." id="startDate">
                </div>

                <div class="d-block">
                  <label for="endDate" style="padding-right: 11px">End: </label><input type="text" placeholder="Select Date.." id="endDate">
                </div>
              </div>

              <v-text-field
                  v-show="!timeseriesFlag"
                  v-model.number="startIndex"
                  type="number"
                  :rules="[rules.number]"
                  :label="$t('timeseries.startIndex')"
              ></v-text-field>

              <v-text-field
                  v-show="!timeseriesFlag"
                  v-model.number="endIndex"
                  type="number"
                  :rules="[rules.number]"
                  :label="$t('timeseries.endIndex')"
              ></v-text-field>

              <v-text-field
                  class="pt-5"
                  v-model.number="defaultPlotLimit"
                  type="number"
                  :rules="[rules.required, rules.positiveNumber, rules.number]"
                  :label="$t('timeseries.resultLimit')"
                  hint="Enter 0 for unlimited results (may impact performance)"
              ></v-text-field>

              <v-row>
                <v-col :cols="runType !== '--' && !timeseriesFlag ? 6 : 8">
                  <v-select
                      v-model="runType"
                      :items="runTypes"
                      hint="Replay or Live Stream"
                      persistent-hint
                  >
                  </v-select>
                </v-col>

                <v-col v-if="runType !== '--' && !timeseriesFlag" :cols="3">
                  <v-text-field
                      v-model.number="replayRecordSize"
                      type="number"
                      :rules="[rules.number]"
                      label="Records per"
                  ></v-text-field>
                </v-col>

                <v-col :cols="runType !== '--' && !timeseriesFlag ? 3 : 4">
                  <v-text-field
                      v-if="runType !== '--'"
                      v-model.number="replayStreamInterval"
                      type="number"
                      :rules="[rules.number]"
                      label="Interval"
                      suffix="s"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>

            <v-card-actions class="mt-2">
              <v-btn v-if="!streamActive" color="primary" @click="submitSearch">{{$t('timeseries.runSearch')}}</v-btn>
              <v-btn v-else color="primary" @click="clearIntervals">Stop Stream</v-btn>

              <v-spacer></v-spacer>
              <v-progress-linear v-if="streamActive && runType !== 'Live Stream'" :value="streamEntireProgress" color="primary" class="mx-4" height="25" style="max-width: 150px">
                <template v-slot:default="{ value }">
                  <strong>{{ Math.ceil(value) }}%</strong>
                </template>
              </v-progress-linear>
              <v-progress-circular v-if="streamActive" :value="streamProgress" color="primary"></v-progress-circular>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col :cols="3">
          <v-card class="pa-4" style="height: 100%">

            <v-select
                v-model="chartType"
                :items="chartTypes"
                hint="Chart Type"
                persistent-hint
                @change="updatePlot(true)"
            >
            </v-select>

            <v-select
                v-model="selectedDataSources"
                :items="dataSources"
                item-text="name"
                hint="Selected Data Sources"
                persistent-hint
                return-object
                multiple
                chips
                deletable-chips
                @change="adjustColumnNames"
            >
            </v-select>

          </v-card>
        </v-col>

        <v-col :cols="6">
          <v-card class="pa-4 mr-3"  style="height: 100%">

            <v-data-table
                v-if="selectedDataSources.length > 0"
                :headers="columnHeaders()"
                :items="selectedColumns"
                :items-per-page="20"
                :footer-props="{
                'items-per-page-options':[10,20,50]
              }"
                fixed-header
            >
              <template v-slot:header.z>
                <span v-if="chartType === 'bubble'">Size</span>
                <span v-else>Z</span>
              </template>
              <template v-slot:item.x="{ item }">
                <v-radio-group v-model="selectedXColumn" @change="columnXChange(item.uniqueName)">
                <v-radio v-model="item.uniqueName"/>
                </v-radio-group>
              </template>
              <template v-slot:item.y="{ item }">
                <v-simple-checkbox
                    v-model="item.y"
                    :disabled="item.x"
                ></v-simple-checkbox>
              </template>
              <template v-slot:item.z="{ item }">
                <v-simple-checkbox
                    v-model="item.z"
                    :disabled="item.x"
                >
                </v-simple-checkbox>
              </template>
            </v-data-table>

          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col :cols="12">

          <v-card class="pa-4 mx-3">

          <div id="timeseriesPlot"></div>
          <v-btn
              color="primary"
              dark
              v-show="Object.keys(this.results).length > 0"
              class="mx-3"
              @click="showChart = !showChart"
          >
            <v-icon v-if="showChart">
              mdi-table
            </v-icon>
            <v-icon v-else>
              mdi-arrow-up-drop-circle
            </v-icon>
          </v-btn>
          <v-btn
              color="primary"
              dark
              v-show="Object.keys(this.results).length > 0"
              class="mx-3"
              @click="downloadCSV"
          >
            <v-icon>
              mdi-download
            </v-icon>
          </v-btn>
          <div v-show="!showChart">
            <v-data-table
                v-if="transformation || dataSource"
                :headers="headers"
                :items="tableResults"
                group-by="datasource"
                show-group-by
                :items-per-page="1000"
                :footer-props="{
                'items-per-page-options':[1000,5000,10000]
              }"
                class="mx-3 elevation-2"
                fixed-header
                :height="tableHeight"
            >

              <template v-if="timeseriesFlag" v-slot:[tablePrimaryTimestampName]="{item}">
                {{new Date(item[primaryTimestampName]).toUTCString()}}
              </template>

            </v-data-table>
          </div>

            <span v-if="Object.keys(results).length === 0">No Results</span>
          </v-card>

        </v-col>
      </v-row>

    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {DataSourceT, NodeT, TimeseriesDataSourceConfig, TypeMappingTransformationT} from "@/api/types";
import TimeseriesAnnotationDialog from "@/components/data/timeseriesAnnotationDialog.vue";
import Plotly, {Datum} from "plotly.js-dist-min";
import { json2csv } from 'json-2-csv';
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
require("flatpickr/dist/themes/material_blue.css");

@Component({components: {TimeseriesAnnotationDialog}})
export default class NodeTimeseriesDialog extends Vue {
  @Prop({required: true})
  readonly nodeID!: string

  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: false})
  readonly transformationID?: string

  @Prop({required: false})
  readonly dataSourceID?: string

  @Prop({required: false, default: false})
  readonly legacy!: boolean

  @Prop({required: false, default: true})
  readonly icon!: boolean

  dialog = false
  errorMessage = ''
  successMessage = ''
  transformation: TypeMappingTransformationT | null = null
  dataSource: DataSourceT | null = null
  initialStart: Date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
  initialEnd: Date = new Date()
  endDate = ''
  startDate = ''
  node: NodeT | null = null
  results: any = {}
  tableResults: any[] = []
  timeseriesFlag = true
  startIndex = 0
  endIndex = 1000
  rules = {
    required: (value: any) => !!value || 'Required',
    number: (value: any) => {
      const pattern = /^[0-9]+$/
      return pattern.test(value) || 'Not a number'
    },
    positiveNumber: (value: any) => {
      if (value < 0) return 'Please enter a positive number'
      return true
    }
  }
  defaultPlotLimit = 5000
  tableHeight = 500
  showChart = true
  chartType = 'line'
  chartTypes = ['line', 'markers', 'line and markers', 'bar', 'bubble']
  selectedDataSources: DataSourceT[] = []
  dataSources: DataSourceT[] = []
  selectedColumns: any[] = []
  selectedXColumn = ''
  validSearch = true
  createAnnotation = false
  annotationX: Datum = ''
  annotationY: Datum = ''
  runTypes = ['--', 'Replay', 'Live Stream']
  runType = '--'
  replayStreamInterval = 10
  streamActive = false
  streamProgress = 0
  streamInterval: any = {}
  timeseriesReplayInterval: any = {}
  indexReplayInterval: any = {}
  liveStreamInterval: any = {}
  streamSeconds = 0
  streamEntireProgress = 0
  replayRecordSize = 100

  get tablePrimaryTimestampName(): string {
    return `item.${this.primaryTimestampName}`
  }

  get primaryTimestampName(): string {
    let found: string | undefined = undefined

    if(this.transformation && this.transformation.keys) {
      found = this.transformation?.keys?.find(k => k.is_primary_timestamp)?.column_name
    }

    if(this.dataSource && (this.dataSource?.config as TimeseriesDataSourceConfig).columns) {
      found = (this.dataSource?.config as TimeseriesDataSourceConfig).columns.find(c => c.is_primary_timestamp)?.column_name
    }

    if(found) return found

    return ''
  }

  @Watch('nodeID')
  nodeChange() {
    this.load()
    this.loadNode()
  }

  @Watch('transformationID')
  transformationChange() {
    this.load()
    this.loadNode()
  }

  @Watch('dataSourceID')
  dataSourceChange() {
    this.load()
    this.loadNode()
  }

  @Watch('streamActive')
  streamActiveChange() {
    if (this.streamActive) {
      // progress should increase every second by 1/n where n is the interval in seconds between updates
      const increment = 100 / this.replayStreamInterval

      this.streamInterval = setInterval(() => {
        if (this.streamProgress >= 100) {
          this.streamSeconds += this.replayStreamInterval
          return (this.streamProgress = increment)
        }
        this.streamProgress += increment
      }, 1000)
    } else {
      clearInterval(this.streamInterval)
      this.streamProgress = 0
      this.streamEntireProgress = 0
      this.streamSeconds = 0
    }
  }

  async updatePlot(styleUpdate = false) {
    const plotlyDiv = document.getElementById('timeseriesPlot')
    // remove chart to force proper refresh
    Plotly.purge(plotlyDiv!)

    if (Object.keys(this.results).length === 0) {
      return
    }

    const plotData: Plotly.Data[] = []
    this.tableResults = []

    this.selectedDataSources.forEach((dataSource) => {
      const dataSourcePrimaryTimestamp = (dataSource.config as TimeseriesDataSourceConfig).columns.find(c => c.is_primary_timestamp)?.column_name
      const dataSourceColumns = this.selectedColumns.filter(c => c.dataSource === dataSource.name)

      const yColumns = dataSourceColumns.filter(c => c.y)
      const zColumns = dataSourceColumns.filter(c => c.z)

      const dataSourceResults = this.results[dataSource.name]

      // take no action if there are no results for this data source
      if (dataSourceResults === undefined) return
      if (dataSourceResults.length < 1) return

      // populate the results to be displayed in the table, ordered by data source
      this.tableResults = this.tableResults.concat(dataSourceResults.map((d: any) => {
        d.datasource = dataSource.name
        return d
      }))

      if (this.chartType === 'line' || this.chartType === 'markers' || this.chartType === 'line and markers') {
        let mode = 'line'
        if (this.chartType === 'line and markers') {
          mode = 'lines+markers'
        } else if (this.chartType === 'markers') {
          mode = 'markers'
        }

        for (const column of yColumns) {
          const singlePlot: {x: number[], y: number[], mode: string, name: string} =
              { x: [], y: [], mode: mode, name: column.uniqueName };

          if (Number(this.defaultPlotLimit) !== 0) {
            for (let i = 0; (i < dataSourceResults.length && i < Number(this.defaultPlotLimit)); i++) {
              singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!])
              singlePlot.y.push(dataSourceResults[i][column.name])
            }
          } else {
            for (let i = 0; i < dataSourceResults.length; i++) {
              singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!])
              singlePlot.y.push(dataSourceResults[i][column.name])
            }
          }

          plotData.push(singlePlot)
        }
      } else if (this.chartType === 'bar') {
        for (const column of yColumns) {
          const singlePlot: {x: number[], y: number[], type: Plotly.PlotType, name: string} =
              { x: [], y: [], type: 'bar', name: column.uniqueName };

          if (Number(this.defaultPlotLimit) !== 0) {
            for (let i = 0; (i < dataSourceResults.length && i < Number(this.defaultPlotLimit)); i++) {
              singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!])
              singlePlot.y.push(dataSourceResults[i][column.name])
            }
          } else {
            for (let i = 0; i < dataSourceResults.length; i++) {
              singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!])
              singlePlot.y.push(dataSourceResults[i][column.name])
            }
          }

          plotData.push(singlePlot)
        }
      } else if (this.chartType === 'bubble') {
        // set z columns to the size array for bubble charts
        const sizeColumn = zColumns[0]
        if (sizeColumn === undefined) return

        for (const column of yColumns) {
          const singlePlot: {x: number[], y: number[], mode: string, marker: any, name: string} =
              { x: [], y: [], mode: 'markers', marker: { size: [] }, name: column.uniqueName };

          if (Number(this.defaultPlotLimit) !== 0) {
            for (let i = 0; (i < dataSourceResults.length && i < Number(this.defaultPlotLimit)); i++) {
              singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!])
              singlePlot.y.push(dataSourceResults[i][column.name])
              singlePlot.marker.size.push(dataSourceResults[i][sizeColumn.name])
            }
          } else {
            for (let i = 0; i < dataSourceResults.length; i++) {
              singlePlot.x.push(dataSourceResults[i][dataSourcePrimaryTimestamp!])
              singlePlot.y.push(dataSourceResults[i][column.name])
              singlePlot.marker.size.push(dataSourceResults[i][sizeColumn.name])
            }
          }

          plotData.push(singlePlot)
        }
      }
    })

    // carryover any existing layout annotations if this is a style update
    const layout: any = {
      showlegend: true,
      xaxis: {
        title: this.selectedColumns.find(c => c.x)?.name
      },
    }

    if (styleUpdate) {
      const currentLayout = (plotlyDiv as any).layout
      if (currentLayout && currentLayout.annotations) {
        layout.annotations = currentLayout.annotations
      }
    }

    const plot = await Plotly.react(plotlyDiv!,
        plotData,
        layout,
        {responsive: true, editable: true})

    // remove any existing listeners to avoid duplicate event listeners
    plot.removeAllListeners('plotly_click');

    // add plotly click events for adding annotations
    plot.on('plotly_click', (data) => {
      // retrieve annotation component
      this.createAnnotation = true
      this.annotationX = data.points[0].x
      this.annotationY = data.points[0].y
    });

  }

  async createPlotlyAnnotation(annotation: any) {
    this.createAnnotation = false

    if (!annotation) return

    const plotlyDiv = document.getElementById('timeseriesPlot') as any
    const currentLayout = plotlyDiv.layout

    // default arrow direction to up, but change if specified
    let y = -40
    if (annotation.direction === 'below') y = 40

    if (!currentLayout.annotations) currentLayout.annotations = []

    currentLayout.annotations.push(
      {
        x: annotation.x,
        y: annotation.y,
        xref: 'x',
        yref: 'y',
        text: annotation.annotation,
        showarrow: true,
        arrowhead: 2,
        ax: 0,
        ay: y
      }
    )

    void Plotly.update(plotlyDiv, {}, currentLayout);
  }

  columnXChange(uniqueName: string) {
    for (const column of this.selectedColumns) {
      column.x = column.uniqueName === uniqueName;
    }
  }

  mounted() {
    this.load()
    this.loadNode()
    this.loadDataSources()

    this.startDate =  this.initialStart.toISOString()
    this.endDate =  this.initialEnd.toISOString()
  }

  // we must pull the transformation in order to build the table correctly
  load() {
    if(this.legacy) {
      this.$client.retrieveTransformation(this.containerID, this.transformationID!)
          .then(result => {
            this.transformation = result
          })
          .catch(e => this.errorMessage = e)
    } else {
      this.$client.retrieveDataSource(this.containerID, this.dataSourceID!)
          .then(result => {
            this.dataSource = result
            this.selectedDataSources = [this.dataSource]
            this.adjustColumnNames()
          })
          .catch(e => this.errorMessage = e)
    }
  }

  loadNode() {
    this.$client.retrieveNode(this.containerID, this.nodeID)
        .then(result => {
          this.node = result
        })
        .catch(e => this.errorMessage = e)
  }

  loadDataSources() {
    this.$client.listDataSources(this.containerID, false, true)
        .then(result => {
          this.dataSources = result
        })
        .catch(e => this.errorMessage = e)
  }

  setDatePickers() {
    const startPickr = flatpickr('#startDate', {
      altInput: true,
      altFormat: "F j, y h:i:S K",
      dateFormat: "Z",
      enableTime: true,
      enableSeconds: true,
      allowInput: true,
    }) as flatpickr.Instance;

    (startPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => { this.startDate = dateStr } );
    (startPickr as flatpickr.Instance).setDate(this.startDate)

    const endPickr = flatpickr('#endDate', {
      altInput: true,
      altFormat: "F j, y h:i:S K",
      dateFormat: "Z",
      enableTime: true,
      enableSeconds: true,
      allowInput: true,
    });

    (endPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => { this.endDate = dateStr } );
    (endPickr as flatpickr.Instance).setDate(this.endDate)

  }

  get headers() {
    if(this.transformation && this.transformation?.keys){
      return this.transformation.keys.map(key => {
        return {
          text: key.column_name,
          value: key.column_name
        }
      })
    } else {
      let columns = [{text: 'DataSource', value: 'datasource'}]
      const columnNames = this.selectedColumns.filter(c => c.x || c.y || c.z).map(c => {
        return {
          text: c.name,
          value: c.name,
          groupable: false,
        }
      })
      columns = columns.concat(columnNames)
      return columns
    }
  }

  columnHeaders() {
    return [
      { text: this.$t('timeseries.columnName'), value: 'name', sortable: false},
      { text: this.$t('timeseries.dataSource'), value: 'dataSource', sortable: false},
      { text: this.$t('timeseries.type'), value: 'type', sortable: false},
      { text: 'X', value: 'x', sortable: false},
      { text: 'Y', value: 'y', sortable: false},
      { text: 'Z', value: 'z', sortable: false},
    ]
  }

  adjustColumnNames() {
    // have at minimum the chosen data source selected
    if (this.selectedDataSources.length === 0) this.selectedDataSources.push(this.dataSource!)

    // save off current version of selectedColumns to keep state of any columns that will carry over in new selection
    const previousColumns = this.selectedColumns
    this.selectedColumns = []

    for (const dataSource of this.selectedDataSources) {
      const columns = (dataSource.config as TimeseriesDataSourceConfig).columns

      for (const column of columns) {
        const columnNameEntry = {name: column.column_name, dataSource: dataSource.name, uniqueName: `${dataSource.name}_${column.column_name}`, type: column.type, x: false, y: false, z: false}

        // set the primary timestamp of a single selected datasource to be the default x
        // set float and number type columns to have y selected by default
        if (this.selectedDataSources.length === 1) {
          if (column.is_primary_timestamp) {
            columnNameEntry.x = true
            this.selectedXColumn = columnNameEntry.uniqueName
          }

          if (!column.is_primary_timestamp && (column.type?.toLowerCase().includes('float') || column.type?.toLowerCase().includes('number'))) {
            columnNameEntry.y = true
          }
        }

        const previousColumn = previousColumns.find(c => c.uniqueName === columnNameEntry.uniqueName)
        if (!previousColumn) {
          this.selectedColumns.push(columnNameEntry)
        } else {
          this.selectedColumns.push(previousColumn)
        }

      }

    }
  }

  async submitSearch() {
    // @ts-ignore
    if (!this.$refs.searchForm!.validate()) return;

    if (new Date(this.endDate) <= new Date(this.startDate)) {
      this.errorMessage = 'Please enter an end date that is greater than the start date'
      return
    }

    // clear the results object
    this.results = {}

    if (this.runType === '--') {
      void this.runSearch()
    } else if (this.runType === 'Replay') {
      this.streamActive = true

      // determine interval chunks
      if (this.timeseriesFlag) {
        const seconds = Math.floor((new Date(this.endDate).getTime() / 1000) - (new Date(this.startDate).getTime() / 1000))

        let count = 0
        const intervals = seconds / this.replayStreamInterval

        const timeseriesData = await this.queryTimeseriesData()

        this.timeseriesReplayInterval = setInterval(() => {
          if (!this.streamActive) clearInterval(this.timeseriesReplayInterval)

          const intervalStart = new Date(this.startDate).getTime() + (this.replayStreamInterval * 1000)  * count // seconds for start interval
          const intervalEnd = intervalStart + this.replayStreamInterval * 1000 // seconds for end interval
          const intervalStartDate = new Date(intervalStart)
          const intervalEndDate = new Date(intervalEnd)

          // loop through each dataSource and add the records that fall within the time/index to results
          for (const [dataSourceName, records] of Object.entries(timeseriesData)) {
            // determine the primary timestamp key for this data source and use to determine which entries fall within the current range
            const dataSource = this.selectedDataSources.find(d => d.name === dataSourceName)
            if (!dataSource) return

            const primaryTimestampColumn = (dataSource.config as TimeseriesDataSourceConfig).columns.find(c => c.is_primary_timestamp)?.column_name
            if (!primaryTimestampColumn) return

            if (!this.results[dataSourceName]) this.results[dataSourceName] = [] // init the results array for this data source if it does not exist

            let dataStartIndex = 0 // to be used for search as little of the data as possible in each iteration

            for (dataStartIndex; dataStartIndex < (records as any).length; dataStartIndex++) {
              const entry = (records as any)[dataStartIndex]
              if (entry[primaryTimestampColumn] && new Date(entry[primaryTimestampColumn]) > intervalStartDate && new Date(entry[primaryTimestampColumn]) < intervalEndDate) {
                this.results[dataSourceName].push(entry)
              }
            }
          }

          count += 1
          this.updatePlot()

          // check if we should stop the loop
          if (!this.streamActive || count > intervals) {
            clearInterval(this.timeseriesReplayInterval)
            this.streamActive = false
          } else {
            this.streamEntireProgress = (count / intervals) * 100
          }
        }, this.replayStreamInterval * 1000)

      } else {
        let recordCount = 0

        const timeseriesData = await this.queryTimeseriesData()

        this.indexReplayInterval = setInterval(() => {
          if (!this.streamActive) clearInterval(this.indexReplayInterval)

          recordCount += this.replayRecordSize

          // loop through each dataSource and add the records that fall within the time/index to results
          for (const [dataSourceName, records] of Object.entries(timeseriesData)) {
            // determine the primary timestamp key for this data source and use to determine which entries fall within the current range
            const dataSource = this.selectedDataSources.find(d => d.name === dataSourceName)
            if (!dataSource) return

            const primaryTimestampColumn = (dataSource.config as TimeseriesDataSourceConfig).columns.find(c => c.is_primary_timestamp)?.column_name
            if (!primaryTimestampColumn) return

            if (!this.results[dataSourceName]) this.results[dataSourceName] = [] // init the results array for this data source if it does not exist

            let dataStartIndex = recordCount - this.replayRecordSize // to be used for search as little of the data as possible in each iteration

            for (dataStartIndex; dataStartIndex < (records as any).length; dataStartIndex++) {
              const entry = (records as any)[dataStartIndex]
              if (entry[primaryTimestampColumn] && entry[primaryTimestampColumn] >= this.startIndex && entry[primaryTimestampColumn] <= recordCount) {
                this.results[dataSourceName].push(entry)
              }
            }
          }

          this.updatePlot()

          // check if we should stop the loop
          if (!this.streamActive || recordCount > this.endIndex) {
            clearInterval(this.indexReplayInterval)
            this.streamActive = false
          } else {
            this.streamEntireProgress = (recordCount / this.endIndex) * 100
          }
        }, this.replayStreamInterval * 1000)
      }

    } else if (this.runType === 'Live Stream') {
      this.streamActive = true

      void this.runSearch()

      let count = 1
      const firstEndDate = new Date(this.endDate)

      this.liveStreamInterval = setInterval(() => {
        if (!this.streamActive) clearInterval(this.liveStreamInterval)

        // increment end date or end index and rerun search
        if (this.timeseriesFlag) {
          // start with provided end date plus one iteration and then add time for each future iteration
          this.endDate = new Date(firstEndDate.getTime() + (this.replayStreamInterval * 1000)  * count).toISOString()
        } else {
          this.endIndex += this.replayRecordSize
        }

        void this.runSearch()

        count += 1

      }, this.replayStreamInterval * 1000)
    }
  }

  async queryTimeseriesData() {
    const dataToReturn: any = {}
    for(const dataSource of this.selectedDataSources) {
      const results = await this.$client.submitDataSourceGraphQLQuery(this.containerID, dataSource.id!,  this.buildQuery(dataSource))
      if(results.errors) {
        this.errorMessage = (results.errors as string[]).join(' ')
        return
      }

      let data = results.data.Timeseries
      if (!Array.isArray(data)) data = [data]
      dataToReturn[dataSource.name] = data
    }
    return dataToReturn
  }

  async runSearch() {
    if(this.legacy) {
    this.$client.submitNodeGraphQLQuery(this.containerID, this.nodeID,  this.buildQueryLegacy())
        .then((results) => {
          if(results.errors) {
            this.errorMessage = (results.errors as string[]).join(' ')
            return
          }

          let data = results.data[this.transformation?.name ? this.$utils.stringToValidPropertyName(this.transformation?.name) + "_legacy" : 'z_'+this.transformation?.id + "_legacy"]
          if (!Array.isArray(data)) data = [data]
          this.results = data
        })
        .catch((e) => this.errorMessage = e)
    } else {
      this.results = await this.queryTimeseriesData()
      void this.updatePlot()
    }
  }

  buildQueryLegacy() {
    return {
      query: `
{
  ${this.transformation?.name ? this.$utils.stringToValidPropertyName(this.transformation?.name!)+'_legacy' : 'z_' + this.transformationID + "_legacy"}
  (_record: {
      sortBy: "${this.transformation?.keys.find(k => k.is_primary_timestamp)?.column_name}",sortDesc: false}
      ${this.transformation?.keys.find(k => k.is_primary_timestamp)?.column_name}: {
      operator: "between", value: ["${this.startDate}", "${this.endDate}"]
      }){
      ${this.transformation?.keys.map(k => k.column_name).join(' ')}
  }
}
      `
    }
  }

  buildQuery(dataSource: DataSourceT) {
    const dataSourcePrimaryTimestamp = (dataSource.config as TimeseriesDataSourceConfig).columns.find(c => c.is_primary_timestamp)?.column_name
    const dataSourceColumns = this.selectedColumns.filter(c => c.dataSource === dataSource.name)

    if (this.timeseriesFlag) {
      return {
        query: `
      {
        Timeseries(_record: {
          limit: ${this.defaultPlotLimit},
          sortBy: "${dataSourcePrimaryTimestamp}",
          sortDesc: false }
          ${dataSourcePrimaryTimestamp}: {
            operator: "between", value: ["${this.startDate}", "${this.endDate}"]
          }
        )
        {
        ${dataSourceColumns.filter(c => c.x || c.y || c.z || c.uniqueName === `${dataSource.name}_${dataSourcePrimaryTimestamp}`).map(c => c.name).join(' ')}
        }
      }
        `
      }
    } else {
      return {
        query: `
      {
        Timeseries(_record: {
          limit: ${this.defaultPlotLimit},
          sortBy: "${dataSourcePrimaryTimestamp}",
          sortDesc: false }
          ${dataSourcePrimaryTimestamp}: {
            operator: "between", value: ["${this.startIndex}", "${this.endIndex}"]
          }
        )
        {
        ${dataSourceColumns.filter(c => c.x || c.y || c.z || c.uniqueName === `${dataSource.name}_${dataSourcePrimaryTimestamp}`).map(c => c.name).join(' ')}
        }
      }
        `
      }
    }

  }

  downloadCSV() {
    for (const [dataSourceName, records] of Object.entries(this.results)) {
      const data = (records as object[]).map((r: any) => {
        delete r.datasource
        return r
      })
      json2csv(data)
        .then(csv => {
          this.performDownload(csv, dataSourceName)
        })
        .catch(e => this.errorMessage = e)
    }
  }

  async performDownload(data: string, name = 'download') {
    const blob = new Blob([data], { type: 'text/csv' });

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', `${name}.csv`)
    document.body.append(link)
    link.click()
    link.remove()
  }

  clearIntervals() {
    this.streamActive = false
    clearInterval(this.streamInterval)
    clearInterval(this.timeseriesReplayInterval)
    clearInterval(this.indexReplayInterval)
    clearInterval(this.liveStreamInterval)
  }

  closeDialog() {
    this.clearIntervals()
    this.dialog = false
    this.$emit('timeseriesDialogClose')
  }
}
</script>

<style lang="scss">
  .form-control {
    width: 250px;
    border-width: 1px;
    border-style: solid;
    border-color: #2ba8e0;
    border-radius: 5px;
    padding: 8px;
  }
</style>