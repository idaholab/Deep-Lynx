<template>
  <div>
    <v-card>
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-alert type="success" v-if="importedMappingResults.length > 0">
        {{$t('dataMapping.mappingsImported')}} -
        <v-btn style="margin-top: 10px" class="mb-2" @click="reviewMappings = true">Review</v-btn>
      </v-alert>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('home.dataMappingDescription')}}</v-toolbar-title>
      </v-toolbar>

      <div class="mx-2">
        <select-data-source
          :containerID="containerID"
          :show-archived="true"
          :dataSourceID="argument"
          @selected="setDataSource">
        </select-data-source>
      </div>

      <v-divider v-if="selectedDataSource !== null"></v-divider>

      <v-tabs v-if="selectedDataSource !== null" grow class="mt-4">
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
                :label="$t('dataMapping.chooseResultingMetatype')"
                :placeholder="$t('dataMapping.typeToSearch')"
                return-object
                :disabled="selectedRelationshipPair != null"
                clearable
            >
              <template slot="append-outer"><info-tooltip :message="$t('dataMapping.metatypeSearchHelp')"></info-tooltip> </template>
            </v-autocomplete>
          </v-col>
          <v-col :cols="6" class="px-8">
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
        <v-row class="mb-3">
          <v-col :cols="4" class="d-flex justify-center">
            <export-mappings-dialog v-if="selectedDataSource && !reviewMappings" :containerID="containerID" :dataSourceID="selectedDataSource.id" :mappings="selectedMappings" @mappingsExported="mappingsExported()"></export-mappings-dialog>
          </v-col>
          <v-col :cols="4" class="d-flex justify-center">
            <import-mappings-dialog v-if="selectedDataSource && !reviewMappings" :containerID="containerID" :dataSourceID="selectedDataSource.id" @mappingsImported="mappingsImport"></import-mappings-dialog>
          </v-col>
          <v-col :cols="4" class="d-flex justify-center">
            <v-btn color="primary" @click="upgradeMappings">Upgrade All Mappings</v-btn>
          </v-col>
        </v-row>

        <v-divider v-if="selectedDataSource !== null"></v-divider>

        <v-data-table
            v-if="selectedMetatype || selectedRelationshipPair && !reviewMappings"
            v-model="selectedMappings"
            show-select
            :headers="headers()"
            :items="typeMappings"
            :items-per-page="25"
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

            <delete-type-mapping-dialog
                :containerID="containerID"
                :dataSourceID="selectedDataSource.id"
                :mappingID="item.value.id"
                :icon="true"
                @typeMappingDeleted="mappingDeleted()"
            ></delete-type-mapping-dialog>
          </template>
        </v-data-table>



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
            <p v-if="!item.isError">Successful</p>
            <p v-else style="color:orange">Error: {{item.error}}</p>
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
                :containerID="this.containerID"
                :dataSourceID="this.selectedDataSource.id"
                :mappingID="item.value.id"
                :icon="true"
                @typeMappingDeleted="mappingDeleted()"
            ></delete-type-mapping-dialog>
          </template>
        </v-data-table>

        <v-toolbar v-if="reviewMappings">
          <v-btn color="error" @click="reviewMappings = false; importedMappingResults = []">End Review</v-btn>
        </v-toolbar>

        <v-col :cols="4" class="mt-2 mb-n3"><div class="box edited mr-2"></div><p>{{$t('dataMapping.deprecated')}} <info-tooltip :message="$t('dataMapping.deprecatedTooltip')"></info-tooltip></p></v-col>
        <v-data-table
            v-if="!selectedMetatype && !selectedRelationshipPair && !reviewMappings"
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
            <v-checkbox v-model="item.active" :disabled="true"></v-checkbox>
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
          <span class="headline text-h3">{{$t('dataMapping.viewSamplePayload')}}</span>
        </v-card-title>

        <json-view
          class="pt-4 px-4 flex-grow-1"
          style="overflow-y: auto; overflow-x: auto"
          :data="samplePayload"
          :maxDepth=4
        />

        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <!-- TODO: Fill with actions like edit and delete -->
          <v-btn color="blue darken-1" text @click="dataDialog = false" >{{$t("dataMapping.done")}}</v-btn>
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
          <span class="headline text-h3">{{$t('dataImports.editTypeMapping')}}</span>
          <v-flex class="text-right">
            <v-icon class="justify-right"  @click="mappingDialog = false">mdi-window-close</v-icon>
          </v-flex>
        </v-card-title>

        <div class="flex-grow-1" v-if="selectedDataSource !== null && mappingDialog">
          <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" :typeMappingID="selectedTypeMapping.id" @mappingCreated="mappingDialog = false" @updated="loadTypeMappings"></data-type-mapping>
        </div>
        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="mappingDialog = false" >{{$t("dataMapping.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
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
import SelectDataSource from "@/components/dataSources/selectDataSource.vue";
import DeleteTypeMappingDialog from "@/components/etl/deleteTypeMappingDialog.vue";

@Component({filters: {
    pretty: function(value: any) {
      return JSON.stringify(value, null, 2);
    }
  },
  components: {
    DataTypeMapping,
    ExportMappingsDialog,
    ImportMappingsDialog,
    SelectDataSource,
    DeleteTypeMappingDialog
  }})
export default class DataMapping extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: false, default: ""})
  readonly argument!: string;

  errorMessage = ""
  dataDialog = false
  mappingDialog = false
  samplePayload: object | null = null
  successMessage = ""
  noTransformationsCount = 0
  activeTab = "currentMappings"
  selectedDataSource: DataSourceT | null = null
  typeMappings: TypeMappingT[] = []
  typeMappingsNoTransformations: TypeMappingT[] = []
  selectedMappings: [] = []
  importedMappingResults: ResultT<any>[] = []
  reviewMappings = false
  currentOntologyVersion: OntologyVersionT | null = null

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

  reviewHeaders() {
    return [{
      text: this.$t('dataMapping.importedSuccessfully'),
      value: "isError",
      align: 'center'
    },{
      text: this.$t('dataMapping.samplePayload'),
      value: "value.sample_payload",
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

  @Watch('metatypeSearch', {immediate: false})
  onSearchChange(newVal: string) {
    if(newVal === "") return;

    this.$client.listMetatypes(this.containerID, {name: newVal, loadKeys: false, ontologyVersion: this.$store.getters.currentOntologyVersionID})

        .then((metatypes) => {
          this.metatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipPairSearch', {immediate: false})
  onRelationshipSearchChange(newVal: string) {
    if(newVal === "") return

    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      name: newVal,
      limit: 1000,
      offset: 0,
      originID: undefined,
      destinationID: undefined,
      ontologyVersion: this.$store.getters.currentOntologyVersionID
    })
        .then(pairs => {
          this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
        })
        .catch(e => this.errorMessage = e)
  }

  setDataSource(dataSource: any) {
    this.selectedDataSource = dataSource
    this.$router.replace(`/containers/${this.containerID}/data-mapping/${this.selectedDataSource?.id}`)
  }

  mounted() {
    this.$client.listOntologyVersions(this.$store.getters.activeContainerID, {status: 'published'})
        .then((results) => {
          if(results.length > 0) {
            this.currentOntologyVersion = results[0]
          }
        })
        .catch((e: any) =>  this.errorMessage = e)
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

  mappingDeleted() {
    if(this.selectedMetatype || this.selectedRelationshipPair) {
      this.loadTypeMappingsFromSearch()
      return
    }

    this.loadTypeMappings()
    this.loadTypeMappingsNoTransformations()
  }

  editMapping(typeMapping: TypeMappingT) {
    this.selectedTypeMapping = typeMapping
    this.mappingDialog = true
  }

  viewSamplePayload(mapping: TypeMappingT) {
    this.samplePayload = mapping.sample_payload
    this.dataDialog = true
  }

  mappingsExported() {
    this.successMessage = 'Mappings successfully Exported'
  }

  // allows the user to potentially review imported type mappings
  mappingsImport(results: ResultT<any>[]) {
    this.importedMappingResults = results
    this.$router.go(0);
    this.loadTypeMappings()
  }

  isDeprecated(transformation: TypeMappingTransformationT) {
   if(transformation && this.$store.getters.ontologyVersioningEnabled) {
     if(transformation.metatype_id && transformation.metatype_ontology_version !== this.currentOntologyVersion?.id) return 'edited-item'
     if(transformation.metatype_relationship_pair_id && transformation.metatype_relationship_pair_ontology_version !== this.currentOntologyVersion?.id) return 'edited-item'
   }
  }

  upgradeMappings() {
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
}
</script>

<style lang="scss">
.edited-item {
  background: #CD7F32;
  color: white;
  box-shadow: -5px 0 0 #CD7F32, 5px 0 0 #CD7F32;

  &:hover {
    background: #FFA726 !important;
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
  background-color: #CD7F32;
}

.card-actions-fixed {
  position: absolute;
  bottom: 0;
  width: 100%;
  background-color: white;
}
</style>
