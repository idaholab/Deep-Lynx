<template>
  <v-container>
    <v-row>
      <v-col :cols="3" style="padding-top:30px" class="text-right">{{$t('classes.class')}}</v-col>
      <v-col :cols="3">
        <operators-select
            :disabled="disabled"
            @selected="setOperator"
            :operator="operator"
            :custom_operators="operators"
        ></operators-select>
      </v-col>
      <v-col :cols="6">
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
      </v-col>
    </v-row>
    <v-row v-if="metatype !== ''">
      <v-col align="left"><p>{{$t('query.PropertyFilter')}}</p></v-col>
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
              @update="updateQueryPart(part, $event)"></property-filter>
        </div>
      </v-col>
      <v-col v-if="!loading" :cols="12" align="center">{{$t('query.clickToAddProperty')}}</v-col>
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
  import Vue, { PropType } from 'vue';
  import SearchMetatypes from "@/components/ontology/metatypes/SearchMetatypes.vue";
  import OperatorsSelect from "@/components/queryBuilder/operatorsSelect.vue";
  import {MetatypeKeyT, MetatypeT} from "@/api/types";
  import PropertyFilter from "@/components/queryBuilder/PropertyFilter.vue";
  import {v4 as uuidv4} from "uuid";

  interface FilterMetatypeModel {
    operator: string,
    metatype: string | string[],
    uuid: string | string[],
    metatypeKeys: MetatypeKeyT[],
    loading: boolean,
    keyQueryParts: QueryPart[],
    limitOntologyVersion: boolean,
  }

  export default Vue.extend ({
    name: 'FilterMetatype',

    components: { SearchMetatypes, OperatorsSelect, PropertyFilter },

    props: {
      containerID: {type: String, required: true},
      queryPart: {
        type: Object as PropType<QueryPart>,
        required: false
      },
      disabled: {type: Boolean, required: false, default: false},
    },

    data: (): FilterMetatypeModel => ({
      operator: "",
      metatype: "",
      uuid: "",
      metatypeKeys: [],
      loading: false,
      keyQueryParts: [],
      limitOntologyVersion: false,
    }),

    computed: {
      operators(): {text: string, value: string}[] {
        return [
          {text: (this.$t('operators.equals') as string), value: 'eq'},
          {text: (this.$t('operators.notEquals') as string), value: 'neq'},
          {text: (this.$t('operators.in') as string), value: 'in'},
        ]
      },
      part(): QueryPart {
        return {
          componentName: 'FilterMetatype',
          operator: this.operator,
          value: this.metatype,
          nested: this.keyQueryParts,
          options: {limitOntology: this.limitOntologyVersion, uuids: this.uuid}
        }
      }
    },

    beforeMount() {
      if (this.queryPart) {
        this.operator = this.queryPart.operator;
        this.metatype = this.queryPart.value;
        this.keyQueryParts = (this.queryPart.nested) ? this.queryPart.nested : []
      }
    },

    watch: {
      part: {
        handler: 'onQueryPartChange',
        immediate: true
      }
    },

    methods: {
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
      onQueryPartChange() {
        if(!this.disabled) {
          this.$emit('update', this.part)
        }
      },
      addQueryPart() {
        this.keyQueryParts.push({
          id: uuidv4(),
          componentName: 'PropertyFilter',
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
    }
  });

  type QueryPart = {
    id?: string;
    componentName: 'FilterMetatype' | 'PropertyFilter';
    property?: string;
    operator: string;
    value: any;
    nested?: QueryPart[];
    options?: {[key: string]: any}
  }
</script>