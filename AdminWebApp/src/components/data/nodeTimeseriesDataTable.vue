<template>
  <v-container fluid>
    <v-col :cols="12">
      <error-banner :message="errorMessage"></error-banner>
      <v-data-table
          :items="timeseriesTables"
          :headers="headers()"
      >
        <template v-slot:top>
          <p>{{$t('timeseries.nodeExplanation')}}</p>
        </template>

        <template v-slot:item.actions="{ item }">
          <timeseries-viewer-dialog
            :containerID="containerID"
            :dataSourceID="item.value"
            @timeseriesDialogClose="incrementKey"
            :key="key"
          />
        </template>
      </v-data-table>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import TimeseriesViewerDialog from "./timeseriesViewerDialog.vue";

@Component({components: {TimeseriesViewerDialog}})
export default class NodeTimeseriesDataTable extends Vue {
  @Prop({required: true})
  readonly nodeID!: string

  @Prop({required: true})
  readonly containerID!: string

  errorMessage = ''
  timeseriesTables: object[] = []

  key = 0

  headers() {
    return [
      {text: this.$t('general.name'), value: 'name'},
      {text: this.$t('general.view'), value: 'actions', sortable: false},
    ]
  }

  incrementKey() {
    this.key += 1
  }

  mounted(){
    this.loadTimeseriesTables()
  }

  @Watch('nodeID', {immediate: false})
  watchNodeID(){
    this.loadTimeseriesTables()
  }

  loadTimeseriesTables() {
    this.$client.listTimeseriesTables(this.containerID, this.nodeID)
        .then((results) => {
          const map = new Map<string, string>(Object.entries(results))
          this.timeseriesTables = Array.from(map, ([name, value]) => ({ name, value }));
        })
        .catch(e => this.errorMessage = e)
  }

}

</script>