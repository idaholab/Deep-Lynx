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
          <TimeseriesViewerDialog
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
  import Vue from 'vue';
  import TimeseriesViewerDialog from "./TimeseriesViewerDialog.vue";

  interface NodeTimeseriesDataTableModel {
    timeseriesTables: object[]
    errorMessage: string
    key: number
  }

  export default Vue.extend ({
    name: 'NodeTimeseriesDataTable',

    components: { TimeseriesViewerDialog },

    props: {
      nodeID: {type: String, required: true},
      containerID: {type: String, required: true},
    },

    data: (): NodeTimeseriesDataTableModel => ({
      timeseriesTables: [],
      errorMessage: '',
      key: 0
    }),

    watch: {
      nodeID: {handler: 'watchNodeID', immediate: false}
    },

    mounted() {
      this.loadTimeseriesTables()
    },

    methods: {
      headers() {
        return [
          {text: this.$t('general.name'), value: 'name'},
          {text: this.$t('general.view'), value: 'actions', sortable: false},
        ]
      },
      incrementKey() {
        this.$router.replace(`/containers/${this.containerID}/data-query`)
        this.key += 1
      },
      watchNodeID(){
        this.loadTimeseriesTables()
      },
      loadTimeseriesTables() {
        this.$client.listTimeseriesTables(this.containerID, this.nodeID)
            .then((results) => {
              const map = new Map<string, string>(Object.entries(results))
              this.timeseriesTables = Array.from(map, ([name, value]) => ({ name, value }));
            })
            .catch(e => this.errorMessage = e)
      }
    }
  });
</script>
