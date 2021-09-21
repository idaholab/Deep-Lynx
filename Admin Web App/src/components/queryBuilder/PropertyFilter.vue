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
        ></v-combobox>
      </v-col>
      <v-col :cols="3">
        <operators-select :disabled="disabled" @selected="setOperator" :operator="operator"></operators-select>
      </v-col>
      <v-col :cols="6">
        <v-combobox
            :disabled="disabled"
            :multiple="operator === 'in'"
            :clearable="operator === 'in'"
            :placeholder="$t('queryBuilder.typeToAdd')"
            @change="setValue"
            v-model="value"
        >
        </v-combobox>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import SelectDataSource from "@/components/selectDataSource.vue";
import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";
import {MetatypeKeyT} from "@/api/types";

@Component({components:{SelectDataSource, OperatorsSelect}})
export default class PropertyFilter extends Vue {
  @Prop({required: true, default: []})
  readonly keys?: MetatypeKeyT[]

  @Prop({required: false})
  queryPart?: QueryPart

  @Prop({required: false, default: false})
  disabled?: boolean

  property: MetatypeKeyT | null | string = null
  operator = ""
  value = ""

  beforeMount(){
    if(this.queryPart) {
      this.property = this.queryPart.property
      this.operator = this.queryPart.operator
      this.value = this.queryPart.value
    }
  }

  setOperator(operator: string) {
    this.operator = operator
  }

  setValue(value: any) {
    this.value = value
  }

  get part(): QueryPart {
    return {
      componentName: 'PropertyFilter',
      property: (this.property as MetatypeKeyT)?.property_name!,
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

// QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
// changes
type QueryPart = {
  componentName: 'PropertyFilter';
  property: string;
  operator: string;
  value: any;
  nested?: QueryPart[];
}
</script>