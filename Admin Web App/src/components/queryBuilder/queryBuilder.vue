<template>
  <div>
  <v-row>
    <v-col :cols="3">
      <v-card class="mx-auto">
        <v-card-title>{{$t('queryBuilder.previousQueries')}}</v-card-title>
        <div v-for="result of previousResults" :key="result.id">
          <v-list-item
              @click="setResult(result)"
              color="warning"
              :input-value="results && result.id === results.id"
              two-line>
            <v-list-item-content>
              <v-list-item-title>{{result.ran.toISOString().split('T').join(' ').substr(0, 19)}}</v-list-item-title>
              <v-list-item-subtitle>{{result.nodes.length}} {{$t('queryBuilder.results')}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </div>
      </v-card>
    </v-col>
    <v-col :cols="9">
      <error-banner :message="errorMessage"></error-banner>
      <v-tabs grow>
        <v-tab @click="activeTab = 'queryBuilder'">{{$t('queryBuilder.queryBuilder')}}</v-tab>
        <v-tab @click="activeTab = 'rawEditor'" disabled>{{$t('queryBuilder.rawEditor')}}</v-tab>
      </v-tabs>

      <v-row>
        <v-col :cols="12" align="center">
          <div v-for="part in queryParts" :key="part.id" style="margin-top: 10px">
            <v-card>
              <v-card-title>
                {{$t(`queryBuilder.${part.componentName}`)}}
                <v-flex class="text-right">
                   <v-icon v-if="!results" class="justify-right" @click="removeQueryPart(part)">mdi-window-close</v-icon>
                </v-flex>
              </v-card-title>
              <component
                  v-bind:is="part.componentName"
                  :disabled="results !== null"
                  :containerID="containerID"
                  :queryPart="part"
                  @update="updateQueryPart(part, ...arguments)"></component>
            </v-card>
          </div>
        </v-col>

        <v-col v-if="!results" :cols="12" align="center">{{$t('queryBuilder.clickToAdd')}}</v-col>
        <v-col v-if="!results" :cols="12" align="center">
          <add-dialog @selected="addQueryPart"></add-dialog>
        </v-col>
      </v-row>
      <v-row>
        <v-col :cols="6" align="left">
          <v-btn v-if="!results" :disabled="queryParts.length <= 0" @click="submitQuery">
            <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
            <span v-if="!loading">{{$t('queryBuilder.runQuery')}}</span>
          </v-btn>
          <v-btn v-if="results" @click="submitQuery">
            <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
            <span v-if="!loading">{{$t('queryBuilder.resubmitQuery')}}</span>
          </v-btn>
        </v-col>
        <v-col :cols="6" align="right">
          <v-btn v-if="!results" color="warning"  @click="resetQuery">{{$t('queryBuilder.resetQuery')}}</v-btn>
          <v-btn v-if="results" color="success"  @click="resetQuery">{{$t('queryBuilder.newQuery')}}</v-btn>
        </v-col>
      </v-row>
    </v-col>
  </v-row>
  </div>
</template>

<script lang="ts">

import {Component, Prop, Vue} from "vue-property-decorator";
import AddDialog from "@/components/queryBuilder/addDialog.vue";
import DataSourceFilter from "@/components/queryBuilder/dataSourceFilter.vue";
import MetatypeFilter from "@/components/queryBuilder/metatypeFilter.vue";
import OriginalIDFilter from "@/components/queryBuilder/OriginalIDFilter.vue";
import IDFilter from "@/components/queryBuilder/IDFilter.vue";
import {v4 as uuidv4} from 'uuid'
import {NodeT} from "@/api/types";

@Component({components: {AddDialog, DataSourceFilter, MetatypeFilter, OriginalIDFilter, IDFilter}})
export default class QueryBuilder extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  loading = false
  errorMessage = ""
  queryParts: QueryPart[] = []
  previousResults: ResultSet[] = []
  results: ResultSet | null = null

  addQueryPart(componentName: string) {
    this.queryParts.push({
      id: uuidv4(),
      componentName: componentName,
      operator: '',
      value: ''
    })
  }

  removeQueryPart(toRemove: QueryPart) {
    this.queryParts = this.queryParts.filter(part => part.id !== toRemove.id)
  }

  updateQueryPart(toUpdate: QueryPart, update: QueryPart) {
    Object.assign(toUpdate, update)
  }

  resetQuery() {
    this.queryParts = []
    this.results = null
  }

  submitQuery() {
    const id = uuidv4()
    this.loading = true

    this.results = {id, query: this.queryParts, nodes: []}

    this.$client.submitGraphQLQuery(this.containerID, this.buildQuery())
    .then(results => {
      if(results.errors) {
        this.errorMessage = (results.errors as string[]).join(' ')
        return
      }

      this.previousResults.push({
        id: id,
        query: JSON.parse(JSON.stringify(this.queryParts)),
        nodes: results.data.nodes,
        ran: new Date()
      })

      this.results = {id, query: this.queryParts, nodes: results.data.nodes}
      this.$emit('results', this.results)
    })
    .catch(e => {
      this.errorMessage = e
      this.results = null
    })
    .finally(() => this.loading = false)
  }

  setResult(result: ResultSet) {
    this.results = result
    this.queryParts = result.query
    this.$emit('results', this.results)
  }

  // buildQuery builds a filter argument for the graphQL query based on the query parts
  buildQuery(): any {
    const AND: string[] = []

    this.queryParts.forEach(part => {
      switch(part.componentName) {
        case('MetatypeFilter'): {
          AND.push(`{metatype_id: "${[part.operator, part.value].join(' ')}"}`)

          const parts: string[] = []
          // we make the assumption that this is a property filter
          if(part.nested!.length > 0) {
            part.nested!.forEach(nested => {
              parts.push(`{key: "${nested.property}", value: "${nested.value}", operator: "${nested.operator}"},`)
            })

            AND.push(`{properties: ${String(parts)}}`)
          }
          break;
        }

        case('DataSourceFilter'): {
          AND.push(`{data_source_id: "${[part.operator, part.value].join(' ')}"}`)
          break;
        }

        case('IDFilter'): {
          AND.push(`{id: "${[part.operator, part.value].join(' ')}"}`)
          break;
        }

        case('OriginalIDFilter'): {
          AND.push(`{original_data_id: "${[part.operator, part.value].join(' ')}"}`)
          break;
        }
      }
    })

    // combine the filter with the raw query
    return {
      query: `
      {
    nodes (where: {AND:
      [${String(AND)}]
     }) {
        id
        metatype {id name description}
        properties {key value type}
        raw_properties
        container_id
        original_data_id
        data_source_id
        created_at
        modified_at
        incoming_edges {
            id
            container_id
            data_source_id
            relationship {id name description}
            origin_node {
                id
                metatype {id name description}
                properties {key value type}
                raw_properties
                container_id
                original_data_id
                data_source_id
                created_at
                modified_at
            }
            destination_node {
              id
              metatype {id name description}
              properties {key value type}
              raw_properties
              container_id
              original_data_id
              data_source_id
              created_at
              modified_at
          }
        }
           outgoing_edges {
            id
            container_id
            data_source_id
            relationship {id name description}
            origin_node {
                id
                metatype {id name description}
                properties {key value type}
                raw_properties
                container_id
                original_data_id
                data_source_id
                created_at
                modified_at
            }
            destination_node {
              id
              metatype {id name description}
              properties {key value type}
              raw_properties
              container_id
              original_data_id
              data_source_id
              created_at
              modified_at
          }
        }
    }
} `
    }
  }
}

// use Object.assign to copy over the result from the event
type QueryPart = {
  id: string; // needed for uniqueness, assigned here not by component
  componentName: string;
  property?: string;
  operator: string;
  value: string;
  nested?: QueryPart[];
}

type ResultSet = {
  id: string;
  query: QueryPart[];
  nodes: NodeT[];
  ran?: Date;
}
</script>