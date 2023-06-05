<template>
  <v-select
      :items="operators"
      v-model="selected"
      @change="setOperator"
      :disabled="disabled"
      :label="$t('operators.select')"
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
    {text: this.$t('operators.equals'), value: 'eq'},
    {text: this.$t('operators.notEquals'), value: 'neq'},
    {text: this.$t('operators.like'), value: 'like'},
    {text: this.$t('operators.in'), value: 'in'},
    {text: this.$t('operators.lessThan'), value: '<'},
    {text: this.$t('operators.greaterThan'), value: '>'},
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