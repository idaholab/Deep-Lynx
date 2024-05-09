<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-combobox
      :items="dataSourceTypes"
      @change="setDataSource"
      :label="$t('dataSources.selectEnabled')"
      :multiple="true"
      :clearable="true"
      v-model="selected"
    >
      <template v-if="tooltip" slot="append-outer">
        <info-tooltip :message="tooltipHelp"/>
      </template>
    </v-combobox>
  </div>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'

  interface SelectDataSourceTypesModel {
    errorMessage: string
    selected: {text: string, value: string}[] | null
  }

  export default Vue.extend ({
    name: 'SelectDataSourceTypes',

    props: {
      tooltip: {type: Boolean, required: false, default: false},
      tooltipHelp: {type: String, required: false, default: ''},
      multiple: {type: Boolean, required: false, default: false},
      values: {
        type: Array as PropType<string[]>,
        required: false,
        default: () => [],
      }
    },

    data: (): SelectDataSourceTypesModel => ({
      errorMessage: "",
      selected: null
    }),

    computed: {
      dataSourceTypes(): {text: string, value: string}[] {
        return [
          {
            text: this.$t('dataSources.standardName'),
            value: "standard"
          },{
            text: this.$t('dataSources.httpName'),
            value: "http"
          },{
            text: this.$t('dataSources.avevaName'),
            value: "aveva"
          },{
            text: this.$t('dataSources.p6Name'),
            value: "p6"
          },{
            text: this.$t('timeseries.timeseries'),
            value: "timeseries"
          },{
            text: this.$t('dataSources.customName'),
            value: "custom"
          }
        ]
      },
      defaultSelected(): {text: string, value: string}[] {
        return [
          {
            text: this.$t('dataSources.standardName'),
            value: "standard"
          },{
            text: this.$t('dataSources.httpName'),
            value: "http"
          },{
            text: this.$t('timeseries.timeseries'),
            value: "timeseries"
          }
        ]
      }
    },

    methods: {
      setDataSource() {
        this.$emit('selected',this.selected!.map(i => i.value))
      }
    },

    mounted() {
      if(this.values && this.values.length >  0) {
        this.selected = this.dataSourceTypes.filter(t => this.values!.find(v => v === t.value))
      } else {
        this.selected = this.defaultSelected;
      }

      this.$emit('selected',this.selected.map(i => i.value))
    }
  })
</script>
