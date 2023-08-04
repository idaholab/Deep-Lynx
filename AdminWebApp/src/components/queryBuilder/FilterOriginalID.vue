<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('general.originalID')}}</v-col>
      <v-col :cols="3">
        <SelectOperators @selected="setOperator" :operator="operator" :disabled="disabled"></SelectOperators>
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
  import SelectDataSource from "@/components/dataSources/SelectDataSource.vue";
  import SelectOperators from "@/components/queryBuilder/SelectOperators.vue";

  interface FilterOriginalIDModel {
    operator: string
    value: string
  }

  export default Vue.extend ({
    name: 'FilterOriginalID',

    components: { SelectDataSource, SelectOperators },

    props: {
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false},
    },

    data: (): FilterOriginalIDModel => ({
      operator: "",
      value: ""
    }),

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

    computed: {
      part(): QueryPart {
        return {
          componentName: 'FilterOriginalID',
          operator: this.operator,
          value: this.value
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
    componentName: 'FilterOriginalID';
    operator: string;
    value: any;
    nested?: QueryPart[];
  }
</script>