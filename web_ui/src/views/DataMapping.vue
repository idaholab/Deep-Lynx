<template>
  <div>
    <v-card
    >
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-select
          style="margin-left:10px; margin-right: 10px"
          :items="dataSources"
          item-text="name"
          return-object
          @change="setDataSource"
          :value="selectedDataSource"
          :label="$t('dataMapping.selectDataSource')"
      ></v-select>
      <v-tabs v-if="selectedDataSource !== null" grow>
        <v-tab @click="activeTab = 'currentMappings'">{{$t('dataMapping.currentMappings')}}</v-tab>
        <v-tab @click="activeTab = 'pendingTransformations'" :disabled="noTransformationsCount === 0">
          <v-badge v-if="noTransformationsCount !== 0" color="green" :content="noTransformationsCount">
            {{$t('dataMapping.needsTransformations')}}
          </v-badge>
          <div v-if="noTransformationsCount === 0" >
            {{$t('dataMapping.needsTransformations')}}
          </div>
        </v-tab>
      </v-tabs>
      <v-card v-if="(selectedDataSource !== null && activeTab ==='currentMappings')">
        <v-card-title>
          <v-row>
            <v-col :cols="6">
              <v-autocomplete
                  :items="metatypes"
                  v-model="selectedMetatype"
                  :search-input.sync="metatypeSearch"
                  :single-line="false"
                  item-text="name"
                  :label="$t('dataMapping.chooseResultingMetatype')"
                  :placeholder="$t('dataMapping.typeToSearch')"
                  return-object
                  :disabled="selectedRelationshipPair != null"
                  clearable
              >
                <template slot="append-outer"><info-tooltip :message="$t('dataMapping.metatypeSearchHelp')"></info-tooltip> </template>
              </v-autocomplete>
            </v-col>
            <v-col :cols="6">
              <v-autocomplete
                  :items="relationshipPairs"
                  v-model="selectedRelationshipPair"
                  :search-input.sync="relationshipPairSearch"
                  :single-line="false"
                  item-text="name"
                  :label="$t('dataMapping.chooseResultingRelationship')"
                  :placeholder="$t('dataMapping.typeToSearchRelationship')"
                  return-object
                  :disabled="selectedMetatype != null"
                  clearable
              >
                <template slot="append-outer"><info-tooltip :message="$t('dataMapping.relationshipPairSearchHelp')"></info-tooltip></template>

                <template slot="item" slot-scope="data">
                  {{data.item.origin_metatype_name}} - {{data.item.relationship_pair_name}} - {{data.item.destination_metatype_name}}
                </template>

              </v-autocomplete>
            </v-col>
          </v-row>

        </v-card-title>
        <v-data-table
            v-if="selectedMetatype || selectedRelationshipPair"
            :headers="headers()"
            :items="typeMappings"
            :items-per-page="25"
            class="elevation-1"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >

          <template v-slot:[`item.active`]="{ item }">
            <v-checkbox v-model="item.active" :disabled="true"></v-checkbox>
          </template>

          <template v-slot:[`item.resulting_types`]="{ item }">
            <div v-for="transformation in item.transformations" :key="transformation.id">
              {{transformation.metatype_name}}
              {{transformation.metatype_relationship_pair_name}}
            </div>
          </template>

          <template v-slot:[`item.sample_payload`]="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="viewSamplePayload(item)"
            >
              mdi-eye
            </v-icon>
          </template>

          <template v-slot:[`item.actions`]="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="editMapping(item)"
            >
              mdi-pencil
            </v-icon>
            <v-icon
                small
                @click="deleteMapping(item)"
            >
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>

        <v-data-table
            v-if="!selectedMetatype && !selectedRelationshipPair"
            :headers="headers()"
            :items="typeMappings"
            class="elevation-1"
            :server-items-length="typeMappingCount"
            :options.sync="options"
            :loading="mappingsLoading"
            :items-per-page="25"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >
          <template v-slot:[`item.active`]="{ item }">
            <v-checkbox v-model="item.active" disabled></v-checkbox>
          </template>

          <template v-slot:[`item.resulting_types`]="{ item }">
            <div v-for="transformation in item.transformations" :key="transformation.id">
              {{transformation.metatype_name}}
              {{transformation.metatype_relationship_pair_name}}
            </div>
          </template>

          <template v-slot:[`item.sample_payload`]="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="viewSamplePayload(item)"
            >
              mdi-eye
            </v-icon>
          </template>

          <template v-slot:[`item.actions`]="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="editMapping(item)"
            >
              mdi-pencil
            </v-icon>
            <v-icon
                small
                @click="deleteMapping(item)"
            >
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card>
      <div v-if="(selectedDataSource !== null && activeTab === 'pendingTransformations')">
        <v-data-table
            :headers="noTransformationHeaders()"
            :items="typeMappingsNoTransformations"
            class="elevation-1"
            :server-items-length="noTransformationsCount"
            :options.sync="transformationsOptions"
            :loading="mappingsLoading"
            :items-per-page="25"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >
          <template v-slot:[`item.active`]="{ item }">
            <v-checkbox v-model="item.active" :disabled="true"></v-checkbox>
          </template>

          <template v-slot:[`item.sample_payload`]="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="viewSamplePayload(item)"
            >
              mdi-eye
            </v-icon>
          </template>

          <template v-slot:[`item.actions`]="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="editMapping(item)"
            >
              mdi-pencil
            </v-icon>
            <v-icon
                small
                @click="deleteMapping(item)"
            >
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </div>
    </v-card>
    <v-dialog
        v-model="dataDialog"
        width="500"
    >
      <v-card>
        <v-card-title class="headline grey lighten-2">
          {{$t('dataMapping.viewSamplePayload')}}
        </v-card-title>
        <v-textarea
            filled
            name="input-7-4"
            :value="samplePayload | pretty"
            :rows="30"
        ></v-textarea>

        <v-card-actions>
          <v-spacer></v-spacer>
          <!-- TODO: Fill with actions like edit and delete -->
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="mappingDialog"
    >
      <v-card>
        <v-card-title class="headline grey lighten-2">
          {{$t('dataImports.editTypeMapping')}}
        </v-card-title>
        <div v-if="selectedDataSource !== null && mappingDialog">
          <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" :typeMappingID="selectedTypeMapping.id" @mappingCreated="mappingDialog = false" @updated="loadTypeMappings"></data-type-mapping>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {DataSourceT, MetatypeRelationshipPairT, MetatypeT, TypeMappingT} from "@/api/types";
import DataTypeMapping from "@/components/dataTypeMapping.vue"

@Component({filters: {
    pretty: function(value: any) {
      return JSON.stringify(value, null, 2);
            }
        },
        components: {
           DataTypeMapping
    }})
    export default class DataMapping extends Vue {
      @Prop({required: true})
      readonly containerID!: string;

      errorMessage = ""
      dataDialog = false
      mappingDialog = false
      samplePayload: object | null = null
      successMessage = ""
      noTransformationsCount = 0
      activeTab = "currentMappings"
      selectedDataSource: DataSourceT | null = null
      dataSources: DataSourceT[] = []
      typeMappings: TypeMappingT[] = []
      typeMappingsNoTransformations: TypeMappingT[] = []

      typeMappingCount = 0
      selectedTypeMapping: TypeMappingT | null = null
      mappingsLoading = false
      options: {
        sortDesc: boolean[];
        sortBy: string[];
        page: number;
        itemsPerPage: number;
      } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 25}

      transformationsOptions: {
        sortDesc: boolean[];
        sortBy: string[];
        page: number;
        itemsPerPage: number;
      } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 25}

      metatypeSearch = ""
      metatypes: MetatypeT[] = []
      selectedMetatype: MetatypeT | null = null

      relationshipPairSearch = ""
      relationshipPairs: MetatypeRelationshipPairT[] = []
      selectedRelationshipPair: MetatypeRelationshipPairT | null = null

      headers() {
        return [{
          text: this.$t('dataMapping.enabled'),
          value: "active",
          align: 'center'
        },{
          text: this.$t('dataMapping.createdAt'),
          value: "created_at"
        },{
          text: this.$t('dataMapping.resultingTypes'),
          value: "resulting_types",
          sortable: false
        },{
          text: this.$t('dataMapping.samplePayload'),
          value: "sample_payload",
          align: 'center',
          sortable: false
        },{
          text: 'Actions',
          value: 'actions',
          align: 'center',
          sortable: false
          }]
      }

      noTransformationHeaders() {
        return [{
          text: this.$t('dataMapping.enabled'),
          value: "active",
          align: 'center'
        },{
          text: this.$t('dataMapping.createdAt'),
          value: "created_at"
        },{
          text: this.$t('dataMapping.samplePayload'),
          value: "sample_payload",
          align: 'center',
          sortable: false
        },{
          text: 'Actions',
          value: 'actions',
          align: 'center',
          sortable: false
        }]
      }

      @Watch('options', {immediate: true})
      onOptionChange() {
        this.loadTypeMappings()
      }

      @Watch('transformationsOptions', {immediate: true})
      onTransformationOptionChange() {
        this.loadTypeMappingsNoTransformations()
      }

      @Watch('selectedRelationshipPair', {immediate: true})
      onSelectedMetatypeRelationshipPairChange() {
        this.loadTypeMappingsFromSearch()
      }

      @Watch('selectedMetatype', {immediate: true})
      onSelectedMetatypeChange() {
        this.loadTypeMappingsFromSearch()
      }

      @Watch('selectedDataSource', {immediate: true})
      onSelectedDataSourceChange(dataSource: DataSourceT) {
        if(!dataSource) return;

        this.loadTypeMappings()
        this.loadTypeMappingsNoTransformations()
      }

      @Watch('metatypeSearch', {immediate: true})
      onSearchChange(newVal: string) {
        if(newVal === "") return;

        this.$client.listMetatypes(this.containerID, {name: newVal})
            .then((metatypes) => {
              this.metatypes = metatypes as MetatypeT[]
            })
            .catch((e: any) => this.errorMessage = e)
      }

      @Watch('relationshipPairSearch', {immediate: true})
      onRelationshipSearchChange(newVal: string) {
        if(newVal === "") return

        this.$client.listMetatypeRelationshipPairs(this.containerID, {
          name: newVal,
          limit: 1000,
          offset: 0,
          originID: undefined,
          destinationID: undefined,
        })
            .then(pairs => {
              this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
            })
            .catch(e => this.errorMessage = e)
      }

      setDataSource(dataSource: any) {
          this.selectedDataSource = dataSource
      }

      loadTypeMappings() {
        if(this.selectedDataSource) {
          this.mappingsLoading= true
          this.typeMappings = []

          const {page, itemsPerPage, sortBy, sortDesc} = this.options;
          let sortParam: string | undefined
          let sortDescParam: boolean | undefined

          const pageNumber = page - 1;
          if (sortBy && sortBy.length >= 1) sortParam = sortBy[0]
          if (sortDesc) sortDescParam = sortDesc[0]

          this.$client.listTypeMappings(this.containerID, this.selectedDataSource?.id!, {
            limit: itemsPerPage,
            offset: itemsPerPage * pageNumber,
            sortBy: sortParam,
            sortDesc: sortDescParam
          })
          .then((results) => {
            this.mappingsLoading = false

            this.$client.countTypeMappings(this.containerID, this.selectedDataSource?.id!)
            .then(count => {
              this.typeMappingCount = count
            })
            .catch(e => this.errorMessage = e)

            const promises = []

            for(const i in results) {
              promises.push(this.$client.retrieveTransformations(this.containerID, this.selectedDataSource?.id!, results[i].id))
            }

            Promise.all(promises)
            .then((transformationResults) => {
              for(const transformations of transformationResults) {
                transformations.map(transformation => {
                 results = results.map(mapping => {
                    if(!mapping.transformations) mapping.transformations = []

                    if(mapping.id === transformation.type_mapping_id) {
                      mapping.transformations.push(transformation)
                    }

                    return mapping
                  })
                })
              }

              this.typeMappings = results
            })
            .catch(e => this.errorMessage = e)
          })
          .catch(e => this.errorMessage = e)
        }
      }

      loadTypeMappingsFromSearch() {
        if(this.selectedDataSource) {
          this.mappingsLoading= true
          this.typeMappings = []

          this.$client.listTypeMappings(this.containerID, this.selectedDataSource?.id!, {
            resultingMetatypeName: (this.selectedMetatype) ? this.selectedMetatype.name : undefined,
            resultingMetatypeRelationshipName: (this.selectedRelationshipPair) ? this.selectedRelationshipPair.relationship_pair_name : undefined
          })
              .then((results) => {
                this.mappingsLoading = false
                const promises = []

                for(const i in results) {
                  promises.push(this.$client.retrieveTransformations(this.containerID, this.selectedDataSource?.id!, results[i].id))
                }

                Promise.all(promises)
                    .then((transformationResults) => {
                      for(const transformations of transformationResults) {
                        transformations.map(transformation => {
                          results = results.map(mapping => {
                            if(!mapping.transformations) mapping.transformations = []

                            if(mapping.id === transformation.type_mapping_id) {
                              mapping.transformations.push(transformation)
                            }

                            return mapping
                          })
                        })
                      }

                      this.typeMappings = results
                    })
                    .catch(e => this.errorMessage = e)
              })
              .catch(e => this.errorMessage = e)
        }
      }

  loadTypeMappingsNoTransformations() {
    if(this.selectedDataSource) {
      this.mappingsLoading= true
      this.typeMappingsNoTransformations

      const {page, itemsPerPage, sortBy, sortDesc} = this.transformationsOptions;
      let sortParam: string | undefined
      let sortDescParam: boolean | undefined

      const pageNumber = page - 1;
      if (sortBy && sortBy.length >= 1) sortParam = sortBy[0]
      if (sortDesc) sortDescParam = sortDesc[0]

      this.$client.listTypeMappings(this.containerID, this.selectedDataSource?.id!, {
        limit: itemsPerPage,
        offset: itemsPerPage * pageNumber,
        sortBy: sortParam,
        sortDesc: sortDescParam,
        noTransformations: true
      })
          .then((results) => {
            this.mappingsLoading = false
            this.typeMappingsNoTransformations = results

            this.$client.countTypeMappings(this.containerID, this.selectedDataSource?.id!, true)
                .then(count => {
                  this.noTransformationsCount = count
                })
                .catch(e => this.errorMessage = e)
          })
          .catch(e => this.errorMessage = e)
    }
  }

      deleteMapping(typeMapping: TypeMappingT) {
        this.$client.deleteTypeMapping(this.containerID, this.selectedDataSource?.id!, typeMapping.id)
        .then((deleted) => {
          if(!deleted) this.errorMessage = "Unable to delete type mapping"

          if(this.selectedMetatype || this.selectedRelationshipPair) {
            this.loadTypeMappingsFromSearch()
            return
          }

          this.loadTypeMappings()
        })
        .catch((e: any) => this.errorMessage = e)
      }

      editMapping(typeMapping: TypeMappingT) {
        this.selectedTypeMapping = typeMapping
        this.mappingDialog = true
      }

      mounted() {
          this.$client.listDataSources(this.containerID)
              .then(dataSources => {
                  this.dataSources = dataSources
              })
              .catch((e: any) => this.errorMessage = e)
      }

      viewSamplePayload(mapping: TypeMappingT) {
        this.samplePayload = mapping.sample_payload
        this.dataDialog = true
      }
  }
</script>
