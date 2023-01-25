<template>
  <div class="pa-4">
    <v-row>
      <v-col :cols="3">
        <v-card class="mx-auto">
          <v-card-title class="query-results-title">{{$t('queryBuilder.previousQueries')}}</v-card-title>
          <v-list style="max-height: 400px" class="overflow-y-auto">
            <v-list-item
              v-if="previousResults.length === 0">
              <v-list-item-content>
                <v-list-item-subtitle>No queries to display</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>            
            <v-list-item
              v-for="result of previousResults" :key="result.id"
              @click="setResult(result)"
              color="warning"
              :input-value="results && result.id === results.id"
              two-line>
              <v-list-item-content>
                <v-list-item-title>{{$utils.formatISODate(result.ran.toISOString())}}</v-list-item-title>
                <v-list-item-subtitle>{{result.nodes.length}} {{$t('queryBuilder.results')}}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col :cols="9">
        <error-banner :message="errorMessage"></error-banner>
        <v-card>
          <v-tabs v-model="activeTab" background-color="lightgray" class="data-query-tabs">
            <v-tab @click="activeTab = 'queryBuilder'">{{$t('queryBuilder.queryBuilder')}}</v-tab>
            <v-tab @click="setRawEditor">{{$t('queryBuilder.rawEditor')}}</v-tab>
            <v-spacer />
            <v-btn v-if="!results" color="warning" style="margin: 6px;" @click="resetQuery">{{$t('queryBuilder.resetQuery')}}</v-btn>
            <v-btn v-if="results" color="success" style="margin: 6px;" @click="resetQuery">{{$t('queryBuilder.newQuery')}}</v-btn>
          </v-tabs>
          <v-tabs-items v-model="activeTab">
            <v-tab-item class="mx-5">
              <v-row>
                <v-col :cols="12" align="center">
                  <v-card style="margin-top: 10px" class="pa-4">
                    <v-checkbox
                      v-model="metadataEnabled"
                      label="Include Metadata in Query (may impact performance)"
                      :disabled="results !== null"
                    ></v-checkbox>
                  </v-card>
                  <v-card v-for="part in queryParts" :key="part.id" style="margin-top: 10px">
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
                      @update="updateQueryPart(part, ...arguments)"
                    />
                  </v-card>
                  <v-card v-if="!results" style="margin-top: 10px" class="pa-4">
                    <p class="mb-2">{{$t('queryBuilder.clickToAdd')}}</p>
                    <add-dialog @selected="addQueryPart"></add-dialog>
                  </v-card>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="d-flex flex-row">
                  <v-spacer />
                  <div class="mr-5">
                    <v-combobox
                      :items="limitOptions"
                      v-model="limit"
                      :label="$t('queryBuilder.recordLimit')"
                      @change="setLimit"
                      style="max-width: 90px;"
                    >
                    </v-combobox>
                  </div>
                  <div>
                    <v-btn v-if="!results" @click="submitQuery" style="margin-top: 15px">
                      <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
                      <span v-if="!loading">{{$t('queryBuilder.runQuery')}}</span>
                    </v-btn>
                    <v-btn v-if="results" @click="submitQuery" style="margin-top: 15px">
                      <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
                      <span v-if="!loading">{{$t('queryBuilder.resubmitQuery')}}</span>
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
            </v-tab-item>
            <v-tab-item class="mx-5">
              <v-row style="margin-top: 10px">
                <v-col :cols="2">
                  <v-tooltip right>
                    <template v-slot:activator="{ on: ontooltip }">

                      <v-menu
                          :close-on-content-click="false"
                          :offset-x="true"
                          left
                      >
                        <template v-slot:activator="{on: onmenu}">
                          <v-icon v-on="{...onmenu, ...ontooltip}" >{{info}}</v-icon>
                        </template>
                        <v-card max-width="364" style="justify-content: left;">
                          <v-card-text>
                          Need help writing your query? Consult the detailed documentation <a :href="helpLink()">here</a>.<br/><br/>

                          <v-divider></v-divider><br/>

                          To get started, try selecting one of the sample query templates below. 
                          Be sure to remove any comments and replace text in CAPS before running the query!

                          <br/>
                          <v-select
                            v-model="selectedSampleQuery"
                            :items="sampleQueries"
                            @input="updateSelectedQuery"
                            label="Sample Query"
                            hint="Select a sample query to load a template"
                            persistent-hint
                          >
                          </v-select>

                          <br/>

                          While writing your query, hit "Ctrl-Space" to bring up the autocompletion menu. 
                          This menu provides some of the available schema from which to query. <br/><br/>

                          In the results window you can hold down the "Alt" key and click on an the arrow for 
                          an object or array to fully expand the contents.
                          </v-card-text>
                          
                        </v-card>
                      </v-menu>

                    </template>
                    <span>Need Help?</span>
                  </v-tooltip>
                </v-col>
                <v-spacer />
                <v-checkbox class="mr-5"
                  v-model="metadataEnabled"
                  label="Include Metadata in Query (may impact performance)"
                ></v-checkbox>
                <v-btn @click="submitRawQuery" style="margin-top: 15px; margin-right: 15px">
                  <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
                  <span v-if="!loading">{{$t('queryBuilder.runQuery')}}</span>
                </v-btn>
              </v-row>
              

              <v-row style="margin-bottom:15px">
                <v-col :cols="6">
                  <v-card style="height: 100%">
                  <textarea v-observe-visibility="initCodeMirror" v-model="metatypeSampleQuery" ref="queryEditor"></textarea>
                  </v-card>
                </v-col>
                <v-col :cols="6">
                  <v-card style="height: 100%">
                    <json-viewer
                      v-if="Object.keys(rawQueryResult).length !== 0"
                      :value="rawQueryResult"
                      copyable
                      expanded
                      :expand-depth="7"
                      style="overflow-y: auto; overflow-x: auto"
                    />
                    <p v-else style="padding: 10px">Results will be displayed here</p>
                  </v-card>
                </v-col>
              </v-row>

            </v-tab-item>
          </v-tabs-items>
        </v-card>
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
import { buildSchema } from 'graphql';
import {mdiInformation} from "@mdi/js";
import RawDataFilter from "./rawDataFilter.vue";
import MetadataFilter from "./metadataFilter.vue";

// @ts-ignore - needed because there are no declaration files here
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/lint/lint';
import 'codemirror-graphql/hint';
import 'codemirror-graphql/lint';
import 'codemirror-graphql/mode';


@Component({components: {AddDialog, DataSourceFilter, MetatypeFilter, OriginalIDFilter, IDFilter, RawDataFilter, MetadataFilter}})
export default class QueryBuilder extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  activeTab = 'queryBuilder'
  loading = false
  errorMessage = ""
  queryParts: QueryPart[] = []
  query: string | null = null
  previousResults: ResultSet[] = []
  results: ResultSet | null = null
  limit = 100
  limitOptions = [100, 500, 1000, 10000]
  info = mdiInformation
  metadataEnabled = false

  codeMirror: CodeMirror.EditorFromTextArea | null = null

  rawQueryResult: {[key: string]: any} = {}

// SAMPLE QUERIES
// hardcoded, format and indentation matters

  metatypeSampleQuery = 
`{ 
  metatypes {
    YOUR_METATYPE_HERE # optionally add desired filters within () 
    {
      # metatype properties you wish to retrieve here
      _record { # contains metadata about the node
        id
        data_source_id 
        original_id 
        import_id 
        metatype_id 
        metatype_name 
        created_at 
        created_by 
        modified_at 
        modified_by 
        metadata
      } 
    } 
  }
}`

relationshipSampleQuery = 
`{ 
  relationships {
    YOUR_REALTIONSHIP_HERE # optionally add desired filters within () 
    {
      # relationship properties you wish to retrieve here
      _record { # contains metadata about the edge
        id
        data_source_id 
        original_id 
        import_id 
        metatype_id 
        metatype_name 
        created_at 
        created_by 
        modified_at 
        modified_by 
        metadata
      } 
    } 
  }
}`

  introspectiveQuery = // good for metatypes, relationships, and graphs
`{ 
  __type(name:"YOUR_METATYPE_OR_RELATIONSHIP_HERE OR graph_type"){
    name
    fields{
      name
      type{
        name
        kind
      }
    }
  }
}`

  graphSampleQuery =
`{
  graph(
    root_node: "NODE_ID"
    depth: "3"  # number of layers deep to recursively search on
  ){
    origin_properties
    edge_properties
    destination_properties

    origin_id
    origin_metatype_id 
    origin_metatype_name

    edge_id
    relationship_pair_id
    relationship_id
    relationship_name

    destination_id
    destination_metatype_id
    destination_metatype_name

    depth
    path
  }
}
` 

  simpleGraphQuery = 
`{
  graph(
    root_node: "NODE_ID"
    depth: "3"
  ) {
    edge_id
    destination_id
    destination_metatype_name
    destination_properties
  }
}`

  // the schema used for hints/autocompletion
  schema = buildSchema(`
    type Any {
      key: String
    }

    type Metadata {
      conversions: [Any]
      failed_conversions: [Any]
    }

    type Record {
      id: String
      data_source_id: String
      original_id: String
      import_id: String
      metatype_id: String
      metatype_name: String
      created_at: String
      created_by: String
      modified_at: String
      modified_by: String
      metadata: Metadata
    }

    type Graph {
      origin_properties: Any
      edge_properties: Any
      destination_properties: Any
      origin_id: String
      origin_metatype_id: String
      origin_metatype_name: String
      edge_id: String
      relationship_pair_id: String
      relationship_id: String
      relationship_name: String
      destination_id: String
      destination_metatype_id: String
      destination_metatype_name: String
      depth: Int
      path: [Any]
    }

    type Relationship {
      _record: Record
    }

    type Metatype {
      _record: Record
    }

    type Query {
      metatypes: Metatype
      relationships: Relationship
      graph(root_node: String, depth: String): Graph
    }
  `)

  selectedSampleQuery = {text: 'Metatype Query', value: this.metatypeSampleQuery}
  sampleQueries = [
    {text: 'Metatype Query', value: this.metatypeSampleQuery},
    {text: 'Relationship Query', value: this.relationshipSampleQuery},
    {text: 'Introspection Query', value: this.introspectiveQuery},
    {text: 'Graph Query', value: this.graphSampleQuery},
    {text: 'Simple Graph Query', value: this.simpleGraphQuery},
  ]

  mounted() {
    // run the default query on page load
    this.submitQuery()
  }
  
  setRawEditor() {
    this.activeTab = 'rawEditor'
    this.$emit('disableGraphEdit', true)
    
    // clear any graph results
    if (this.results !== null) {
      this.results = null
      this.$emit('results', this.results)
    }
  }

  initCodeMirror() {

    this.$nextTick(() => {
      if (this.$refs.queryEditor) {
        this.enableQueryEditor()

        // update size to accomodate content
        this.codeMirror?.setSize("100%", "100%");
      }
    });
  }

  enableQueryEditor() {
    
    if (this.codeMirror === null) {

      const queryEditor = this.$refs.queryEditor as any;

      this.codeMirror = CodeMirror.fromTextArea(queryEditor, {
        value: this.metatypeSampleQuery,
        mode: 'graphql',
        lineNumbers: true,
        lineWrapping: true,
        autofocus: true,
        tabSize: 2,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        extraKeys: {
          "Ctrl-Space": "autocomplete" // must assign a key mapping to access autocomplete by default
        },
        lint: {
          // @ts-ignore
          schema: this.schema
        },
        showHint: true,
        hintOptions: {
          schema: this.schema,
        },
      })
      
    }
    
  }

  updateSelectedQuery(newQuery: string) {
    if (this.codeMirror !== null) {
      this.codeMirror.setValue(newQuery)
    }
  }

  async submitRawQuery() {

    if (this.codeMirror !== null) {

      // ensure all comments are removed
      if (this.codeMirror?.getValue().indexOf('#') !== -1) {
        this.errorMessage = 'Please remove all comments before submitting the query'
        return
      } else {
        // reset error message
        this.errorMessage = ''
      }

      this.loading = true
      this.$client.submitGraphQLQuery(this.containerID, { query: `${this.codeMirror?.getValue()}` }, {metadataEnabled: this.metadataEnabled})
        .then((queryResult: any) => {
          if(queryResult.errors) {
            this.errorMessage = queryResult.errors.map((error: any) => error.message as string).join(' ')
            this.loading = false
            return
          }

          this.rawQueryResult = queryResult
          this.loading = false
          this.metadataEnabled = false
        })
        .catch((err: string) => {
          this.errorMessage = 'There is a problem with the GraphQL query or server error. Please see the result tab.'

          this.rawQueryResult = {'error': err}
          this.loading = false
        })

    }
  }

  helpLink() {
    return 'https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Querying-Data-With-GraphQL'
  }

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
    this.metadataEnabled = false
    this.queryParts = []
    this.query = null
    this.results = null

    // reset raw query if applicable
    if (this.codeMirror !== null) {
      this.selectedSampleQuery = {text: 'Metatype Query', value: this.metatypeSampleQuery}
      this.updateSelectedQuery(this.metatypeSampleQuery)
      this.rawQueryResult = {}
    }
  }

  setLimit(limit: number) {
    this.limit = limit
  }

  submitQuery() {
    const id = uuidv4()
    this.loading = true

    this.results = {id, queryParts: this.queryParts, nodes: []}

    const query = this.buildQuery()
    this.query = query.query

    this.$client.submitGraphQLQuery(this.containerID, query, {metadataEnabled: this.metadataEnabled})
        .then((results: any) => {
          if(results.errors) {
            this.errorMessage = results.errors[0].message ? 
              results.errors.map(function(result: any) { return result.message }).join(", ") : (results.errors as string[]).join(' ')
            return
          }

          this.previousResults.push({
            id: id,
            queryParts: JSON.parse(JSON.stringify(this.queryParts)),
            nodes: results.data.nodes,
            ran: new Date()
          })

          this.results = {id, queryParts: this.queryParts, query: query.query, nodes: results.data.nodes, metadataEnabled: this.metadataEnabled}
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
    this.results.metadataEnabled = this.metadataEnabled
    this.queryParts = result.queryParts
    this.query = result.query || null
    this.activeTab = 'queryBuilder'
    this.$emit('results', this.results)
  }

  // buildQuery builds a filter argument for the graphQL query based on the query parts
  buildQuery(): any {
    const args: string[] = []
    const propertyArgs: string[] = []
    const rawDataProps: string[] = []
    const metadataProps: string[] = []

    this.queryParts.forEach(part => {
      switch(part.componentName) {
        case('MetatypeFilter'): {
          if(part.operator === 'in') {
            if(part.options!.limitOntology){
              args.push(`metatype_id:{operator: "${part.operator}", value: [${part.value}]} `)
            } else {
              // explicitly wrap uuids in quotes to prevent parsing errors
              const uuids: string[] = [];
              Array(part.options!.uuids).forEach((uuid) => { uuids.push(`"${uuid}"`) })
              args.push(`metatype_uuid:{operator: "${part.operator}", value: [${uuids}]} `)
            }
          } else {
            if(part.options!.limitOntology) {
              args.push(`metatype_id:{operator: "${part.operator}", value: "${part.value}"} `)
            } else {
              args.push(`metatype_uuid:{operator: "${part.operator}", value: "${part.options!.uuids}"}`)
            }
          }

          // we make the assumption that this is a property filter
          if(part.nested!.length > 0) {
            part.nested!.forEach(nested => {
              if(nested.operator === 'in') {
                propertyArgs.push(`{key: "${nested.property}", value: "${nested.value.join(",")}", operator: "${nested.operator}"},`)
              } else {
                propertyArgs.push(`{key: "${nested.property}", value: "${nested.value}", operator: "${nested.operator}"},`)
              }
            })
          }
          break;
        }

        case('DataSourceFilter'): {
          if(part.operator === 'in') {
            args.push(`data_source_id:{operator: "${part.operator}", value: [${part.value}]} `)
          } else {
            args.push(`data_source_id:{operator: "${part.operator}", value: "${part.value}"} `)
          }
          break;
        }

        case('IDFilter'): {
          if(part.operator === 'in') {
            args.push(`id:{operator: "${part.operator}", value: [${part.value}]} `)
          } else {
            args.push(`id:{operator: "${part.operator}", value: "${part.value}"} `)
          }
          break;
        }

        case('OriginalIDFilter'): {
          if(part.operator === 'in') {
            args.push(`original_id:{operator: "${part.operator}", value: "${part.value.join(",")}"} `)
          } else {
            args.push(`original_id:{operator: "${part.operator}", value: "${part.value}"} `)
          }
          break;
        }

        case('RawDataFilter'): {
          if(part.operator === 'in') {
            rawDataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value.join(",")}", historical: ${part.options!.historical}}`)
          } else {
            rawDataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value}", historical: ${part.options!.historical}}`)
          }
          break;
        }

        case('MetadataFilter'): {
          if(part.operator === 'in') {
            metadataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value.join(",")}", historical: ${part.options!.historical}}`)
          } else {
            metadataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value}"}`)
          }
          break;
        }
      }
    })

    // combine the filter with the raw query - the more fields you return the bigger the return, and when dealing
    // with thousands of nodes we really don't want to do this - update this with only the fields you need, load
    // the rest dynamically once they select a node
    return {
      query: `
{
    nodes(
    limit: ${this.limit}
    ${(args.length >  0) ? ","+args.join(','): ""}
    ${(propertyArgs.length > 0) ? ', properties: [' + propertyArgs.join(",") + "]" : ''}
    ${(rawDataProps.length > 0) ? ', raw_data_properties: [' + rawDataProps.join(",") + "]" : ''}
    ${(metadataProps.length > 0) ? ', metadata_properties: [' + metadataProps.join(",") + "]": ''}
    ){
        id
        original_id
        container_id
        data_source_id
        metatype_id
        metatype_name
        created_at
        modified_at
        properties
        ${this.metadataEnabled ? 'metadata_properties' : ''}
        ${this.metadataEnabled ? 'raw_data_properties' : ''}
        ${this.metadataEnabled ? 'raw_data_history' : ''}
}
}`
    }
  }
}

// use Object.assign to copy over the result from the event
export type QueryPart = {
  id: string; // needed for uniqueness, assigned here not by component
  componentName: string;
  key?: string;
  property?: string;
  operator: string;
  value: any;
  nested?: QueryPart[];
  options?: {[key: string]: any}
}

export type ResultSet = {
  id: string;
  queryParts: QueryPart[];
  query?: string;
  nodes: NodeT[];
  ran?: Date;
  metadataEnabled?: boolean;
}
</script>

<style lang="scss">
  .query-results-title {
    background-color: $lightgray!important;
    padding: 17px;
    font-size: .85rem;
  }

  .data-query-tabs .v-tab {
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;

    &:nth-child(2) {
      border-top-left-radius: 6px;
    }
  }  
</style>
