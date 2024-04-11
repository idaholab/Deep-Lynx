<template>
  <div>
    <h4 style="padding-top: 150px">{{$t('timeseries.attachmentParams')}}<info-tooltip :message="$t('help.attachmentParams')"></info-tooltip></h4>
    <v-data-table
        :headers="attachmentHeader()"
        :items="timeseriesConfig.attachment_parameters"
        :items-per-page="-1"
        mobile-breakpoint="960"
        item-key="id"
        flat
        tile
        fixed-header
        disable-pagination
        disable-sort
        hide-default-footer
    >

      <template v-slot:[`item.type`]="{ item, index}">
        <span style="visibility: hidden" :id="`node_attachment_${index}`"></span>
        <v-select
            :label="$t('query.filterType')"
            :items=parameterFilterTypes
            v-model="item.type"
            :rules="[validateRequired]"
        />
        <div v-if="index > 0">
          <span style="position: absolute; margin-top: -90px; margin-left: -20px;">{{$t('general.and')}}</span>
        </div>
      </template>

      <template v-slot:[`item.operator`]="{ item }">
        <v-select
            :label="$t('operators.operators')"
            :items=getOperators(item.type)
            v-model="item.operator"
            :rules="[validateRequired]"
        />
      </template>

      <template v-slot:[`item.value`]="{ item}">
        <div v-if="item.operator !== 'exists'">
          <div v-if="item.type && item.type === 'data_source'">
            <SelectDataSource
                :containerID="containerID"
                :multiple="item.operator === 'in'"
                :disabled="!item.type"
                :dataSourceID="item.value"
                @selected="setDataSource($event, item)"
            />
          </div>

          <div v-else-if="item.type && item.type === 'metatype_name'">
            <SearchMetatypes
                :disabled="!item.type"
                :containerID="containerID"
                :multiple="item.operator === 'in'"
                :metatypeName="item.value"
                @selected="setMetatype($event, item)"
            />
          </div>

          <div v-else>
            <v-text-field
                v-if="item.type && item.type ==='property'"
                :label="$t('general.key')"
                v-model="item.key"
                :rules="[validateRequired]"
            />

            <v-text-field
                v-if="item.operator !== 'in'"
                :disabled="item.type === 'property' && !item.key"
                :label="$t('general.value')"
                v-model="item.value"
                :rules="[validateRequired]"
            />
            <v-combobox
                v-if="item.operator === 'in'"
                :disabled="item.type === 'property' && !item.key"
                multiple
                clearable
                :placeholder="$t('general.typeToAdd')"
                v-model="item.value"
            />
          </div>
        </div>

      </template>

      <template v-slot:[`item.actions`]="{ index }">
        <v-icon @click="removeParameter(index)">mdi-close</v-icon>
      </template>

    </v-data-table>


    <v-row>
      <v-col :cols="12" style="padding:25px" align="center" justify="center">
        <v-btn @click="addParameter">{{$t('general.addColumn')}}</v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {DataSourceT, MetatypeT, TimeseriesDataSourceConfig} from "@/api/types";
  import SelectDataSource from './SelectDataSource.vue';
  import SearchMetatypes from '../ontology/metatypes/SearchMetatypes.vue';

  export default Vue.extend ({
    name: 'NodeAttachmentParameterDialog',

    components: { SelectDataSource, SearchMetatypes },

    props: {
      containerID: {type: String, required: true},
      timeseriesConfig: {
        type: Object as PropType<TimeseriesDataSourceConfig>,
        required: true
      },
    },

    computed: {
      parameterFilterTypes(): {text: string, value: string}[] {
        return [
          {text: this.$t('dataSources.id'), value: 'data_source'},
          {text: this.$t('classes.id'), value: 'metatype_id'},
          {text: this.$t('classes.name'), value: 'metatype_name'},
          {text: this.$t('general.originalID'), value: 'original_id'},
          {text: this.$t('properties.property'), value: 'property'},
          {text: this.$t('general.id'), value: 'id'}
        ]
      },
      operators(): {text: string, value: string, requiresValue: boolean}[] {
        return [
          {text: this.$t('operators.equals'), value: "==", requiresValue: true},
          {text: this.$t('operators.notEquals'), value: "!=", requiresValue: true},
          {text: this.$t('operators.in'), value: "in", requiresValue: true},
          {text: this.$t('operators.contains'), value: "contains", requiresValue: true},
          {text: this.$t('operators.exists'), value: "exists", requiresValue: false},
          {text: this.$t('operators.lessThan'), value: "<", requiresValue: true},
          {text: this.$t('operators.lte'), value: "<=", requiresValue: true},
          {text: this.$t('operators.greaterThan'), value: ">", requiresValue: true},
          {text: this.$t('operators.gte'), value: ">=", requiresValue: true}
        ]
      }
    },

    methods: {
      validateRequired(value: any): boolean | string {
        return !!value || this.$t('validation.required');
      },
      attachmentHeader() {
        return [
          {
            text: this.$t('query.filterType'),
            value: "type"
          },
          {
            text: this.$t('operators.operator'),
            value: "operator"
          },
          {
            text: this.$t('general.value'),
            value: "value"
          },
          {text: this.$t('general.actions'), value: "actions", sortable: false}
        ]
      },
      // return only operators that make sense based on parameter filter type
      getOperators(paramFilter: string) {
        const baseOperators = [
          {text: this.$t('operators.equals'), value: "==", requiresValue: true},
          {text: this.$t('operators.notEquals'), value: "!=", requiresValue: true},
          {text: this.$t('operators.in'), value: "in", requiresValue: true},
        ]

        if (paramFilter === 'data_source' || paramFilter === 'metatype_name') {
          return baseOperators
        }

        if (paramFilter === 'metatype_id' || paramFilter === 'id') {
          return baseOperators.concat([
            {text: this.$t('operators.lessThan'), value: "<", requiresValue: true},
            {text: this.$t('operators.lte'), value: "<=", requiresValue: true},
            {text: this.$t('operators.greaterThan'), value: ">", requiresValue: true},
            {text: this.$t('operators.gte'), value: ">=", requiresValue: true},
          ]);
        }

        return this.operators
      },
      setDataSource(dataSources: DataSourceT | DataSourceT[], item: any) {
        if (Array.isArray(dataSources)) {
          const ids: string[] = []
          dataSources.forEach(source => ids.push(source.id!))

          item.value = ids
        } else {
          item.value = dataSources.id!
        }
      },
      setMetatype(metatypes: MetatypeT | MetatypeT[], item: any) {
        if (Array.isArray(metatypes)) {
          const names: string [] = []

          metatypes.forEach(mt => {
            names.push(mt.name!)
          })

          item.value = names
        } else {
          item.value = metatypes.name!
        }
      },
      removeParameter(index: any) {
        this.$emit('removeParameter', index)
      },
      addParameter() {
        this.$emit('addParameter')
      }
    }
  });
</script>