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
  import Vue, { PropType } from 'vue'

  interface SelectOperatorsModel {
    selected: string
  }

  export default Vue.extend ({
    name: 'SelectOperators',

    props: {
      operator: {type: String},
      disabled: {type: Boolean, required: false, default: false},
      custom_operators: {type: Array as PropType<{[key: string]: any}[]>},
    },

    computed: {
      default_operators(): {text: string, value: string}[] {
        return [
          {text: this.$t('operators.equals'), value: 'eq'},
          {text: this.$t('operators.notEquals'), value: 'neq'},
          {text: this.$t('operators.like'), value: 'like'},
          {text: this.$t('operators.in'), value: 'in'},
          {text: this.$t('operators.lessThan'), value: '<'},
          {text: this.$t('operators.greaterThan'), value: '>'},
        ];
      },
      operators(): {[key: string]: any}[] {
        return this.custom_operators !== undefined ? this.custom_operators : this.default_operators;
      }
    },

    data: (): SelectOperatorsModel => ({
      selected: ""
    }),

    beforeMount() {
      if (this.operator !== '') {
        this.selected = this.operators.find(o => o.value === this.operator)!.value!;
      }
    },

    methods: {
      setOperator(operator: string) {
        this.selected = operator
      },
      onSelectedChange() {
        this.$emit('selected', this.selected)
      }
    },

    watch: {
      selected: {
        handler: 'onSelectedChange'
      }
    }
  });
</script>