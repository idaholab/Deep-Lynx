<template>
  <div>
    <v-data-table
        :headers="headers()"
        :items="relationshipPairs"
        :options.sync="options"
        :server-items-length="relationshipPairCount"
        :loading="loading"
        :items-per-page="100"
        :footer-props="{
          'items-per-page-options': [25, 50, 100]
        }"
        class="elevation-1"
    >
      <template v-slot:top>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("home.metatypeRelationshipPairs")}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <v-dialog v-model="dialog" max-width="500px">
            <template v-slot:activator="{ on }">
              <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("metatypeRelationshipPairs.formTitle")}}</v-btn>
            </template>
            <v-card>
              <v-card-title>
                <span class="headline">{{$t("metatypeRelationshipPairs.formTitle")}}</span>
              </v-card-title>

              <v-card-text>
                <v-container>
                  <v-row>
                    <v-col :cols="12">

                      <v-form
                          ref="form"
                          v-model="valid"
                          lazy-validation
                      >
                        <v-text-field
                            v-model="name"
                            label="Name"
                            required
                        ></v-text-field>
                        <v-textarea
                            v-model="description"
                            label="Description"
                        ></v-textarea>
                        <v-autocomplete
                            v-model="originSelect"
                            :label="$t('metatypeRelationshipPairs.originMetatype')"
                            :single-line="false"
                            :items="originMetatypes"
                            :search-input.sync="originSearch"
                            item-text="name"
                            item-value="id"
                            persistent-hint
                            required
                        ></v-autocomplete>
                        <v-autocomplete
                            v-model="relationshipType"
                            :label="$t('metatypeRelationshipPairs.relationship')"
                            :single-line="false"
                            :items="metatypeRelationships"
                            :search-input.sync="relationshipSearch"
                            item-text="name"
                            item-value="id"
                            persistent-hint
                            required
                        ></v-autocomplete>
                        <v-autocomplete
                            v-model="destinationSelect"
                            :label="$t('metatypeRelationshipPairs.destinationMetatype')"
                            :single-line="false"
                            :items="destinationMetatypes"
                            :search-input.sync="destinationSearch"
                            item-text="name"
                            item-value="id"
                            persistent-hint
                            required
                        ></v-autocomplete>
                      </v-form>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>

              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("home.cancel")}}</v-btn>
                <v-btn color="blue darken-1" text @click="newRelationshipPair()">{{$t("home.save")}}</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-toolbar>
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('metatypeRelationships.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('metatypeRelationships.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <v-icon
            small
            class="mr-2"
            @click="enableRelationshipEdit(item)"
        >
          mdi-pencil
        </v-icon>
        <v-icon
            small
            @click="deleteRelationship(item)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
    <v-dialog v-model="editDialog" max-width="500px">

      <v-card>
        <v-card-title>
          <span class="headline">Edit {{selectedRelationshipPair.name}}</span>
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col :cols="12">

                <v-form
                    ref="form"
                    v-model="valid"
                    lazy-validation
                >
                  <v-text-field
                      v-model="selectedRelationshipPair.name"
                      label="Name"
                      required
                  ></v-text-field>
                  <v-textarea
                      v-model="selectedRelationshipPair.description"
                      label="Description"
                  ></v-textarea>
                  <v-autocomplete
                      v-model="selectedRelationshipPair.origin_metatype_id"
                      :label="$t('metatypeRelationshipPairs.originMetatype')"
                      :items="originMetatypes"
                      :search-input.sync="originSearch"
                      :single-line="false"
                      item-text="name"
                      item-value="id"
                      persistent-hint
                      required
                  ></v-autocomplete>
                  <v-autocomplete
                      v-model="selectedRelationshipPair.relationship_id"
                      :label="$t('metatypeRelationshipPairs.relationship')"
                      :items="metatypeRelationships"
                      item-text="name"
                      item-value="id"
                      persistent-hint
                      single-line
                      required
                  ></v-autocomplete>
                  <v-autocomplete
                      v-model="selectedRelationshipPair.destination_metatype_id"
                      :label="$t('metatypeRelationshipPairs.relationship')"
                      :single-line="false"
                      :items="destinationMetatypes"
                      :search-input.sync="destinationSearch"
                      item-text="name"
                      item-value="id"
                      persistent-hint
                      required
                  ></v-autocomplete>
                </v-form>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="editDialog = false" >{{$t("home.cancel")}}</v-btn>
          <v-btn color="blue darken-1" text @click="editRelationship()">{{$t("home.save")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import { MetatypeT, MetatypeRelationshipT, MetatypeRelationshipPairT } from '@/api/types';

@Component
export default class MetatypeRelationshipPairs extends Vue {
  @Prop({required: true})
  readonly containerID!: string;


  errorMessage = ""
  successMessage = ""
  loading = false
  dialog= false
  editDialog= false
  destinationSearch = ""
  originSearch = ""
  relationshipSearch = ""
  relationshipPairCount = 0
  originMetatypes: MetatypeT[] = []
  destinationMetatypes: MetatypeT[] = []
  metatypeRelationships: MetatypeRelationshipT[] = []
  relationshipPairs: MetatypeRelationshipPairT[] = []
  selectedRelationshipPair: MetatypeRelationshipPairT = {
    id: "",
    container_id: this.containerID,
    name: "",
    description: "",
    relationship_id: "",
    origin_metatype_id: "",
    destination_metatype_id: "",
    relationship_type: "many:many",
    created_at: "",
    modified_at: "",
    created_by: "",
    modified_by: ""
  }
  valid = null
  name = ""
  description =  ""
  originSelect = ""
  destinationSelect = ""
  relationshipType = ""
  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}


  @Watch('options')
  onOptionChange() {
    this.loadMetatypeRelationshipPairs()
  }

  @Watch('name')
  onNameChange() {
    this.countRelationshipPairs()
    this.loadMetatypeRelationshipPairs()
  }

  @Watch('description')
  onDescriptionChange() {
    this.countRelationshipPairs()
    this.loadMetatypeRelationshipPairs()
  }

  @Watch('destinationSearch', {immediate: true})
  onDestinationSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal})
        .then((metatypes) => {
          this.destinationMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('originSearch', {immediate: true})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipSearch', {immediate: true})
  relationshipSearchChange(newVal: string) {
    this.$client.listMetatypeRelationships(this.containerID,  {name: newVal})
        .then(metatypeRelationships => {
          this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
        })
        .catch(e => this.errorMessage = e)
  }

  mounted() {
    this.countRelationshipPairs()
  }

  headers() {
    return [
      { text: this.$t('metatypeRelationshipPairs.name'), value: 'name' },
      { text: this.$t('metatypeRelationshipPairs.description'), value: 'description'},
      { text: this.$t('metatypeRelationshipPairs.actions'), value: 'actions', sortable: false }
    ]
  }

  countRelationshipPairs() {
    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      count: true,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then(relationshipCount => {
          this.relationshipPairCount= relationshipCount as number
        })
        .catch(e => this.errorMessage = e)
  }

  loadMetatypeRelationshipPairs() {
    this.loading = true
    this.metatypeRelationships = []

    const {page, itemsPerPage, sortBy, sortDesc} = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          this.relationshipPairs = results as MetatypeRelationshipPairT[]
          this.loading = false
        })
        .catch((e: any) => this.errorMessage = e)
  }

  refreshMetatypeRelationships() {
    this.$client.listMetatypeRelationships(this.containerID,  {limit: 1000, offset: 0})
        .then(metatypeRelationships => {
          this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
        })
        .catch(e => this.errorMessage = e)
  }

  newRelationshipPair() {
    this.$client.createMetatypeRelationshipPair(this.containerID,
        {"name": this.name,
          "description": this.description,
          "origin_metatype_id": this.originSelect,
          "destination_metatype_id": this.destinationSelect,
          "relationship_id": this.relationshipType,
          "relationship_type": "many:many"}
    )
    this.dialog = false
    this.name =  ""
    this.description = ""
    this.loadMetatypeRelationshipPairs()
  }

  enableRelationshipEdit(item: any) {
    this.editDialog = true
    this.selectedRelationshipPair = item
  }

  editRelationship() {
    this.$client.updateMetatypeRelationshipPair(this.containerID, this.selectedRelationshipPair.id,
        {"name": this.selectedRelationshipPair.name,
          "description": this.selectedRelationshipPair.description,
          "origin_metatype_id": this.selectedRelationshipPair.origin_metatype_id,
          "destination_metatype_id": this.selectedRelationshipPair.destination_metatype_id,
          "relationship_id": this.selectedRelationshipPair.relationship_id}
    )
    this.editDialog = false
  }

  deleteRelationship(item: any) {
    this.$client.deleteMetatypeRelationshipPair(this.containerID, item.id)
        .then(() => {
          this.loadMetatypeRelationshipPairs()
        })
        .catch(e => this.errorMessage = e)
  }
}
</script>
