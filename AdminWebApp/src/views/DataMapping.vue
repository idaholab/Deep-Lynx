<template>
  <div>
    <v-card
    >
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-alert type="success" v-if="importedMappingResults.length > 0">
        {{$t('dataMapping.mappingsImported')}} -
        <v-btn style="margin-top: 10px" class="mb-2" @click="reviewMappings = true">Review</v-btn>
      </v-alert>
      <select-data-source
          :containerID="containerID"
          :show-archived="true"
          :dataSourceID="argument"
          @selected="setDataSource">
      </select-data-source>
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
          <v-row v-if="!reviewMappings">
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
            <v-col :cols="3">
              <export-mappings-dialog v-if="selectedDataSource && !reviewMappings" :containerID="containerID" :dataSourceID="selectedDataSource.id" :mappings="selectedMappings" @mappingsExported="mappingsExported()"></export-mappings-dialog>
            </v-col>
            <v-col :cols="3">
              <import-mappings-dialog v-if="selectedDataSource && !reviewMappings" :containerID="containerID" :dataSourceID="selectedDataSource.id" @mappingsImported="mappingsImport"></import-mappings-dialog>
            </v-col>
          </v-row>

        </v-card-title>
        <v-data-table
            v-if="selectedMetatype || selectedRelationshipPair && !reviewMappings"
            v-model="selectedMappings"
            show-select
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

        <v-col :cols="4"><div class="box edited"></div><p> - {{$t('dataMapping.deprecated')}} <info-tooltip :message="$t('dataMapping.deprecatedTooltip')"></info-tooltip></p></v-col>
        <v-data-table
            v-if="!selectedMetatype && !selectedRelationshipPair && !reviewMappings"
            :headers="headers()"
            :items="typeMappings"
            v-model="selectedMappings"
            show-select
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
            <v-checkbox v-model="item.active" :disabled="true"></v-checkbox>
          </template>

          <template v-slot:[`item.resulting_types`]="{ item }">
            <div v-for="transformation in item.transformations" :key="transformation.id">
              <span :class="isDeprecated(transformation)">{{transformation.metatype_name}}</span>
              <span :class="isDeprecated(transformation)">{{transformation.metatype_relationship_pair_name}}</span>
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
        width="500"
    >
      <v-card style="overflow-y: scroll">
        <v-card-title class="headline grey lighten-2">
          {{$t('dataMapping.viewSamplePayload')}}
        </v-card-title>
        <json-view
            class="text-wrap"
            :data="samplePayload"
            :maxDepth=4
        />

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
          <v-flex class="text-right">
            <v-icon class="justify-right"  @click="mappingDialog = false">mdi-window-close</v-icon>
          </v-flex>
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
import {
  DataSourceT,
  MetatypeRelationshipPairT,
  MetatypeT, OntologyVersionT,
  ResultT,
  TypeMappingT,
  TypeMappingTransformationT
} from "@/api/types";
import DataTypeMapping from "@/components/dataTypeMapping.vue"
import ExportMappingsDialog from "@/components/exportMappingsDialog.vue";
import ImportMappingsDialog from "@/components/importMappingsDialog.vue";
import SelectDataSource from "@/components/selectDataSource.vue";
import DeleteTypeMappingDialog from "@/components/deleteTypeMappingDialog.vue";

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
    this.loadTypeMappings()
  }

  isDeprecated(transformation: TypeMappingTransformationT) {
   if(transformation && this.$store.getters.ontologyVersioningEnabled) {
     if(transformation.metatype_ontology_version !== this.currentOntologyVersion?.id) return 'edited-item'
     if(transformation.metatype_relationship_pair_ontology_version !== this.currentOntologyVersion?.id) return 'edited-item'
   }
  }
}
</script>

<style lang="scss">
.edited-item {
  background: #FB8C00;
  color: white;
  box-shadow: -5px 0 0 #FB8C00, 5px 0 0 #FB8C00;

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
  background-color: #FB8C00;
}

</style>