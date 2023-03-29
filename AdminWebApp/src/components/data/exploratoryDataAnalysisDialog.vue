<template>
  <v-dialog
      v-model="dialog"
      max-width="90%"
      @click:outside="dialog = false"
  >
    <template v-slot:activator="{ on }">
      <v-btn class="mr-2 mt-8 primary" v-on="on">
        Exploratory Data Analysis
        <v-icon
            right
            dark
        >
          mdi-arrow-top-right-thick
        </v-icon>
      </v-btn>
    </template>

    <v-card class="pa-4" v-observe-visibility="performAnalysis">

      <v-card class="pa-4">
        <div id="boxPlot"></div>
      </v-card>

      <v-card class="pa-4 my-4">
        <div id="correlationPlot"></div>

        <span v-if="!correlationMatrixFlag">Results Length Varies, Cannot Show Correlation Matrix</span>
      </v-card>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="$emit('createAnnotation')">{{$t('home.cancel')}}</v-btn>
      </v-card-actions>
    </v-card>

  </v-dialog>
</template>

<script lang="ts">

import {Component, Prop, Vue} from "vue-property-decorator";
import {DataSourceT, TimeseriesDataSourceConfig} from "@/api/types";
import Plotly from "plotly.js-dist-min";
const calculateCorrelation = require("calculate-correlation");
import {schemeCategory10} from "d3-scale-chromatic"

@Component
export default class ExploratoryDataAnalysisDialog extends Vue {
  @Prop({required: true})
  readonly selectedDataSources!: DataSourceT[]

  @Prop({required: true})
  readonly results: any

  dialog = false
  correlationMatrixFlag = true

  async performAnalysis() {
    const plotlyBox = document.getElementById('boxPlot')
    Plotly.purge(plotlyBox!)

    const plotlyCorrelation = document.getElementById('correlationPlot')
    Plotly.purge(plotlyCorrelation!)

    const boxPlotData: Plotly.Data[] = []

    // used for storing data by column in one array
    const columnToDataMap: Map<string, number[]> = new Map()
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
          y.push(dataSourceResults[i][column.column_name!])

        }
        const uniqueColumnName = `${dataSource.name}_${column.column_name}`

        columnToDataMap.set(uniqueColumnName, y)

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
      title: 'Box Plot',
    }

    await Plotly.react(plotlyBox!,
        boxPlotData, boxLayout,
        {responsive: true, editable: true})

    if (this.correlationMatrixFlag) await this.createCorrelationPlot(columnToDataMap)

  }

  async createCorrelationPlot(columnToDataMap: Map<string, number[]>) {
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

    let correlationColumns: any = this.selectedDataSources.map((dataSource: DataSourceT) => {
      return (dataSource.config as TimeseriesDataSourceConfig).columns.map(c => `${dataSource.name}_${c.column_name}`)
    })
    correlationColumns = correlationColumns.flat(1)

    for (let i = 0; i < correlationColumns.length; i++) {
      const column = correlationColumns[i]
      singleCorrelationPlot.x.push(column)
      singleCorrelationPlot.y.push(column)

      const z = []
      for (let j = 0; j < correlationColumns.length; j++) {
        // check if the column being compared is self and set to 1 if so
        if (i === j) {
          z.push(1)
        } else {
          // calculate correlation between column and each innerColumn
          z.push(+calculateCorrelation(columnToDataMap.get(column), columnToDataMap.get(correlationColumns[j])).toFixed(2))
        }
      }

      singleCorrelationPlot.z.push(z)
    }
    correlationPlotData.push(singleCorrelationPlot)

    const correlationLayout: Partial<Plotly.Layout> = {
      showlegend: true,
      title: 'Correlation Plot',
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
    await Plotly.react(plotlyCorrelation!,
        correlationPlotData, correlationLayout,
        {responsive: true, editable: true}
    )
  }

}
</script>