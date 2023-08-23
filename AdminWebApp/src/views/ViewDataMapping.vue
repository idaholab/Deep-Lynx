<template>
  <div>
    <v-card>
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-alert type="success" v-if="importedMappingResults.length > 0">
        {{$t('typeMappings.successfullyImported')}} -
        <v-btn style="margin-top: 10px" class="mb-2" @click="reviewMappings = true">{{$t('general.review')}}</v-btn>
      </v-alert>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('typeMappings.description')}}</v-toolbar-title>
      </v-toolbar>

      <div class="mx-2">
        <SelectDataSource
          :containerID="containerID"
          :show-archived="true"
          :dataSourceID="argument"
          @selected="setDataSource">
        </SelectDataSource>
      </div>

      <v-divider v-if="selectedDataSource !== null"></v-divider>

      <v-tabs v-if="selectedDataSource !== null" grow class="mt-4">
        <v-tab @click="activeTab = 'currentMappings'">{{$t('typeMappings.current')}}</v-tab>
        <v-tab @click="activeTab = 'pendingTransformations'" :disabled="noTransformationsCount === 0">
          <v-badge class="transformation-badge" v-if="noTransformationsCount !== 0" color="green" :content="noTransformationsCount">
            {{$t('typeMappings.needsTransformations')}}
          </v-badge>
          <div v-if="noTransformationsCount === 0">
            {{$t('typeMappings.needsTransformations')}}
          </div>
        </v-tab>
      </v-tabs>

      <v-divider v-if="selectedDataSource !== null"></v-divider>

      <div v-if="(selectedDataSource !== null && activeTab ==='currentMappings')">
        <v-row v-if="!reviewMappings" class="mt-2">
          <v-col :cols="6" class="px-8">
            <v-autocomplete
                :items="metatypes"
                v-model="selectedMetatype"
                :search-input.sync="metatypeSearch"
                :single-line="false"
                item-text="name"
                :label="$t('classes.select')"
                :placeholder="$t('classes.search')"
                return-object
                :disabled="selectedRelationshipPair != null"
                clearable
            >
              <template slot="append-outer"><info-tooltip :message="$t('help.classSearch')"></info-tooltip> </template>
            </v-autocomplete>
          </v-col>
          <v-col :cols="6" class="px-8">
            <v-autocomplete
                :items="relationshipPairs"
                v-model="selectedRelationshipPair"
                :search-input.sync="relationshipPairSearch"
                :single-line="false"
                item-text="name"
                :label="$t('relationships.select')"
                :placeholder="$t('relationships.search')"
                return-object
                :disabled="selectedMetatype != null"
                clearable
            >
              <template slot="append-outer"><info-tooltip :message="$t('help.relationshipSearch')"></info-tooltip></template>

              <template slot="item" slot-scope="$data">
                {{$data.item.origin_metatype_name}} - {{$data.item.relationship_pair_name}} - {{$data.item.destination_metatype_name}}
              </template>

            </v-autocomplete>
          </v-col>
        </v-row>
        <v-row class="mb-3">
          <v-col :cols="4" class="d-flex justify-center">
            <export-mappings-dialog
                v-if="selectedDataSource && !reviewMappings"
                :containerID="containerID"
                :dataSourceID="selectedDataSource.id"
                :mappings="selectedMappings"
                :containerName="$store.getters.activeContainer?.name"
                :dataSourceName="selectedDataSource?.name"
                @mappingsExported="mappingsExported()"></export-mappings-dialog>
          </v-col>
          <v-col :cols="4" class="d-flex justify-center">
            <import-mappings-dialog v-if="selectedDataSource && !reviewMappings" :containerID="containerID" :dataSourceID="selectedDataSource.id" @mappingsImported="mappingsImport"></import-mappings-dialog>
          </v-col>
          <v-col :cols="4" class="d-flex justify-center">
            <v-btn color="primary" @click="upgradeDialog = true">Upgrade All Mappings</v-btn>
          </v-col>
        </v-row>

        <v-divider v-if="selectedDataSource !== null"></v-divider>

        <v-data-table
            v-if="reviewMappings"
            :headers="reviewHeaders()"
            :items="importedMappingResults"
            :items-per-page="25"
            class="elevation-1"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >
          <template v-slot:[`item.isError`]="{ item }">
            <p v-if="!item.isError">{{$t('general.successful')}}</p>
            <p v-else class="warning--text">{{$t('errors.error')}}: {{item.error}}</p>
          </template>

          <template v-slot:[`item.value.sample_payload`]="{ item }">
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
                @click="editMapping(item.value)"
            >
              mdi-pencil
            </v-icon>
            <delete-type-mapping-dialog
                :containerID="containerID"
                :dataSourceID="selectedDataSource.id"
                :mappingID="item.value.id"
                :icon="true"
                @typeMappingDeleted="mappingDeleted()"
            ></delete-type-mapping-dialog>
          </template>
        </v-data-table>

        <v-toolbar v-if="reviewMappings">
          <v-btn color="error" @click="reviewMappings = false; importedMappingResults = []">{{$t('general.endReview')}}</v-btn>
        </v-toolbar>

        <v-col :cols="4" class="mt-2 mb-n3"><div class="box edited mr-2"></div><p>{{$t('transformations.deprecated')}} <info-tooltip :message="$t('help.deprecatedParams')"></info-tooltip></p></v-col>
        <v-data-table
            v-if="!reviewMappings"
            :headers="headers()"
            :items="typeMappings"
            v-model="selectedMappings"
            show-select
            :server-items-length="typeMappingCount"
            :options.sync="options"
            :loading="mappingsLoading"
            :items-per-page="25"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >
          <template v-slot:[`item.active`]="{ item }">
            <v-simple-checkbox v-model="item.active" @click.stop="activateMapping(item)"></v-simple-checkbox>
          </template>

          <template v-slot:[`item.created_at`]="{ item }">
            {{new Date(item.created_at).toUTCString()}}
          </template>

          <template v-slot:[`item.resulting_types`]="{ item }">
            <div v-for="transformation in item.transformations" :key="transformation.id">
              <span :class="isDeprecated(transformation)">{{transformation.metatype_name}}</span>
              <span :class="isDeprecated(transformation)">{{transformation.metatype_relationship_pair_name}}</span>
              <span :class="isDeprecated(transformation)">{{transformation.name}}</span>
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
            <delete-type-mapping-dialog
                :containerID="containerID"
                :dataSourceID="selectedDataSource.id"
                :mappingID="item.id"
                :icon="true"
                @typeMappingDeleted="mappingDeleted()"
            ></delete-type-mapping-dialog>
          </template>
        </v-data-table>
      </div>
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
            <delete-type-mapping-dialog
                :containerID="containerID"
                :dataSourceID="selectedDataSource.id"
                :mappingID="item.id"
                :icon="true"
                @typeMappingDeleted="mappingDeleted()"
            ></delete-type-mapping-dialog>
          </template>
        </v-data-table>
      </div>
    </v-card>

    <v-dialog
      v-model="dataDialog"
      width="60%"
      scrollable
    >
      <v-card class="d-flex flex-column">
        <v-card-title class="grey lighten-2 flex-shrink-1">
          <span class="headline text-h3">{{$t('typeMappings.viewSamplePayload')}}</span>
        </v-card-title>

        <json-viewer
            style="overflow-y: auto; overflow-x: auto"
            class="pt-4 px-4 flex-grow-1"
            :value="samplePayload"
            :expand-depth="4"></json-viewer>

        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="dataDialog = false" >{{$t("general.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="mappingDialog"
      width="90%"
      scrollable
    >
      <v-card class="d-flex flex-column">
        <v-card-title class="grey lighten-2 flex-shrink-1">
          <span class="headline text-h3">{{$t('typeMappings.typeMapping')}}</span>
          <v-flex class="text-right">
            <v-icon class="justify-right"  @click="mappingDialog = false">mdi-window-close</v-icon>
          </v-flex>
        </v-card-title>

        <div class="flex-grow-1" v-if="selectedDataSource !== null && mappingDialog">
          <data-type-mapping
            :dataSourceID="selectedDataSource.id"
            :containerID="containerID"
            :typeMappingID="selectedTypeMapping?.id"
            :active="selectedTypeMapping?.active"
            @mappingCreated="mappingDialog = false"
            @updated="loadTypeMappings()"
          ></data-type-mapping>
        </div>
        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mappingDialog = false" >{{$t("general.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
        v-model="upgradeDialog"
        width="60%"
        scrollable
    >
      <v-card class="d-flex flex-column">
        <v-card-title class="grey lighten-2 flex-shrink-1">
          <span class="headline text-h3">{{$t('typeMappings.typeMapping')}}</span>
          <v-flex class="text-right">
            <v-icon class="justify-right"  @click="upgradeDialog = false">mdi-window-close</v-icon>
          </v-flex>
        </v-card-title>

        <v-card-text>
          <v-alert type="warning">
            {{$t('warnings.upgradeMapping')}}
          </v-alert>
        </v-card-text>

        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="upgradeMappings">{{$t('typeMappings.upgradeAll')}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {
    DataSourceT,
    MetatypeRelationshipPairT,
    MetatypeT, OntologyVersionT,
    ResultT,
    TypeMappingT,
    TypeMappingTransformationT, TypeMappingUpgradePayloadT
  } from "@/api/types";
  import DataTypeMapping from "@/components/etl/dataTypeMapping.vue"
  import ExportMappingsDialog from "@/components/etl/exportMappingsDialog.vue";
  import ImportMappingsDialog from "@/components/etl/importMappingsDialog.vue";
  import SelectDataSource from "@/components/dataSources/SelectDataSource.vue";
  import DeleteTypeMappingDialog from "@/components/etl/deleteTypeMappingDialog.vue";

  interface Options {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  }

  interface DataMappingModel {
    errorMessage: string,
    dataDialog: boolean,
    upgradeDialog: boolean,
    mappingDialog: boolean,
    successMessage: string,
    noTransformationsCount: number,
    activeTab: string,
    reviewMappings: boolean,
    typeMappingCount: number,
    mappingsLoading: boolean,
    metatypeSearch: string,
    relationshipPairSearch: string,
    samplePayload: object | null
    selectedDataSource: DataSourceT | null
    typeMappings: TypeMappingT[]
    typeMappingsNoTransformations: TypeMappingT[]
    selectedMappings: []
    importedMappingResults: ResultT<any>[]
    currentOntologyVersion: OntologyVersionT | null
    selectedTypeMapping: TypeMappingT | null
    metatypes: MetatypeT[]
    selectedMetatype: MetatypeT | null
    relationshipPairs: MetatypeRelationshipPairT[]
    selectedRelationshipPair: MetatypeRelationshipPairT | null
    options: Options
    transformationsOptions: Options
  }

  export default Vue.extend ({
    name: 'ViewDataMapping',

    components: { DataTypeMapping, ExportMappingsDialog, ImportMappingsDialog, SelectDataSource, DeleteTypeMappingDialog },

    props: {
      containerID: {type: String, required: true},
      argument: {type: String, required: false, default: ""},
    },

    data(): DataMappingModel {
      const options: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 25,
      }

      const transformationsOptions: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 25,
      }

      return {
        errorMessage: "",
        dataDialog: false,
        upgradeDialog: false,
        mappingDialog: false,
        successMessage: "",
        noTransformationsCount: 0,
        activeTab: "currentMappings",
        reviewMappings: false,
        typeMappingCount: 0,
        mappingsLoading: false,
        metatypeSearch: "",
        relationshipPairSearch: "",
        samplePayload: null,
        selectedDataSource: null,
        typeMappings: [],
        typeMappingsNoTransformations: [],
        selectedMappings: [],
        importedMappingResults: [],
        currentOntologyVersion: null,
        selectedTypeMapping: null,
        metatypes: [],
        selectedMetatype: null,
        relationshipPairs: [],
        selectedRelationshipPair: null,
        options,
        transformationsOptions
      }
    },

    watch: {
      options: {
        handler: 'onOptionChange',
        immediate: true,
      },
      transformationsOptions: {
        handler: 'onTransformationOptionChange',
        immediate: true,
      },
      selectedRelationshipPair: {
        handler: 'onSelectedMetatypeRelationshipPairChange',
        immediate: true,
      },
      selectedMetatype: {
        handler: 'onSelectedMetatypeChange',
        immediate: true,
      },
      selectedDataSource: {
        handler: 'onSelectedDataSourceChange',
        immediate: true,
      },
      metatypeSearch: {
        handler: 'onSearchChange',
        immediate: false,
      },
      relationshipPairSearch: {
        handler: 'onRelationshipSearchChange',
        immediate: false,
      },
    },

    methods: {
      headers() {
        return [{
          text: this.$t('general.enabled'),
          value: "active",
          align: 'center'
        },{
          text: this.$t('general.dateCreated'),
          value: "created_at"
        },{
          text: this.$t('typeMappings.resultingName'),
          value: "resulting_types",
          sortable: false
        },{
          text: this.$t('typeMappings.samplePayload'),
          value: "sample_payload",
          align: 'center',
          sortable: false
        },{
          text: this.$t('general.actions'),
          value: 'actions',
          align: 'center',
          sortable: false
        }]
      },
      reviewHeaders() {
        return [{
          text: this.$t('imports.status'),
          value: "isError",
          align: 'center'
        },{
          text: this.$t('typeMappings.samplePayload'),
          value: "value.sample_payload",
          align: 'center',
          sortable: false
        },{
          text: this.$t('general.actions'),
          value: 'actions',
          align: 'center',
          sortable: false
        }]
      },
      noTransformationHeaders() {
        return [{
          text: this.$t('general.enabled'),
          value: "active",
          align: 'center'
        },{
          text: this.$t('general.dateCreated'),
          value: "created_at"
        },{
          text: this.$t('typeMappings.samplePayload'),
          value: "sample_payload",
          align: 'center',
          sortable: false
        },{
          text: this.$t('general.actions'),
          value: 'actions',
          align: 'center',
          sortable: false
        }]
      },
      onOptionChange() {
        this.loadTypeMappings()
      },
      onTransformationOptionChange() {
        this.loadTypeMappingsNoTransformations()
      },
      onSelectedMetatypeRelationshipPairChange() {
        this.loadTypeMappingsFromSearch()
      },
      onSelectedMetatypeChange() {
        this.loadTypeMappingsFromSearch()
      },
      onSelectedDataSourceChange(dataSource: DataSourceT) {
        if(!dataSource) return;

        this.loadTypeMappings()
        this.loadTypeMappingsNoTransformations()
      },
      onSearchChange(newVal: string) {
        if(newVal === "") return;

        this.$client.listMetatypes(this.containerID, {name: newVal, loadKeys: false, ontologyVersion: this.$store.getters.currentOntologyVersionID})

            .then((metatypes) => {
              this.metatypes = metatypes as MetatypeT[]
            })
            .catch((e: any) => this.errorMessage = e)
      },
      onRelationshipSearchChange(newVal: string) {
        if(newVal === "") return

        this.$client.listMetatypeRelationshipPairs(this.containerID, {
          name: newVal,
          limit: 1000,
          offset: 0,
          originID: undefined,
          destinationID: undefined,
          ontologyVersion: this.$store.getters.currentOntologyVersionID,
          loadRelationships: false,
        })
            .then(pairs => {
              this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
            })
            .catch(e => this.errorMessage = e)
      },
      setDataSource(dataSource: any) {
        this.selectedDataSource = dataSource
        this.$router.replace(`/containers/${this.containerID}/data-mapping/${this.selectedDataSource?.id}`)
      },
      activateMapping(mapping: TypeMappingT) {
        this.$client.updateTypeMapping(this.containerID, mapping.data_source_id, mapping.id, mapping)
          .then(() => {
            this.loadTypeMappings()
          })
          .catch((e: any) => this.errorMessage = e)
      },
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
      },
      loadTypeMappingsFromSearch() {
        if(this.selectedDataSource) {
          this.mappingsLoading= true
          this.typeMappings = []

          this.$client.listTypeMappings(this.containerID, this.selectedDataSource?.id!, {
            resultingMetatypeName: (this.selectedMetatype) ? this.selectedMetatype.name : undefined,
            resultingMetatypeRelationshipName: (this.selectedRelationshipPair) ? this.selectedRelationshipPair.relationship_name : undefined
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
      },
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
      },
      mappingDeleted() {
        if(this.selectedMetatype || this.selectedRelationshipPair) {
          this.loadTypeMappingsFromSearch()
          return
        }

        this.loadTypeMappings()
        this.loadTypeMappingsNoTransformations()
      },
      editMapping(typeMapping: TypeMappingT) {
        this.selectedTypeMapping = typeMapping
        this.mappingDialog = true
      },
      viewSamplePayload(mapping: TypeMappingT) {
        this.samplePayload = mapping.sample_payload
        this.dataDialog = true
      },
      mappingsExported() {
        this.successMessage = this.$t('typeMappings.successfullyExported') as string
      },
      // allows the user to potentially review imported type mappings
      mappingsImport(results: ResultT<any>[]) {
        this.importedMappingResults = results
        const errors = results.filter(r => r.isError)
        if(errors.length > 0){
          this.errorMessage = this.$t('errors.importMappings') as string
          this.loadTypeMappings()
        } else {
          this.$router.go(0);
        }

      },
      isDeprecated(transformation: TypeMappingTransformationT) {
       if(transformation && this.$store.getters.ontologyVersioningEnabled) {
         if(transformation.metatype_id && transformation.metatype_ontology_version !== this.currentOntologyVersion?.id) return 'edited-item'
         if(transformation.metatype_relationship_pair_id && transformation.metatype_relationship_pair_ontology_version !== this.currentOntologyVersion?.id) return 'edited-item'
       }
      },
      upgradeMappings() {
        this.upgradeDialog = false
        const payload: TypeMappingUpgradePayloadT = {
          ontology_version: this.currentOntologyVersion?.id!,
          mapping_ids: (this.selectedMappings.length > 0) ? this.selectedMappings.map((m: TypeMappingT) => m.id) : this.typeMappings.map(m => m.id)
        }

        this.$client.upgradeTypeMappings(this.containerID, this.selectedDataSource?.id!, payload)
        .then(() => {
          this.loadTypeMappings()
          this.$forceUpdate()
        })
        .catch(e => this.errorMessage = e)
      }
    },

    mounted() {
      this.$client.listOntologyVersions(this.$store.getters.activeContainerID, {status: 'published'})
          .then((results) => {
            if(results.length > 0) {
              this.currentOntologyVersion = results[0]
            }
          })
          .catch((e: any) =>  this.errorMessage = e)
    }
  });
</script>

<style lang="scss">
.edited-item {
  background: $warning;
  color: white;
  box-shadow: -5px 0 0 $warning, 5px 0 0 $warning;

  &:hover {
    background: lighten($warning, 5%) !important;
    color: black;
  }

  .v-icon__svg {
    color: white !important;
  }

  .v-icon {
    color: white !important;
  }
}

.box {
  float: left;
  height: 20px;
  width: 20px;
  margin-bottom: 15px;
  margin-left: 15px;
  clear: both;
}

.edited {
  background-color: $warning;
}

.card-actions-fixed {
  position: absolute;
  bottom: 0;
  width: 100%;
  background-color: white;
}

.transformation-badge {
  .v-badge__badge {
    outline: 1px solid white;
    inset: auto auto calc(100% - 9px) calc(100% + 4px) !important;
  }
}
</style>