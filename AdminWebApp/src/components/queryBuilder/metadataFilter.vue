<template>
  <v-container>
    <v-row>
      <v-col :cols="4">
        <v-text-field
          :label="$t('dataQuery.metadataKey')"
          clearable
          v-model="key"
          :disabled="disabled"
        />
      </v-col>
      <v-col :cols="3">
        <operators-select :disabled="disabled" @selected="setOperator" :operator="operator"></operators-select>
      </v-col>
      <v-col :cols="4">
        <v-combobox v-if="operator === 'in'"
          :disabled="disabled"
          multiple
          clearable
          :placeholder="$t('queryBuilder.typeToAdd')"
          @change="setValue"
          v-model="value"
        />
        <v-text-field v-else
          :placeholder="$t('queryBuilder.typeToAdd')"
          clearable
          v-model="value"
          :disabled="disabled"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";
@Component({components:{OperatorsSelect}})
export default class MetadataFilter extends Vue {
  @Prop({required: false})
  queryPart?: QueryPart

  @Prop({required: false, default: false})
  disabled?: boolean

  key = ""
  operator = ""
  value = ""
  
  beforeMount(){
    if (this.queryPart) {
      this.key = this.queryPart.key
      this.operator = this.queryPart.operator
      this.value = this.queryPart.value
    }
  }

  setOperator(operator: string) {
    this.operator = operator
  }

  setValue(value: string) {
    this.value = value
  }

  get part(): QueryPart {
    return {
      componentName: 'MetadataFilter',
      key: this.key,
      operator: this.operator,
      value: this.value
    }
  }

  @Watch('part')
  onQueryPartChange() {
    if(!this.disabled) {
      this.$emit('update', this.part)
    }
  }
}

// QueryPart matches the type expected by the query builder- this allows us to use Object.assign and copy
// changes
type QueryPart = {
  componentName: 'MetadataFilter',
  key: string,
  operator: string,
  value: any;
  nested?: QueryPart[];
  options?: {[key: string]: any}
}
</script>