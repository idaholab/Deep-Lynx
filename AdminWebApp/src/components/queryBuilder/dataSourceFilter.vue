<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('queryBuilder.dataSource')}}</v-col>
      <v-col :cols="3">
        <operators-select
            :disabled="disabled"
            @selected="setOperator"
            :operator="operator"></operators-select>
      </v-col>
      <v-col :cols="6">
        <select-data-source
            :containerID="containerID"
            :multiple="operator === 'in'"
            :disabled="disabled"
            :dataSourceID="dataSource"
            @selected="setDataSource"></select-data-source>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import SelectDataSource from "@/components/dataSources/selectDataSource.vue";
import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";
import {DataSourceT} from "@/api/types";

@Component({components:{SelectDataSource, OperatorsSelect}})
export default class DataSourceFilter extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: false})
  queryPart?: QueryPart

  @Prop({required: false, default: false})
  disabled?: boolean

  operator = ""
  dataSource: string | string[] = ""

  beforeMount() {
    if(this.queryPart) {
      this.operator = this.queryPart.operator
      this.dataSource = this.queryPart.value
    }
  }

  setOperator(operator: string) {
    this.operator = operator
  }

  setDataSource(dataSources: DataSourceT | DataSourceT[]) {
    if(Array.isArray(dataSources)) {
      const ids: string[] = []
      dataSources.forEach(source => ids.push(source.id!))

      this.dataSource = ids
    } else {
      this.dataSource = dataSources.id!
    }
  }

  get part(): QueryPart {
    return {
      componentName: 'DataSourceFilter',
      operator: this.operator,
      value: this.dataSource
    }
  }

  @Watch('part')
  onQueryPartChange() {
    this.$emit('update', this.part)
  }
}

// QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
// changes
type QueryPart = {
  componentName: 'DataSourceFilter';
  operator: string;
  value: any;
  nested?: QueryPart[];
}
</script>