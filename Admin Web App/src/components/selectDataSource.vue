<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-combobox
        style="margin-left:10px; margin-right: 10px"
        :items="dataSources"
        item-text="name"
        @change="setDataSource"
        label="Select Data Source"
        :multiple="multiple"
        :clearable="multiple"
        :disabled="disabled"
        v-model="selected"
    >
      <template slot="item" slot-scope="data">
        <span v-if="data.item.archived" class="text--disabled">{{data.item.name}} - <i class="text-caption">{{$t('dataSources.archived')}}</i></span>
        <span v-else>{{data.item.name}}</span>
      </template>
    </v-combobox>
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

  @Prop({required: false, default: false})
  multiple!: boolean

  @Prop({required: false, default: false})
  disabled?: boolean

  @Prop({required: false})
  dataSourceID?: string | string[]

  errorMessage = ""
  dataSources: DataSourceT[] = []
  selected: DataSourceT | DataSourceT[] | null = null

  beforeMount() {
    this.$client.listDataSources(this.containerID, this.showArchived)
        .then(dataSources => {
          this.dataSources = dataSources

          if(this.dataSourceID) {
            if(Array.isArray(this.dataSourceID)) {
              this.selected = []

              this.dataSourceID.forEach(id => {
                const source = this.dataSources.find(source => source.id === id)
                if(source) (this.selected as DataSourceT[]).push(source)
              })
            } else {
              const source = this.dataSources.find(source => source.id === this.dataSourceID)
              if(source) this.selected = source
            }
          }
        })
        .catch(e => this.errorMessage = e)
        .finally(() => {
          if(this.selected) {
            this.$emit('selected', this.selected)
          }
        })
  }

  setDataSource(source: DataSourceT) {
    this.$emit('selected', source)
  }
}
</script>