<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-select
        style="margin-left:10px; margin-right: 10px"
        :items="dataSources"
        item-text="name"
        return-object
        @change="setDataSource"
        :value="selectedDataSource"
        label="Select Data Source"
    >
      <template slot="item" slot-scope="data">
        <span v-if="data.item.archived" class="text--disabled">{{data.item.name}} - <i class="text-caption">{{$t('dataSources.archived')}}</i></span>
        <span v-else>{{data.item.name}}</span>
      </template>
    </v-select>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {DataSourceT} from "@/api/types";

@Component
export default class SelectDataSource extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: false, default: false})
  showArchived!: boolean


  errorMessage = ""
  dataSources: DataSourceT[] = []
  selectedDataSource: DataSourceT | null = null

  mounted() {
    this.$client.listDataSources(this.containerID, this.showArchived)
        .then(dataSources => {
          this.dataSources = dataSources
        })
        .catch(e => this.errorMessage = e)
  }

  setDataSource(source: DataSourceT) {
    this.selectedDataSource = source
    this.$emit('selected', source)
  }
}
</script>