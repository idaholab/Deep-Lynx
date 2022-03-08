<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('queryBuilder.metatype')}}</v-col>
      <v-col :cols="3">
        <operators-select
            :disabled="disabled"
            @selected="setOperator"
            :operator="operator"></operators-select>
      </v-col>
      <v-col :cols="6">
        <search-metatypes
            :disabled="disabled"
            :containerID="containerID"
            :metatypeID="metatype"
            :multiple="operator === 'in'"
            @selected="setMetatype"></search-metatypes>
      </v-col>
    </v-row>
    <v-row v-if="metatype !== ''">
      <v-col align="left"><p>{{$t('queryBuilder.PropertyFilter')}}</p></v-col>
      <v-col v-if="loading" :cols="12" align="center"><v-progress-circular indeterminate></v-progress-circular></v-col>
      <v-col v-if="!loading" :cols="12" align="center">
        <div v-for="part in keyQueryParts" :key="part.id" style="margin-top: 10px">
          <v-flex class="text-right">
            <v-icon class="justify-right" @click="removeQueryPart(part)">mdi-window-close</v-icon>
          </v-flex>
          <property-filter
              :keys="metatypeKeys"
              :queryPart="part"
              :disabled="disabled"
              @update="updateQueryPart(part, ...arguments)"></property-filter>
        </div>
      </v-col>
      <v-col v-if="!loading" :cols="12" align="center">{{$t('queryBuilder.clickToAddProperty')}}</v-col>
      <v-col v-if="!loading" :cols="12" align="center">
        <v-icon
            large
            @click="addQueryPart"
        >
          mdi-plus-circle
        </v-icon>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import SearchMetatypes from "@/components/ontology/metatypes/searchMetatypes.vue";
import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";
import {MetatypeKeyT, MetatypeT} from "@/api/types";
import PropertyFilter from "@/components/queryBuilder/PropertyFilter.vue";
import {v4 as uuidv4} from "uuid";

@Component({components:{SearchMetatypes, OperatorsSelect, PropertyFilter}})
export default class MetatypeFilter extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: false})
  queryPart?: QueryPart

  @Prop({required: false, default: false})
  disabled?: boolean

  operator = ""
  metatype: string | string[] = ""
  metatypeKeys: MetatypeKeyT[] = []
  loading = false
  keyQueryParts: QueryPart[] = []

  beforeMount() {
    if(this.queryPart) {
      this.operator = this.queryPart.operator
      this.metatype = this.queryPart.value
      this.keyQueryParts = (this.queryPart.nested) ? this.queryPart.nested : []
    }
  }

  setOperator(operator: string) {
    this.operator = operator
  }

  setMetatype(metatypes: MetatypeT | MetatypeT[]) {
    if(Array.isArray(metatypes)) {
      const ids: string[] = []
      this.metatypeKeys = []
      this.loading = true

      metatypes.forEach(source => {
        ids.push(source.id!)

        this.$client.listMetatypeKeys(this.containerID, source.id)
            .then(keys => {
              this.metatypeKeys.push(...keys)
              this.loading = false
            })
      })

      this.metatype = ids
    } else {
      this.metatype = metatypes.id!

      this.$client.listMetatypeKeys(this.containerID, metatypes.id!)
          .then(keys => {
            this.metatypeKeys.push(...keys)
            this.loading = false
          })
    }
  }

  get part(): QueryPart {
    return {
      componentName: 'MetatypeFilter',
      operator: this.operator,
      value: this.metatype,
      nested: this.keyQueryParts
    }
  }

  @Watch('part')
  onQueryPartChange() {
    if(!this.disabled) {
      this.$emit('update', this.part)
    }
  }

  addQueryPart() {
    this.keyQueryParts.push({
      id: uuidv4(),
      componentName: 'PropertyFilter',
      operator: '',
      value: ''
    })
  }

  removeQueryPart(toRemove: QueryPart) {
    this.keyQueryParts= this.keyQueryParts.filter(part => part.id !== toRemove.id)
  }

  updateQueryPart(toUpdate: QueryPart, update: QueryPart) {
    Object.assign(toUpdate, update)
  }
}

// QueryPart matches the type expected by the query builder - this allows us to use Object.assign and copy over on
// changes
type QueryPart = {
  id?: string;
  componentName: 'MetatypeFilter' | 'PropertyFilter';
  property?: string;
  operator: string;
  value: any;
  nested?: QueryPart[];
}
</script>