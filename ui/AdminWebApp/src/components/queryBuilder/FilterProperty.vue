<template>
  <v-container>
    <v-row>
      <v-col :cols="3" >
        <v-combobox
          :items="keys"
          item-text="name"
          item-value="property_name"
          :disabled="disabled"
          v-model="property"
          :label="$t('properties.name')"
        ></v-combobox>
      </v-col>
      <v-col :cols="3">
        <SelectOperators :disabled="disabled" @selected="setOperator" :operator="operator"></SelectOperators>
      </v-col>
      <v-col :cols="6">
        <v-text-field v-if="operator !== 'in'"
          :placeholder="$t('general.typeToAdd')"
          @change="setValue"
          :disabled="disabled"
          v-model="value"
        ></v-text-field>
        <v-combobox v-if="operator === 'in'"
          :disabled="disabled"
          multiple
          clearable
          :placeholder="$t('general.typeToAdd')"
          @change="setValue"
          v-model="value"
        ></v-combobox>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
  import Vue, {PropType} from 'vue';
  import SelectOperators from "@/components/queryBuilder/SelectOperators.vue";
  import {MetatypeKeyT} from "@/api/types";

  interface FilterPropertyModel {
    property: MetatypeKeyT | null | string
    operator: string
    value: string
  }

  export default Vue.extend ({
    name: 'FilterProperty',

    components: { SelectOperators },

    props: {
      keys: {
        type: Array as PropType<MetatypeKeyT[]>,
        required: true,
        default: () => []
      },
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false},
    },

    data: (): FilterPropertyModel => ({
      property: null,
      operator: "",
      value: ""
    }),

    beforeMount() {
      if (this.queryPart) {
        this.property = this.queryPart.property
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
          componentName: 'FilterProperty',
          property: (this.property as MetatypeKeyT)?.property_name!,
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
    componentName: 'FilterProperty';
    property: string;
    operator: string;
    value: any;
    nested?: QueryPart[];
  }
</script>