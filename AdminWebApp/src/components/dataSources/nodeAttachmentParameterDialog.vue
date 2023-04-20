<template>
  <div>
    <h4 style="padding-top: 150px">{{$t('dataMapping.nodeAttachmentParameters')}}<info-tooltip :message="$t('dataMapping.nodeAttachmentParametersHelp')"></info-tooltip></h4>
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
            :label="$t('dataMapping.type')"
            :items=parameterFilterTypes
            v-model="item.type"
            :rules="[v => !!v || $t('dataMapping.required')]"
        />
        <div v-if="index > 0">
          <span style="position: absolute; margin-top: -70px; margin-left: -40px;">AND</span>
        </div>
      </template>

      <template v-slot:[`item.operator`]="{ item }">
        <v-select
            :label="$t('dataMapping.operators')"
            :items=getOperators(item.type)
            v-model="item.operator"
            :rules="[v => !!v || $t('dataMapping.required')]"
        />
      </template>

      <template v-slot:[`item.value`]="{ item}">
        <div v-if="item.operator !== 'exists'">
          <div v-if="item.type && item.type === 'data_source'">
            <select-data-source
                :containerID="containerID"
                :multiple="item.operator === 'in'"
                :disabled="!item.type"
                :dataSourceID="item.value"
                @selected="setDataSource(...arguments, item)"
            />
          </div>

          <div v-else-if="item.type && item.type === 'metatype_name'">
            <search-metatypes
                :disabled="!item.type"
                :containerID="containerID"
                :multiple="item.operator === 'in'"
                :metatypeName="item.value"
                @selected="setMetatype(...arguments, item)"
            />
          </div>

          <div v-else>
            <v-text-field
                v-if="item.type && item.type ==='property'"
                :label="$t('createDataSource.key')"
                v-model="item.key"
                :rules="[v => !!v || $t('dataMapping.required')]"
            />

            <v-text-field
                v-if="item.operator !== 'in'"
                :disabled="item.type === 'property' && !item.key"
                :label="$t('createDataSource.value')"
                v-model="item.value"
                :rules="[v => !!v || $t('dataMapping.required')]"
            />
            <v-combobox
                v-if="item.operator === 'in'"
                :disabled="item.type === 'property' && !item.key"
                multiple
                clearable
                :placeholder="$t('queryBuilder.typeToAdd')"
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
        <v-btn @click="addParameter">{{$t('dataMapping.addColumn')}}</v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import {DataSourceT, MetatypeT, TimeseriesDataSourceConfig} from "@/api/types";
import SelectDataSource from './selectDataSource.vue';
import SearchMetatypes from '../ontology/metatypes/searchMetatypes.vue';

@Component({components: {SelectDataSource, SearchMetatypes}})
export default class NodeAttachmentParameterDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: true})
  readonly timeseriesConfig!: TimeseriesDataSourceConfig;

  parameterFilterTypes = [{text: 'Data Source ID', value: 'data_source'},
    {text: 'Metatype ID', value: 'metatype_id'},
    {text: 'Metatype Name', value: 'metatype_name'},
    {text: 'Original Node ID', value: 'original_id'},
    {text: 'Property', value: 'property'},
    {text: 'Id', value: 'id'}];

  operators = [
    {text: "equals", value: "==", requiresValue: true},
    {text: "not equals", value: "!=", requiresValue: true},
    {text: "in", value: "in", requiresValue: true},
    {text: "contains", value: "contains", requiresValue: true},
    {text: "exists", value: "exists", requiresValue: false},
    {text: "less than", value: "<", requiresValue: true},
    {text: "less than or equal to", value: "<=", requiresValue: true},
    {text: "greater than", value: ">", requiresValue: true},
    {text: "greater than or equal to", value: ">=", requiresValue: true},
  ]

  attachmentHeader() {
    return [
      {
        text: this.$t('dataMapping.type'),
        value: "type"
      },
      {
        text: this.$t('dataMapping.operator'),
        value: "operator"
      },
      {
        text: this.$t('createDataSource.value'),
        value: "value"
      },
      {text: this.$t('dataMapping.actions'), value: "actions", sortable: false}
    ]
  }

  // return only operators that make sense based on parameter filter type
  getOperators(paramFilter: string) {
    const baseOperators = [
      {text: "equals", value: "==", requiresValue: true},
      {text: "not equals", value: "!=", requiresValue: true},
      {text: "in", value: "in", requiresValue: true},
    ]

    if (paramFilter === 'data_source' || paramFilter === 'metatype_name') {
      return baseOperators
    }

    if (paramFilter === 'metatype_id' || paramFilter === 'id') {
      return baseOperators.concat([
        {text: "less than", value: "<", requiresValue: true},
        {text: "less than or equal to", value: "<=", requiresValue: true},
        {text: "greater than", value: ">", requiresValue: true},
        {text: "greater than or equal to", value: ">=", requiresValue: true},
      ]);
    }

    return this.operators
  }

  setDataSource(dataSources: DataSourceT | DataSourceT[], item: any) {
    if (Array.isArray(dataSources)) {
      const ids: string[] = []
      dataSources.forEach(source => ids.push(source.id!))

      item.value = ids
    } else {
      item.value = dataSources.id!
    }
  }

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
  }

  removeParameter(index: any) {
    this.$emit('removeParameter', index)
  }

  addParameter() {
    this.$emit('addParameter')
  }
}
</script>