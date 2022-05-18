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
          <node-timeseries-dialog :nodeID="nodeID" :containerID="containerID" :transformationID="item.transformation_id"></node-timeseries-dialog>
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
  timeseriesTables: NodeTransformationT[] = []

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
      this.$client.listNodeTransformations(this.containerID, this.nodeID)
    .then((results) => {
        this.timeseriesTables = results
    })
    .catch(e => this.errorMessage = e)
  }

}

</script>