<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('general.deepLynxID')}}</v-col>
      <v-col :cols="3">
        <SelectOperators 
          @selected="setOperator" 
          :operator="operator" 
          :disabled="disabled"
          :custom_operators="operators"
        />
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
  import Vue, { PropType } from 'vue';
  import SelectOperators from "@/components/queryBuilder/SelectOperators.vue";

  interface FilterIDModel {
    operator: string
    value: string
  }

  export default Vue.extend ({
    name: 'FilterID',

    components: { SelectOperators },

    props: {
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false},
    },

    data: (): FilterIDModel => ({
      operator: "",
      value: ""
    }),

    computed: {
      operators(): {text: string, value: string}[] {
        return [
          {text: this.$t('operators.equals'), value: 'eq'},
          {text: this.$t('operators.notEquals'), value: 'neq'},
          {text: this.$t('operators.in'), value: 'in'},
          {text: this.$t('operators.lessThan'), value: '<'},
          {text: this.$t('operators.greaterThan'), value: '>'},
        ]
      },
      part(): QueryPart {
        return {
          componentName: 'FilterID',
          operator: this.operator,
          value: this.value
        }
      }
    },

    beforeMount() {
      if (this.queryPart) {
        this.operator = this.queryPart.operator
        this.value = this.queryPart.value
      }
    },

    methods: {
      setOperator(operator: string) {
        this.operator = operator
      },
      setValue(value: any) {
        this.value = value
      },
      onQueryPartChange() {
        if(!this.disabled) {
          this.$emit('update', this.part)
        }
      }
    },

    watch: {
      part: {
        handler: 'onQueryPartChange'
      }
    }
  });

  // QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
  // changes
  type QueryPart = {
    componentName: 'FilterID';
    operator: string;
    value: any;
    nested?: QueryPart[];
  }
</script>