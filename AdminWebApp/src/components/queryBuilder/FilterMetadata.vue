<template>
  <v-container>
    <v-row>
      <v-col :cols="4">
        <v-text-field
          :label="$t('query.metadataProperty')"
          clearable
          v-model="key"
          :disabled="disabled"
        />
      </v-col>
      <v-col :cols="3">
        <SelectOperators :disabled="disabled" @selected="setOperator" :operator="operator"></SelectOperators>
      </v-col>
      <v-col :cols="4">
        <v-combobox v-if="operator === 'in'"
          :disabled="disabled"
          multiple
          clearable
          :placeholder="$t('general.typeToAdd')"
          @change="setValue"
          v-model="value"
        />
        <v-text-field v-else
          :placeholder="$t('general.typeToAdd')"
          clearable
          v-model="value"
          :disabled="disabled"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import SelectOperators from "@/components/queryBuilder/SelectOperators.vue";

  interface FilterMetadataModel {
    key: string
    operator: string
    value: string
  }

  export default Vue.extend ({
    name: 'FilterMetadata',

    components: { SelectOperators },

    props: {
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false},
    },

    data: (): FilterMetadataModel => ({
      key: "",
      operator: "",
      value: ""
    }),

    beforeMount() {
      if (this.queryPart) {
        this.key = this.queryPart.key
        this.operator = this.queryPart.operator
        this.value = this.queryPart.value
      }
    },

    computed: {
      part(): QueryPart {
        return {
          componentName: 'FilterMetadata',
          key: this.key,
          operator: this.operator,
          value: this.value
        }
      }
    },

    methods: {
      setOperator(operator: string) {
        this.operator = operator
      },
      setValue(value: string) {
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

  // QueryPart matches the type expected by the query builder- this allows us to use Object.assign and copy
  // changes
  type QueryPart = {
    componentName: 'FilterMetadata',
    key: string,
    operator: string,
    value: any;
    nested?: QueryPart[];
    options?: {[key: string]: any}
  }
</script>