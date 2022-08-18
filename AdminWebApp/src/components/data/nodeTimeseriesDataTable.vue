<template>
  <v-container fluid>
    <v-col :cols="12">
      <error-banner :message="errorMessage"></error-banner>
      <v-data-table
          :items="timeseriesTables"
          :headers="headers()"
      >
        <template v-slot:top>
          <p>{{$t('timeseries.explanation')}}</p>
        </template>

        <template v-slot:item.actions="{ item }">
          <node-timeseries-dialog :nodeID="nodeID" :containerID="containerID" :dataSourceID="item.value[1]" :legacy="item.value[0]"></node-timeseries-dialog>
        </template>
      </v-data-table>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {NodeTransformationT} from "@/api/types";
import NodeTimeseriesDialog from "@/components/data/nodeTimeseriesDialog.vue";

@Component({components: {NodeTimeseriesDialog}})
export default class NodeTimeseriesDataTable extends Vue {
  @Prop({required: true})
  readonly nodeID!: string

  @Prop({required: true})
  readonly containerID!: string

  errorMessage = ''
  // the tuple here is [legacy, id]
  timeseriesTables: object[] = []

  headers() {
    return [
      {text: this.$t('timeseries.name'), value: 'name'},
      {text: this.$t('timeseries.actions'), value: 'actions', sortable: false},
    ]
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
          const map = new Map<string, [boolean, string]>(Object.entries(results))
          this.timeseriesTables = Array.from(map, ([name, value]) => ({ name, value }));
        })
        .catch(e => this.errorMessage = e)
  }

}

</script>