<template>
  <v-dialog
      v-model="dialog"
      max-width="90%"
      @click:outside="dialog = false"
  >
    <template v-slot:activator="{ on }">
      <v-btn class="mr-2 mt-8 primary" v-on="on">
        {{$t('timeseries.analysis')}}
        <v-icon
            right
            dark
        >
          mdi-arrow-top-right-thick
        </v-icon>
      </v-btn>
    </template>

    <v-card class="pa-4" v-observe-visibility="performAnalysis">

      <v-card class="pa-4 mb-4 d-flex justify-center">
        <v-row>
          <v-col :cols="12" class="d-flex justify-center">
            <span>{{$t('timeseries.sourceShapes')}}</span>
          </v-col>

          <v-col :cols="12" class="d-flex">
            <v-card
                v-for="(dataSource, index) in selectedDataSources"
                :key="index"
                class="mr-4 mb-4"
                :color="colorArray[index % 10]"
                style="max-width: fit-content"
            >
              <v-card-title class="pt-0">
                <span class="headline text-h4">{{ dataSource.name }} ({{ dataSource.id }})</span>
              </v-card-title>
              <v-card-subtitle v-if="dataSource.id && dataSourceShapes.get(dataSource.id)">
                <span class="headline text-subtitle-1">{{ dataSourceShapes.get(dataSource.id).count }} {{$t('general.rows')}}</span><br/>
                <span class="headline text-subtitle-1">
                  {{ dataSourceShapes.get(dataSource.id).start }} - {{ dataSourceShapes.get(dataSource.id).end }}
                </span>
              </v-card-subtitle>
            </v-card>
          </v-col>
        </v-row>
      </v-card>

      <v-card class="pa-4">
        <div id="boxPlot"></div>
      </v-card>

      <v-card class="pa-4 my-4">
        <div id="correlationPlot"></div>

        <span v-if="!correlationMatrixFlag">{{$t('errors.matrix')}}</span>
      </v-card>

      <v-row class="mx-0 mt-4">
        <v-card v-for="(list, index) in Array.from(columnToDataMap)" :key="index" class="pa-4 mr-4 mb-4">
          <div :id="list[0]"></div>
        </v-card>
      </v-row>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false">{{$t('general.cancel')}}</v-btn>
      </v-card-actions>
    </v-card>

  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'

  import {DataSourceT, TimeseriesDataSourceConfig} from "@/api/types";
  import Plotly from "plotly.js-dist-min";
  const calculateCorrelation = require("calculate-correlation");
  import {schemeCategory10} from "d3-scale-chromatic"

  type column = {
  data: number[],
  dataSource: string,
  type: string,
  name: string
  }

  interface ExploratoryDataAnalysisDialogModel {
    columnToDataMap: Map<string, column>
    dialog: boolean
    correlationMatrixFlag: boolean
    colorArray: readonly string[]
  }

  export default Vue.extend ({
    name: 'ExploratoryDataAnalysisDialog',

    props: {
      selectedDataSources: {
        type: Array as PropType<DataSourceT[]>,
        required: true
      },
      results: {
        type: Object as PropType<any>, 
        required: true
      },
      dataSourceShapes: {
        type: Map as PropType<Map<string, any>>,
        required: true
      },
    },

    data: (): ExploratoryDataAnalysisDialogModel => ({
      columnToDataMap: new Map(),
      dialog: false,
      correlationMatrixFlag: true,
      colorArray: schemeCategory10
    }),

    methods: {
      async performAnalysis() {
        const plotlyBox = document.getElementById('boxPlot')
        Plotly.purge(plotlyBox!)

        const plotlyCorrelation = document.getElementById('correlationPlot')
        Plotly.purge(plotlyCorrelation!)

        const boxPlotData: Plotly.Data[] = []

        let dataSourceResultsLength = 0

        this.selectedDataSources.forEach((dataSource, index) => {
          const dataSourceColumns = (dataSource.config as TimeseriesDataSourceConfig).columns

          const dataSourceResults = this.results[dataSource.name]

          // take no action if there are no results for this data source
          if (dataSourceResults === undefined) return
          if (dataSourceResults.length < 1) return

          // determine results length for first data source
          // if the length of all subsequent data sources is not the same, don't show the correlation matrix
          if (index === 0) dataSourceResultsLength = dataSourceResults.length
          if (dataSourceResults.length !== dataSourceResultsLength) this.correlationMatrixFlag = false

          for (const column of dataSourceColumns) {
            const y = []

            for (let i = 0; i < dataSourceResults.length; i++) {
              // ensure we are pushing a number type if applicable
              if (column.type?.includes('float') || column.type?.includes('number')) {
                y.push(Number(dataSourceResults[i][column.column_name!]))
              } else {
                y.push(dataSourceResults[i][column.column_name!])
              }
            }

            const uniqueColumnName = `${dataSource.name}_${column.column_name}`

            this.columnToDataMap.set(uniqueColumnName, {
              data: y,
              dataSource: dataSource.name,
              type: column.type || 'string',
              name: column.column_name || ''
            })
            // forceUpdate to assign IDs to divs for histogram plots
            this.$forceUpdate()

            // create box plot
            if (!column.column_name || column.is_primary_timestamp) continue

            const singleBoxPlot: {
              y: number[],
              type: Plotly.PlotType,
              name: string,
              boxpoints: Plotly.BoxPlotData['boxpoints'],
              hoverinfo: Plotly.BoxPlotData['hoverinfo'],
              marker: Plotly.BoxPlotData['marker'],
              boxmean: Plotly.BoxPlotData['boxmean']
            } = {
              y: [],
              type: 'box',
              name: uniqueColumnName,
              boxpoints: 'suspectedoutliers',
              hoverinfo: 'y',
              marker: {
                color: schemeCategory10[index % 10]
              },
              boxmean: 'sd'
            };

            singleBoxPlot.y = y

            boxPlotData.push(singleBoxPlot)
          }

        })

        const boxLayout: Partial<Plotly.Layout> = {
          showlegend: true,
          title: this.$t('timeseries.boxPlot'),
        }

        if (plotlyBox) await Plotly.react(plotlyBox,
            boxPlotData, boxLayout,
            {responsive: true})

        if (this.correlationMatrixFlag) await this.createCorrelationPlot()

        await this.createHistograms()
      },
      async createCorrelationPlot() {
        const correlationPlotData: Plotly.Data[] = []

        const singleCorrelationPlot: {
          z: number[][],
          x: string[],
          y: string[],
          type: Plotly.PlotType,
          colorscale: Plotly.ColorScale
        } = {
          z: [],
          x: [],
          y: [],
          type: 'heatmap',
          colorscale: 'Bluered'
        };

        this.columnToDataMap.forEach((value, key) => {
          singleCorrelationPlot.x.push(key)
          singleCorrelationPlot.y.push(key)

          const z: number[] = []

          this.columnToDataMap.forEach((comparisonVal, comparisonKey) => {
            // check if the column being compared is self and set to 1 if so
            if (key === comparisonKey) {
              z.push(1)
            } else if (!value.type.includes('float') && !value.type.includes('number')) {
              z.push(NaN)
            } else if (!comparisonVal.type.includes('float') && !comparisonVal.type.includes('number')) {
              z.push(NaN)
            } else {
              // if both columns are numbers, calculate correlation between columns
              z.push(+calculateCorrelation(
                  value.data,
                  comparisonVal.data).toFixed(2)
              )
            }
          })

          singleCorrelationPlot.z.push(z)
        })
        correlationPlotData.push(singleCorrelationPlot)

        const correlationLayout: Partial<Plotly.Layout> = {
          showlegend: true,
          title: this.$t('timeseries.correlationPlot'),
          margin: {
            l: 200
          },
          annotations: []
        }

        // annotate correlation heat map
        for ( let i = 0; i < singleCorrelationPlot.z.length; i++ ) {
          for ( let j = 0; j < singleCorrelationPlot.z.length; j++ ) {

            const result: Partial<Plotly.Annotations> = {
              xref: 'x',
              yref: 'y',
              x: singleCorrelationPlot.x[j],
              y: singleCorrelationPlot.y[i],
              text: singleCorrelationPlot.z[i][j].toString(),
              font: {
                family: 'Arial',
                size: 12,
                color: 'white'
              },
              showarrow: false,
            };
            correlationLayout.annotations!.push(result);
          }
        }

        const plotlyCorrelation = document.getElementById('correlationPlot')
        if (plotlyCorrelation) await Plotly.react(plotlyCorrelation,
            correlationPlotData, correlationLayout,
            {responsive: true}
        )
      },
      createHistograms() {
        this.columnToDataMap.forEach(async (value, key) => {
          const plotlyHistogram = document.getElementById(key)
          Plotly.purge(plotlyHistogram!)

          const index = this.selectedDataSources.findIndex(d => d.name === value.dataSource)

          const data: Plotly.Data[] = [{
            x: value.data,
            type: 'histogram',
            marker: {
              color: schemeCategory10[index % 10]
            }
          }]

          const layout: Partial<Plotly.Layout> = {
            showlegend: false,
            title: key,
            width: 200,
            margin: {
              b: 15,
              l: 10,
              r: 10,
              t: 25
            }
          }

          if (plotlyHistogram) await Plotly.react(plotlyHistogram,
              data, layout,
              {responsive: true}
          )
        })

        this.$forceUpdate()
      }
    }
  });
</script>
