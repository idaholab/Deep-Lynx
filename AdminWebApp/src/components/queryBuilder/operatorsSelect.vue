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

  operators = [
    {text: 'equals', value: 'eq'},
    {text: 'not equals', value: 'neq'},
    {text: 'like', value: 'like'},
    {text: 'in', value: 'in'},
  ]

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