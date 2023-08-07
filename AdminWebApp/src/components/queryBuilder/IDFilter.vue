<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('general.deepLynxID')}}</v-col>
      <v-col :cols="3">
        <operators-select 
          @selected="setOperator" 
          :operator="operator" 
          :disabled="disabled"
          :custom_operators="operators"
        ></operators-select>
      </v-col>
      <v-col :cols="6">
        <v-text-field v-if="operator !== 'in'"
          :placeholder="$t('general.typeToAdd')"
          @change="setValue"
          :disabled="disabled"
          v-model="value"
        ></v-text-field>
        <v-combobox v-if="operator === 'in'"
          multiple
          clearable
          :placeholder="$t('general.typeToAdd')"
          @change="setValue"
          :disabled="disabled"
          v-model="value"
        ></v-combobox>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import SelectDataSource from "@/components/dataSources/SelectDataSource.vue";
import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";

@Component({components:{SelectDataSource, OperatorsSelect}})
export default class IDFilter extends Vue {
  @Prop({required: false})
  queryPart?: QueryPart

  @Prop({required: false, default: false})
  disabled?: boolean

  operator = ""
  value = ""

  operators = [
    {text: this.$t('operators.equals'), value: 'eq'},
    {text: this.$t('operators.notEquals'), value: 'neq'},
    {text: this.$t('operators.in'), value: 'in'},
    {text: this.$t('operators.lessThan'), value: '<'},
    {text: this.$t('operators.greaterThan'), value: '>'},
  ]

  beforeMount() {
    if(this.queryPart) {
      this.operator = this.queryPart.operator
      this.value = this.queryPart.value
    }
  }

  setOperator(operator: string) {
    this.operator = operator
  }

  setValue(value: any) {
    this.value = value
  }

  get part(): QueryPart {
    return {
      componentName: 'IDFilter',
      operator: this.operator,
      value: this.value
    }
  }

  @Watch('part')
  onQueryPartChange() {
    if(!this.disabled) {
      this.$emit('update', this.part)
    }
  }
}

// QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
// changes
type QueryPart = {
  componentName: 'IDFilter';
  operator: string;
  value: any;
  nested?: QueryPart[];
}
</script>