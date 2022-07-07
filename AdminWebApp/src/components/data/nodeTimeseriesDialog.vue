<template>
  <v-dialog
      v-model="dialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
  >
    <template v-slot:activator="{ on }">
      <v-icon v-if="icon" small class="mr-2" v-on="on">mdi-eye</v-icon>
    </template>

    <v-card>
      <error-banner :message="errorMessage"></error-banner>
      <v-toolbar
          dark
          color="warning"
          flat
          tile
      >
        <v-btn
            icon
            dark
            @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{$t("timeseries.searchView")}} - <span v-if="transformation">{{transformation.name}}</span></v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-expansion-panels v-model="openPanels" >
        <v-expansion-panel>
          <v-expansion-panel-header><p class="text-overline" style="margin-bottom: 0px"><strong>{{$t('timeseries.searchTimeRange')}}:</strong> {{this.startDate}} {{this.startTime}} - {{this.endDate}} {{this.endTime}}</p></v-expansion-panel-header>

          <v-expansion-panel-content>
            <v-row>
              <v-col :cols="6">
                <h2>{{$t('timeseries.start')}}:</h2>
              <v-date-picker
                  :value="startDate"
                  @input="setStartDate"
                  style="padding-right: 30px"></v-date-picker>
                <v-time-picker
                    v-model="startTime"
                    @input="setStartTime"
                ></v-time-picker>
              </v-col>

              <v-col :cols="6">
                <h2>{{$t('timeseries.end')}}:</h2>
                <v-date-picker
                    :value="endDate"
                    :min="startDate"
                    @input="setEndDate"
                    style="padding-right: 30px"></v-date-picker>
                <v-time-picker
                    :value="endTime"
                    :min="(endDate === startDate) ? startTime : undefined"
                    @input="setEndTime"
                ></v-time-picker>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-btn color="primary" @click="runSearch">{{$t('timeseries.runSearch')}}</v-btn>
              </v-col>
            </v-row>
          </v-expansion-panel-content>
        </v-expansion-panel>

        <v-expansion-panel v-if="results.length > 0">
          <v-expansion-panel-header style="margin-bottom: 0px"><p class="text-overline" style="margin-bottom: 0px;"><strong>{{$t('timeseries.visualization')}}</strong></p></v-expansion-panel-header>

          <v-expansion-panel-content>
            <v-container v-if="!renderVisualization">
              <v-row>
                <v-col :cols="12">
                  <v-select
                    :items="charts"
                    :label="$t('timeseries.chooseVisualization')"
                    v-model="selectedChart"></v-select>
                </v-col>
                <v-col :cols="12" v-if="selectedChart === 'line'">
                  <v-combobox
                      :items="getLabels()"
                      v-model="selectedColumns"
                      :label="$t('timeseries.chooseColumns')"
                      multiple
                  ></v-combobox>
                </v-col>
                <v-col :cols="12">
                  <v-btn @click="renderVisualization = true">{{$t('timeseries.render')}}</v-btn>
                </v-col>
              </v-row>
            </v-container>

            <v-col v-if="renderVisualization">
              <v-btn @click="renderVisualization = false">{{$t('timeseries.return')}}</v-btn>
            </v-col>

            <line-chart v-if="renderVisualization && selectedChart === 'line'" :x="d => new Date(parseInt(d.dateTime,10))" :y="getColumns()" :labels="selectedColumns" :data="results"></line-chart>
          </v-expansion-panel-content>
        </v-expansion-panel>

      </v-expansion-panels>

      <v-data-table
          v-if="transformation"
          :headers="headers()"
          :items="results"
          :items-per-page="1000"
          :footer-props="{
                'items-per-page-options':[1000,5000,10000]
              }"
      >

        <template v-slot:[tablePrimaryTimestampName]="{item}">
          {{new Date(parseInt(item[primaryTimestampName], 10)).toUTCString()}}
        </template>

      </v-data-table>

    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {NodeT, TypeMappingTransformationT} from "@/api/types";
import {stringToValidPropertyName} from "@/utilities";
import LineChart from "@/components/charts/lineChart.vue";

@Component({components: {LineChart}})
export default class NodeTimeseriesDialog extends Vue {
  @Prop({required: true})
  readonly nodeID!: string

  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: true})
  readonly transformationID!: string

  @Prop({required: false, default: true})
  readonly icon!: boolean

  dialog = false
  errorMessage = ''
  transformation: TypeMappingTransformationT | null = null
  openPanels = 0
  initialStart: Date = new Date(Date.now() - 1000 * 60 * 60)
  initialEnd: Date = new Date()
  endDate = ''
  endTime = ''
  startDate = ''
  startTime = ''
  node: NodeT | null = null
  results: any[] = []
  renderVisualization = false
  charts = ['line']
  selectedChart = ''
  selectedColumns: string[] = []

  get tablePrimaryTimestampName(): string {
    return `item.${this.primaryTimestampName}`
  }

  get primaryTimestampName(): string {
    let found: string | undefined = undefined

    if(this.transformation && this.transformation.keys) {
     found = this.transformation?.keys?.find(k => k.is_primary_timestamp)?.column_name
    }

    if(found) return found

    return ''
  }

  @Watch('nodeID')
  nodeChange() {
    this.loadTransformation()
    this.loadNode()
  }

  @Watch('transformationID')
  transformationChange() {
    this.loadTransformation()
    this.loadNode()
  }

  mounted() {
    this.loadTransformation()
    this.loadNode()

    const isoStart =  this.initialStart.toISOString()
    const isoEnd =  this.initialEnd.toISOString()

    this.startDate = isoStart.substring(0, isoStart.indexOf('T'))
    this.endDate = isoEnd.substring(0, isoEnd.indexOf('T'))
    this.startTime = isoStart.substring(isoStart.indexOf('T')+1, isoStart.length - 5)
    this.endTime = isoEnd.substring(isoEnd.indexOf('T')+1, isoEnd.length - 5)
  }

  // we must pull the transformation in order to build the table correctly
  loadTransformation() {
    this.$client.retrieveTransformation(this.containerID, this.transformationID)
    .then(result => {
      this.transformation = result
    })
    .catch(e => this.errorMessage = e)
  }

  loadNode() {
    this.$client.retrieveNode(this.containerID, this.nodeID)
    .then(result => {
      this.node = result
    })
    .catch(e => this.errorMessage = e)
  }

  headers() {
    if(this.transformation?.keys){
      return this.transformation.keys.map(key => {
        return {
          text: key.column_name,
          value: key.column_name
        }
      })
    }
  }

  runSearch() {
    this.openPanels = 2
    this.renderVisualization = false

    this.$client.submitNodeGraphQLQuery(this.containerID, this.nodeID,  this.buildQuery())
        .then((results) => {
          if(results.errors) {
            this.errorMessage = (results.errors as string[]).join(' ')
            return
          }

          this.results = results.data[this.transformation?.name ? stringToValidPropertyName(this.transformation?.name) : 'z_'+this.transformation?.id]
        })
        .catch((e) => this.errorMessage = e)

  }

  setEndDate(value: any) {
    this.endDate = value
  }

  setStartDate(value: any) {
    this.startDate = value
  }

  setEndTime(value: any) {
    this.endTime = value
  }

  setStartTime(value: any) {
    this.startTime = value
  }

  getColumns() {
    if(this.transformation && this.transformation.keys) {
      const mappingFuncs: any[] = []
      
      this.transformation.keys.forEach(key => {
        if(key.is_primary_timestamp) return
        if(this.selectedColumns.includes(stringToValidPropertyName(key.column_name!))) {
          mappingFuncs.push((d: any) =>  d[stringToValidPropertyName(key.column_name!)])
        }
      })

      return mappingFuncs
    }
  }

  getLabels() {
    if(this.transformation && this.transformation.keys) {
      const labels: string[] = []

      this.transformation.keys.forEach((key) => {
        if(key.is_primary_timestamp) return

        labels.push(key.column_name!)
      })

      return labels
    }

    return []
  }

  buildQuery() {
    return {
      query: `
{
  ${this.transformation?.name ? stringToValidPropertyName(this.transformation?.name!) : 'z_' + this.transformationID}
  (_record: {
      sortBy: "${this.transformation?.keys.find(k => k.is_primary_timestamp)?.column_name}",sortDesc: false}
      ${this.transformation?.keys.find(k => k.is_primary_timestamp)?.column_name}: {
      operator: "between", value: ["${this.startDate} ${this.startTime}", "${this.endDate} ${this.endTime}"]
      }){
      ${this.transformation?.keys.map(k => k.column_name).join(' ')}
  }
}
      `
    }
  }
}
</script>