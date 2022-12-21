<template>
  <v-select
      :items="operators"
      v-model="selected"
      @change="setOperator"
      :disabled="disabled"
      :label="$t('queryBuilder.selectOperator')"
  ></v-select>
</template>

<script lang="ts">

import {Component, Prop, Vue, Watch} from "vue-property-decorator";

@Component
export default class OperatorsSelect extends Vue {
  @Prop()
  operator?: string

  @Prop({required: false, default: false})
  disabled?: boolean

  @Prop()
  custom_operators?: {[key: string]: any}[]

  default_operators = [
    {text: 'equals', value: 'eq'},
    {text: 'not equals', value: 'neq'},
    {text: 'like', value: 'like'},
    {text: 'in', value: 'in'},
    {text: 'less than', value: '<'},
    {text: 'greater than', value: '>'},
  ]

  // override default operators if specified
  operators = this.custom_operators !== undefined ? this.custom_operators : this.default_operators

  selected = ""

  beforeMount() {
    if(this.operator !== '') {
      this.selected = this.operators.find(o => o.value === this.operator)?.value!
    }
  }

  setOperator(operator: string) {
    this.selected = operator
  }

  @Watch('selected')
  onSelectedChange() {
    this.$emit('selected', this.selected)
  }
}
</script>