<template>
  <div>
    <ontology-version-toolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @selected="loadMetatypeRelationships">
    </ontology-version-toolbar>
    <v-data-table
        :headers="headers()"
        :items="metatypeRelationships"
        :server-items-length="metatypeRelationshipCount"
        :options.sync="options"
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
        <v-alert type="success" v-if="createdRelationship">
          {{$t('metatypeRelationships.relationshipSuccessfullyCreated')}} -
          <span>
            <edit-metatype-relationship-dialog :metatypeRelationship="createdRelationship"></edit-metatype-relationship-dialog>
          </span>
        </v-alert>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('metatypeRelationships.metatypeRelationships')}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <create-metatype-relationship-dialog :containerID="containerID" @metatypeRelationshipCreated="recentlyCreatedRelationship"></create-metatype-relationship-dialog>
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

      <template v-slot:[`item.copy`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
          </template>
          <span>{{$t('metatypes.copyID')}}</span>
          <span>{{item.id}}</span>
        </v-tooltip>
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <edit-metatype-relationship-dialog :metatypeRelationship="item" :icon="true" @metatypeRelationshipEdited="loadMetatypeRelationships"></edit-metatype-relationship-dialog>
        <v-icon
            small
            @click="deleteRelationship(item)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {MetatypeRelationshipT} from '@/api/types';
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import EditMetatypeRelationshipDialog from "@/components/editMetatypeRelationshipDialog.vue";
import CreateMetatypeRelationshipDialog from "@/components/createMetatypeRelationshipDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import OntologyVersionToolbar from "@/components/ontology/ontologyVersionToolbar.vue";

@Component({components: {
    EditMetatypeRelationshipDialog,
    CreateMetatypeRelationshipDialog,
    OntologyVersionToolbar
  }})
export default class MetatypeRelationships extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  copy = mdiFileDocumentMultiple
  errorMessage = ""
  successMessage = ""
  loading = false
  metatypeRelationships: MetatypeRelationshipT[] = []
  createdRelationship: MetatypeRelationshipT | null = null
  metatypeRelationshipCount = 0
  name = ""
  description = ""
  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}

  @Watch('options')
  onOptionChange() {
    this.loadMetatypeRelationships()
  }

  @Watch('name')
  onNameChange() {
    this.countRelationships()
    this.loadMetatypeRelationships()
  }

  @Watch('description')
  onDescriptionChange() {
    this.countRelationships()
    this.loadMetatypeRelationships()
  }

  mounted() {
    this.countRelationships()
  }

  headers() {
    return [
      { text: '', value: 'copy' },
      { text: this.$t('metatypeRelationships.id'), value: 'id' },
      { text: this.$t('metatypeRelationships.name'), value: 'name' },
      { text: this.$t('metatypeRelationships.description'), value: 'description'},
      { text: this.$t('metatypeRelationships.actions'), value: 'actions', sortable: false }
    ]
  }

  countRelationships() {
    this.$client.listMetatypeRelationships(this.containerID, {
      count: true,
      ontologyVersion: this.$store.getters.selectedOntologyVersionID,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then(relationshipCount => {
          this.metatypeRelationshipCount = relationshipCount as number
        })
        .catch(e => this.errorMessage = e)
  }


  loadMetatypeRelationships(){
    this.loading = true
    this.metatypeRelationships = []

    const {page, itemsPerPage, sortBy, sortDesc} = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listMetatypeRelationships(this.containerID, {
      ontologyVersion: this.$store.getters.selectedOntologyVersionID,
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          this.loading = false
          this.metatypeRelationships = results as MetatypeRelationshipT[]
          this.$forceUpdate()
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteRelationship(item: any) {
    this.$client.deleteMetatypeRelationship(this.containerID, item.id, {permanent: !this.$store.getters.isEditMode})
        .then(() => {
          this.loadMetatypeRelationships()
        })
        .catch(e => console.log(e))
  }

  recentlyCreatedRelationship(relationship: MetatypeRelationshipT) {
    this.createdRelationship = relationship
    this.countRelationships()
    this.loadMetatypeRelationships()
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
