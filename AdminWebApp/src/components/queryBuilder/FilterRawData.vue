<template>
  <v-container>
    <v-row>
      <v-col :cols="4">
        <v-text-field
          :label="$t('properties.name')"
          clearable
          v-model="key"
          :disabled="disabled"
        ></v-text-field>
      </v-col>
      <v-col :cols="3">
        <operators-select :disabled="disabled" @selected="setOperator" :operator="operator"></operators-select>
      </v-col>
      <v-col :cols="5">
        <v-combobox v-if="operator === 'in'"
          :disabled="disabled"
          multiple
          clearable
          :placeholder="$t('general.typeToAdd')"
          @change="setValue"
          v-model="value"
        ></v-combobox>
        <v-text-field v-else
          :placeholder="$t('general.typeToAdd')"
          clearable
          v-model="value"
          :disabled="disabled"
        ></v-text-field>
        <v-checkbox
          v-model="includeRawDataHistory"
          :label="$t('query.includeHistoricalRaw')"
          :disabled="disabled"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";

  interface FilterRawDataModel {
    key: string,
    operator: string,
    value: string,
    includeRawDataHistory: boolean
  }

  export default Vue.extend ({
    name: 'FilterRawData',

    components: {OperatorsSelect},

    props: {
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false}
    },

    data: (): FilterRawDataModel => ({
      key: "",
      operator: "",
      value: "",
      includeRawDataHistory: true
    }),

    beforeMount() {
      if (this.queryPart) {
        this.key = this.queryPart.key
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
          componentName: 'FilterRawData',
          key: this.key,
          operator: this.operator,
          value: this.value,
          options: {historical: this.includeRawDataHistory}
        }
      }
    },

    watch: {
      part: {
        handler: 'onQueryPartChange',
        immediate: true
      }
    },
  });

  // QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
  // changes
  type QueryPart = {
    componentName: 'FilterRawData';
    key: string;
    operator: string;
    value: any;
    nested?: QueryPart[];
    options?: {[key: string]: any}
  }
</script>