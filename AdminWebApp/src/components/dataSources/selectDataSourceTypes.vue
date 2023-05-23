<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-combobox
        :items="dataSourceTypes"
        @change="setDataSource"
        :label="$t('dataSources.selectEnabled')"
        :multiple="true"
        :clearable="true"
        v-model="selected"
    >

      <template v-if="tooltip" slot="append-outer"><info-tooltip :message="tooltipHelp"></info-tooltip> </template>
    </v-combobox>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class SelectDataSourceTypes extends Vue {
  @Prop({required: false, default: false})
  tooltip!: boolean

  @Prop({required: false, default: ''})
  tooltipHelp!: string

  @Prop({required: false, default: false})
  multiple!: boolean

  @Prop({required: false, default: () => []})
  values?: string[]

  errorMessage = ""

  selected = [{
    text: this.$t('dataSources.standardName'),
    value: "standard"
  },{
    text: this.$t('dataSources.httpName'),
    value: "http"
  },{
    text: this.$t('timeseries.timeseries'),
    value: "timeseries"
  }]

  dataSourceTypes = [{
    text: this.$t('dataSources.standardName'),
    value: "standard"
  },{
    text: this.$t('dataSources.httpName'),
    value: "http"
  },//{
  //   text: this.$t('dataSources.jazzName'), // DISABLED UNTIL REMOVED
  //   value: "jazz"
  //},
    {
    text: this.$t('dataSources.avevaName'),
    value: "aveva"
  },{
    text: this.$t('dataSources.p6Name'),
    value: "p6"
  },{
    text: this.$t('timeseries.timeseries'),
    value: "timeseries"
  }]

  mounted() {
    if(this.values && this.values.length >  0) {
      this.selected = this.dataSourceTypes.filter(t => this.values!.find(v => v === t.value))
    }

    this.$emit('selected',this.selected.map(i => i.value))
  }

  setDataSource() {
    this.$emit('selected',this.selected.map(i => i.value))
  }
}
</script>