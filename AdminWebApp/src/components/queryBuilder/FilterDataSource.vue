<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('dataSources.dataSource')}}</v-col>
      <v-col :cols="3">
        <SelectOperators
            :disabled="disabled"
            @selected="setOperator"
            :operator="operator"
            :custom_operators="operators"
        ></SelectOperators>
      </v-col>
      <v-col :cols="6">
        <SelectDataSource
          :containerID="containerID"
          :multiple="operator === 'in'"
          :disabled="disabled"
          :dataSourceID="dataSource"
          @selected="setDataSource"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import SelectDataSource from "@/components/dataSources/SelectDataSource.vue";
  import SelectOperators from "@/components/queryBuilder/SelectOperators.vue";
  import {DataSourceT} from "@/api/types";

  interface FilterDataSourceModel {
    operator: string
    dataSource: string | string[]
  }

  export default Vue.extend ({
    name: 'FilterDataSource',

    components: { SelectDataSource, SelectOperators },

    props: {
      containerID: {type: String, required: true},
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false},
    },

    computed: {
      operators(): {text: string, value: string}[] {
        return [
          {text: this.$t('operators.equals'), value: 'eq'},
          {text: this.$t('operators.notEquals'), value: 'neq'},
          {text: this.$t('operators.in'), value: 'in'},
        ];
      },
      part(): QueryPart {
        return {
          componentName: 'FilterDataSource',
          operator: this.operator,
          value: this.dataSource
        }
      }
    },

    data: (): FilterDataSourceModel => ({
      operator: "",
      dataSource: ""
    }),

    beforeMount() {
      if (this.queryPart) {
        this.operator = this.queryPart.operator
        this.dataSource = this.queryPart.value
      }
    },

    methods: {
      setOperator(operator: string) {
        this.operator = operator
      },
      setDataSource(dataSources: DataSourceT | DataSourceT[]) {
        if(Array.isArray(dataSources)) {
          const ids: string[] = []
          dataSources.forEach(source => ids.push(source.id!))

          this.dataSource = ids
        } else {
          this.dataSource = dataSources.id!
        }
      },
      onQueryPartChange() {
        this.$emit('update', this.part)
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
    componentName: 'FilterDataSource';
    operator: string;
    value: any;
    nested?: QueryPart[];
  }
</script>
