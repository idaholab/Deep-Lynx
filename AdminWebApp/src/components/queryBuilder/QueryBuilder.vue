<template>
  <div class="pa-4">
    <v-row>
      <v-col :cols="3">
        <v-card class="mx-auto">
          <v-card-title class="query-results-title">{{$t('query.previous')}}</v-card-title>
          <v-list style="max-height: 400px" class="overflow-y-auto">
            <v-list-item
              v-if="previousResults.length === 0">
              <v-list-item-content>
                <v-list-item-subtitle>{{$t('query.noneToDisplay')}}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-list-item
              v-for="result of previousResults" :key="result.id"
              @click="setResult(result)"
              color="warning"
              :input-value="results && result.id === results.id"
              two-line>
              <v-list-item-content>
                <v-list-item-title>{{previousResultDate(result)}}</v-list-item-title>
                <v-list-item-subtitle>{{result.nodes.length}} {{$t('query.results')}}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col :cols="9">
        <error-banner :message="errorMessage"></error-banner>
        <v-card>
          <v-tabs v-model="activeTab" background-color="lightgray" class="data-query-tabs">
            <v-tab @click="activeTab = 'queryBuilder'">{{$t('query.builder')}}</v-tab>
            <v-tab @click="setRawEditor">{{$t('query.rawEditor')}}</v-tab>
            <v-spacer />
            <v-btn v-if="!results" color="warning" style="margin: 6px;" @click="resetQuery">{{$t('query.reset')}}</v-btn>
            <v-btn v-if="results" color="primary" style="margin: 6px;" @click="resetQuery">{{$t('query.new')}}</v-btn>
          </v-tabs>
          <v-tabs-items v-model="activeTab">
            <v-tab-item class="mx-5">
              <v-row>
                <v-col :cols="12" align="center">
                  <v-card style="margin-top: 10px" class="pa-4">
                    <v-checkbox
                      v-model="rawMetadataEnabled"
                      :label="$t('query.includeRaw')"
                      :disabled="results !== null"
                    ></v-checkbox>
                  </v-card>
                  <v-card v-for="part in queryParts" :key="part.id" style="margin-top: 10px">
                    <v-card-title>
                      {{$t(`query.${part.componentName}`)}}
                      <v-flex class="text-right">
                        <v-icon v-if="!results" class="justify-right" @click="removeQueryPart(part)">mdi-window-close</v-icon>
                      </v-flex>
                    </v-card-title>
                    <component
                      v-bind:is="part.componentName"
                      :disabled="results !== null"
                      :containerID="containerID"
                      :queryPart="part"
                      @update="updateQueryPart(part, $event)"
                    />
                  </v-card>
                  <v-card v-if="!results" style="margin-top: 10px" class="pa-4">
                    <p class="mb-2">{{$t('query.clickToAdd')}}</p>
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
                      :label="$t('general.limit')"
                      @change="setLimit"
                      style="max-width: 90px;"
                    >
                    </v-combobox>
                  </div>
                  <div>
                    <v-btn v-if="!results" @click="submitQuery" style="margin-top: 15px">
                      <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
                      <span v-if="!loading">{{$t('query.run')}}</span>
                    </v-btn>
                    <v-btn v-if="results" @click="submitQuery" style="margin-top: 15px">
                      <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
                      <span v-if="!loading">{{$t('query.rerun')}}</span>
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
                          {{$t('help.queryDocs')}} <a :href="helpLink()">{{$t('general.here')}}</a>.<br/><br/>

                          <v-divider></v-divider><br/>

                          {{$t('help.querySample')}}<br/>
                          {{$t('help.queryComments')}}

                          <br/>
                          <v-select
                            v-model="selectedSampleQuery"
                            :items="sampleQueries"
                            @input="updateSelectedQuery"
                            :label="$t('query.sample')"
                            :hint="$t('query.sampleSelect')"
                            persistent-hint
                          >
                          </v-select>

                          <br/>

                          {{$t('help.queryAutocomplete')}} <br/><br/>

                          {{$t('help.queryAlt')}}
                          </v-card-text>
                        </v-card>
                      </v-menu>

                    </template>
                    <span>{{$t('general.needHelp')}}</span>
                  </v-tooltip>
                </v-col>
                <v-spacer />
                <v-checkbox class="mr-5"
                  v-model="rawMetadataEnabled"
                  :label="$t('query.includeRaw')"
                ></v-checkbox>
                <v-btn @click="submitRawQuery" style="margin-top: 15px; margin-right: 15px">
                  <v-progress-circular indeterminate v-if="loading"></v-progress-circular>
                  <span v-if="!loading">{{$t('query.run')}}</span>
                </v-btn>
              </v-row>


              <v-row style="margin-bottom:15px">
                <v-col :cols="6">
                  <v-card style="height: 100%">
                    <textarea 
                      v-observe-visibility="initCodeMirror"
                      v-model="selectedSampleQuery.value"
                      ref="queryEditor"
                    ></textarea>
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
                    <p v-else style="padding: 10px">{{$t('query.resultsDisplayedHere')}}</p>
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
  import Vue from 'vue';

  import AddDialog from "@/components/queryBuilder/addDialog.vue";
  import FilterDataSource from "@/components/queryBuilder/FilterDataSource.vue";
  import FilterMetatype from "@/components/queryBuilder/FilterMetatype.vue";
  import FilterOriginalID from "@/components/queryBuilder/FilterOriginalID.vue";
  import FilterID from "@/components/queryBuilder/FilterID.vue";
  import {v4 as uuidv4} from 'uuid';
  import {NodeT} from "@/api/types";
  import { GraphQLSchema, buildSchema } from 'graphql';
  import {mdiInformation} from "@mdi/js";
  import FilterRawData from "./FilterRawData.vue";
  import FilterMetadata from "./FilterMetadata.vue";
  // importing sample queries for code clarity
  import { 
    graphSampleQuery, 
    introspectiveQuery, 
    metatypeSampleQuery, 
    relationshipSampleQuery, 
    simpleGraphQuery,
    hintSchema
  } from './sampleQueries';

  // @ts-ignore - needed because there are no declaration files here
  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css'
  import 'codemirror/addon/hint/show-hint';
  import 'codemirror/addon/hint/show-hint.css';
  import 'codemirror/addon/lint/lint';
  import 'codemirror-graphql/hint';
  import 'codemirror-graphql/lint';
  import 'codemirror-graphql/mode';

  interface QueryBuilderModel {
    activeTab: string
    loading: boolean
    errorMessage: string
    queryParts: QueryPart[]
    query: string | null
    previousResults: ResultSet[]
    results: ResultSet | null;
    limit: number
    limitOptions: number[]
    info: string
    rawMetadataEnabled: boolean
    codeMirror: CodeMirror.EditorFromTextArea | null
    rawQueryResult: {[key: string]: any}
  }

  export default Vue.extend ({
    name: 'QueryBuilder',

    components: {
      AddDialog,
      FilterDataSource,
      FilterMetatype,
      FilterOriginalID,
      FilterID,
      FilterRawData,
      FilterMetadata
    },

    props: {
      containerID: {type: String, required: true},
    },

    data: (): QueryBuilderModel => ({
      activeTab: 'queryBuilder',
      loading: false,
      errorMessage: "",
      queryParts: [],
      query: null,
      previousResults: [],
      results: null,
      limit: 100,
      limitOptions: [100, 500, 1000, 10000],
      info: mdiInformation,
      rawMetadataEnabled: false,
      codeMirror: null,
      rawQueryResult: {},
    }),

    computed: {
      // the schema used for hints/autocompletion
      schema(): GraphQLSchema {
        return buildSchema(hintSchema)
      },
      sampleQueries(): {text: string, value: string}[] {
        return [
          {text: this.$t('query.sampleClass'), value: metatypeSampleQuery},
          {text: this.$t('query.sampleRelationship'), value: relationshipSampleQuery},
          {text: this.$t('query.sampleIntrospect'), value: introspectiveQuery},
          {text: this.$t('query.sampleGraph'), value: graphSampleQuery},
          {text: this.$t('query.sampleGraphSimple'), value: simpleGraphQuery},
        ]
      },
      selectedSampleQuery(): {text: string, value: string} {
        return this.sampleQueries[0];
      },
      
    },

    methods: {
      previousResultDate(result: ResultSet): string {
        return this.$utils.formatISODate(result.ran!.toISOString());
      },
      setRawEditor() {
        this.activeTab = 'rawEditor'
        this.$emit('disableGraphEdit', true)

        // clear any graph results
        if (this.results !== null) {
          this.results = null
          this.$emit('results', this.results)
        }
      },
      initCodeMirror() {

        this.$nextTick(() => {
          if (this.$refs.queryEditor) {
            this.enableQueryEditor()

            // update size to accomodate content
            this.codeMirror?.setSize("100%", "100%");
          }
        });
      },
      enableQueryEditor() {

        if (this.codeMirror === null) {

          const queryEditor = this.$refs.queryEditor as any;

          this.codeMirror = CodeMirror.fromTextArea(queryEditor, {
            value: metatypeSampleQuery,
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

      },
      updateSelectedQuery(newQuery: string) {
        if (this.codeMirror !== null) {
          this.codeMirror.setValue(newQuery)
        }
      },
      async submitRawQuery() {

        if (this.codeMirror !== null) {

          // ensure all comments are removed
          if (this.codeMirror?.getValue().indexOf('#') !== -1) {
            this.errorMessage = this.$t('warnings.graphqlComments') as string;
            return
          } else {
            // reset error message
            this.errorMessage = ''
          }

          this.loading = true
          this.$client.submitGraphQLQuery(this.containerID, { query: `${this.codeMirror?.getValue()}` }, {rawMetadataEnabled: this.rawMetadataEnabled})
            .then((queryResult: any) => {
              if(queryResult.errors) {
                this.errorMessage = queryResult.errors.map((error: any) => error.message as string).join(' ')
                this.loading = false
                return
              }

              this.rawQueryResult = queryResult
              this.loading = false
              this.rawMetadataEnabled = false
            })
            .catch((err: string) => {
              this.errorMessage = this.$t('errors.graphQL') as string;

              this.rawQueryResult = {'error': err}
              this.loading = false
            })

        }
      },
      helpLink() {
        return this.$t('links.graphQL');
      },
      addQueryPart(componentName: string) {
        this.queryParts.push({
          id: uuidv4(),
          componentName: componentName,
          operator: '',
          value: ''
        })
      },
      removeQueryPart(toRemove: QueryPart) {
        this.queryParts = this.queryParts.filter(part => part.id !== toRemove.id)
      },
      updateQueryPart(toUpdate: QueryPart, update: QueryPart) {
        Object.assign(toUpdate, update)
      },
      resetQuery() {
        this.rawMetadataEnabled = false
        this.queryParts = []
        this.query = null
        this.results = null

        // reset raw query if applicable
        if (this.codeMirror !== null) {
          this.selectedSampleQuery = {text: this.$t('query.sampleClass') as string, value: metatypeSampleQuery}
          this.updateSelectedQuery(metatypeSampleQuery)
          this.rawQueryResult = {}
        }
      },
      setLimit(limit: number) {
        this.limit = limit
      },
      submitQuery() {
        const id = uuidv4()
        this.loading = true

        this.results = {id, queryParts: this.queryParts, nodes: []}

        const query = this.buildQuery()
        this.query = query.query

        this.$client.submitGraphQLQuery(this.containerID, query, {rawMetadataEnabled: this.rawMetadataEnabled})
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

              this.results = {
                id,
                queryParts: this.queryParts,
                query: query.query,
                nodes: results.data.nodes,
                rawMetadataEnabled: this.rawMetadataEnabled,
                limit: this.limit
              }
              this.$emit('results', this.results)
            })
            .catch(e => {
              this.errorMessage = e
              this.results = null
            })
            .finally(() => this.loading = false)
      },
      setResult(result: ResultSet) {
        this.results = result
        this.results.rawMetadataEnabled = this.rawMetadataEnabled
        this.queryParts = result.queryParts
        this.query = result.query || null
        this.activeTab = 'queryBuilder'
        this.$emit('results', this.results)
      },
      buildQuery(): any {
        const args: string[] = []
        const propertyArgs: string[] = []
        const rawDataProps: string[] = []
        const metadataProps: string[] = []

        this.queryParts.forEach(part => {
          switch(part.componentName) {
            case('FilterMetatype'): {
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

            case('FilterDataSource'): {
              if(part.operator === 'in') {
                args.push(`data_source_id:{operator: "${part.operator}", value: [${part.value}]} `)
              } else {
                args.push(`data_source_id:{operator: "${part.operator}", value: "${part.value}"} `)
              }
              break;
            }

            case('FilterID'): {
              if(part.operator === 'in') {
                args.push(`id:{operator: "${part.operator}", value: [${part.value}]} `)
              } else {
                args.push(`id:{operator: "${part.operator}", value: "${part.value}"} `)
              }
              break;
            }

            case('FilterOriginalID'): {
              if(part.operator === 'in') {
                args.push(`original_id:{operator: "${part.operator}", value: "${part.value.join(",")}"} `)
              } else {
                args.push(`original_id:{operator: "${part.operator}", value: "${part.value}"} `)
              }
              break;
            }

            case('FilterRawData'): {
              if(part.operator === 'in') {
                rawDataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value.join(",")}", historical: ${part.options!.historical}}`)
              } else {
                rawDataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value}", historical: ${part.options!.historical}}`)
              }
              break;
            }

            case('FilterMetadata'): {
              if(part.operator === 'in') {
                metadataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value.join(",")}", historical: ${part.options!.historical}}`)
              } else {
                metadataProps.push(`{key: "${part.key}", operator: "${part.operator}", value: "${part.value}"}`)
              }
              break;
            }
          }
        });

        // combine the filter with the raw query - the more fields you return the bigger the return, and when dealing
        // with thousands of nodes we really don't want to do this - update this with only the fields you need, load
        // the rest dynamically once they select a node
        return {
          query: `{
            nodes(
              limit: ${this.limit}
              ${(args.length > 0) ? ","+args.join(','): ""}
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
              metadata_properties
              ${this.rawMetadataEnabled ? 'raw_data_properties' : ''}
              ${this.rawMetadataEnabled ? 'raw_data_history' : ''}
            }
          }`
        }
      }
    },

    mounted() {
      // run the default query on page load
      this.submitQuery();
    },
  });

  export type QueryPart = {
    id: string; // needed for uniqueness, assinged here not by component
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
    rawMetadataEnabled?: boolean;
    limit?: number;
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