<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-combobox
        :items="dataSourceTypes"
        @change="setDataSource"
        label="Select Enabled Data Source Types"
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

  @Prop({required: false, default: []})
  values?: string[]

  errorMessage = ""
  selected = [{
    text: "Standard",
    value: "standard"
  },{
    text: "HTTP",
    value: "http"
  },{
    text: "Timeseries",
    value: "timeseries"
  }]

  dataSourceTypes = [{
    text: "Standard",
    value: "standard"
  },{
    text: "HTTP",
    value: "http"
  },//{
  //   text: "Jazz/DNG", // DISABLED UNTIL REMOVED
  //   value: "jazz"
  //},
    {
    text: "Aveva",
    value: "aveva"
  },{
    text: "Timeseries",
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