<template>
  <v-container>
    <v-row>
      <!-- Filter Type -->
      <v-col :cols="4" v-if="mode === 'FilterMetadata' || mode === 'FilterRawData'">
        <v-text-field
          :label="$t('properties.name')"
          clearable
          v-model="key"
          :disabled="disabled"
        ></v-text-field>
      </v-col>

      <v-col v-else :cols="3" style="padding-top:30px" class="text-right">
        {{ $t(getTranslationKey(mode)) }}
      </v-col>
      
      <!-- Operator -->
      <v-col :cols="3">
        <SelectOperators 
          @selected="setOperator" 
          :operator="operator" 
          :disabled="disabled"
          :custom_operators="operators"
        />
      </v-col>

      <!-- Value -->
      <v-col :cols="5" v-if="mode === 'FilterMetadata' || mode === 'FilterRawData'">
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
          @change="setValue"
        ></v-text-field>

        <v-checkbox v-if="mode === 'FilterRawData'"
          v-model="includeRawDataHistory"
          :label="$t('query.includeHistoricalRaw')"
          :disabled="disabled"
        />
      </v-col>

      <v-col :cols="6" v-else>
        <div v-if="mode === 'FilterMetatype'">
          <SearchMetatypes
            :disabled="disabled"
            :containerID="containerID"
            :metatypeID="metatype"
            :multiple="operator === 'in'"
            @selected="setMetatype">
          </SearchMetatypes>
          <v-checkbox
            v-model="limitOntologyVersion" 
            :label="$t('query.limitOntology')"
            :disabled="disabled"
          />
        </div>

        <div v-else-if="mode === 'FilterDataSource'">
          <SelectDataSource
            :containerID="containerID"
            :multiple="operator === 'in'"
            :disabled="disabled"
            :dataSourceID="dataSource"
            @selected="setDataSource"
          />
        </div>

        <v-text-field v-else
          :placeholder="$t('general.typeToAdd')"
          clearable
          v-model="value"
          :disabled="disabled"
          @change="setValue"
        ></v-text-field>
      </v-col>
    </v-row>
    <div v-if="mode === 'FilterMetatype'">
      <v-row v-if="(metatype !== '' && !disabled) || disabled && keyQueryParts.length >= 1">
        <v-col align="left"><p>{{$t('query.FilterProperty')}}</p></v-col>
        <v-col v-if="loading" :cols="12" align="center"><v-progress-circular indeterminate></v-progress-circular></v-col>
        <v-col v-if="!loading" :cols="12" align="center">
          <div v-for="part in keyQueryParts" :key="part.id" style="margin-top: 10px">
            <v-flex class="text-right">
              <v-icon class="justify-right" @click="removeQueryPart(part)">mdi-window-close</v-icon>
            </v-flex>
            <FilterProperty
              :keys="metatypeKeys"
              :queryPart="part"
              :disabled="disabled"
              @update="updateQueryPart(part, $event)"
            />
          </div>
        </v-col>
        <v-col v-if="!loading && !disabled" :cols="12" align="center">{{$t('query.clickToAddProperty')}}</v-col>
        <v-col v-if="!loading && !disabled" :cols="12" align="center">
          <v-icon
            large
            @click="addQueryPart"
          >
            mdi-plus-circle
          </v-icon>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script lang="ts">
  import Vue, {PropType} from 'vue';
  import SelectDataSource from "@/components/dataSources/SelectDataSource.vue";
  import SelectOperators from "@/components/queryBuilder/SelectOperators.vue";
  import { DataSourceT, MetatypeKeyT, MetatypeT } from "@/api/types";
  import SearchMetatypes from "@/components/ontology/metatypes/SearchMetatypes.vue";
  import FilterProperty from "@/components/queryBuilder/FilterProperty.vue";
  import {v4 as uuidv4} from "uuid";

  interface FilterTypesModel {
    operator: string
    // dataSource: DataSourceT | DataSourceT[]
    dataSource: string | string[]
    value: any
    key: string
    metatype: string | string[]
    uuid: string | string[]
    metatypeKeys: MetatypeKeyT[]
    loading: boolean
    keyQueryParts: QueryPart[]
    limitOntologyVersion: boolean
    includeRawDataHistory: boolean
  }

  export default Vue.extend({
    name: 'FilterTypes',

    components: { 
      SelectDataSource, 
      SelectOperators, 
      FilterProperty, 
      SearchMetatypes 
    },

    props: {
      mode: {type: String, required: true},
      containerID: {type: String, required: true},
      queryPart: {type: Object as PropType<QueryPart>, required: false},
      disabled: {type: Boolean, required: false, default: false},
    },

    computed: {
      operators(): {text: string, value: string}[] {
        if (this.mode === 'FilterMetatype' || this.mode === 'FilterDataSource') {
          return [
            {text: this.$t('operators.equals'), value: 'eq'},
            {text: this.$t('operators.notEquals'), value: 'neq'},
            {text: this.$t('operators.in'), value: 'in'},
          ];
        } else if (this.mode === 'FilterID') {
          return [
            {text: this.$t('operators.equals'), value: 'eq'},
            {text: this.$t('operators.notEquals'), value: 'neq'},
            {text: this.$t('operators.in'), value: 'in'},
            {text: this.$t('operators.lessThan'), value: '<'},
            {text: this.$t('operators.greaterThan'), value: '>'},
          ]
        } else {
          return [
            {text: this.$t('operators.equals'), value: 'eq'},
            {text: this.$t('operators.notEquals'), value: 'neq'},
            {text: this.$t('operators.like'), value: 'like'},
            {text: this.$t('operators.in'), value: 'in'},
            {text: this.$t('operators.lessThan'), value: '<'},
            {text: this.$t('operators.greaterThan'), value: '>'},
          ]
        }
      },
      part(): QueryPart {
        // Define part object based on mode
        switch(this.mode) {
          case 'FilterMetatype': {
            return {
              componentName: 'FilterMetatype',
              operator: this.operator,
              value: this.metatype,
              nested: this.keyQueryParts,
              options: {limitOntology: this.limitOntologyVersion, uuids: this.uuid}
            };
          }
          case 'FilterDataSource': {
            return {
              componentName: 'FilterDataSource',
              operator: this.operator,
              value: this.dataSource,
            };
          }
          case 'FilterID': {
            return {
              componentName: 'FilterID',
              operator: this.operator,
              value: this.value,
            };
          }
          case 'FilterOriginalID': {
            return {
              componentName: 'FilterOriginalID',
              operator: this.operator,
              value: this.value,
            };
          }
          case 'FilterMetadata': {
            return {
              componentName: 'FilterMetadata',
              key: this.key,
              operator: this.operator,
              value: this.value,
            };
          }
          case 'FilterRawData': {
            return {
              componentName: 'FilterRawData',
              key: this.key,
              operator: this.operator,
              value: this.value,
              options: {historical: this.includeRawDataHistory}
            };
          }
          default: { // return blank queryPart for the sake of typing, however it will always be one of the above
            return {
              componentName: '',
              operator: this.operator,
              value: this.value
            }
          }
        }
      },
    },

    data: (): FilterTypesModel => ({
      operator: "",
      dataSource: [],
      value: undefined,
      key: "",
      metatype: "",
      uuid: "",
      metatypeKeys: [],
      loading: false,
      keyQueryParts: [],
      limitOntologyVersion: false,
      includeRawDataHistory: true,
    }),

    beforeMount() {
      if (this.queryPart) {
        this.operator = this.queryPart.operator;
        this.dataSource = this.queryPart.value;
        this.value = this.queryPart.value;
        this.key = this.queryPart.value;  
        this.metatype = this.queryPart.value;
        this.keyQueryParts = (this.queryPart.nested) ? this.queryPart.nested : [];
      }
    },

    methods: {
      getTranslationKey(mode: string): string {
        switch (mode) {
          case 'FilterMetatype':
            return 'classes.class';
          case 'FilterDataSource':
            return 'dataSources.dataSource';
          case 'FilterID':
            return 'general.deepLynxID';
          case 'FilterOriginalID':
            return 'general.originalID';
          default:
            return mode;
        }
      },
      setOperator(operator: string) {
        this.operator = operator
      },
      setMetatype(metatypes: MetatypeT | MetatypeT[]) {
        if(Array.isArray(metatypes)) {
          const ids: string[] = []
          const uuids: string[] = []
          this.metatypeKeys = []
          this.loading = true

          metatypes.forEach(source => {
            ids.push(source.id!)
            uuids.push(source.uuid!)

            this.$client.listMetatypeKeys(this.containerID, source.id!)
                .then(keys => {
                  this.metatypeKeys.push(...keys)
                  this.loading = false
                })
          })

          this.metatype = ids
          this.uuid = uuids
        } else {
          this.metatype = metatypes.id!
          this.uuid = metatypes.uuid!

          this.$client.listMetatypeKeys(this.containerID, metatypes.id!)
              .then(keys => {
                this.metatypeKeys.push(...keys)
                this.loading = false
              })
        }
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
      setValue(value: any) {
        this.value = value;
      },
      onQueryPartChange() {
        if(!this.disabled) {
          this.$emit('update', this.part)
        }
      },
      addQueryPart() {
        this.keyQueryParts.push({
          id: uuidv4(),
          componentName: 'FilterProperty',
          operator: '',
          value: ''
        })
      },
      removeQueryPart(toRemove: QueryPart) {
        this.keyQueryParts= this.keyQueryParts.filter(part => part.id !== toRemove.id)
      },
      updateQueryPart(toUpdate: QueryPart, update: QueryPart) {
        Object.assign(toUpdate, update)
      }
    },

    watch: {
      part: {
        handler: 'onQueryPartChange'
      }
    },
  });

  // QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
  // changes
  type QueryPart = {
    id?: string;
    componentName: string;
    property?: string;
    key?: string,
    operator: string;
    value: any;
    nested?: QueryPart[];
    options?: {[key: string]: any};
  }

</script>