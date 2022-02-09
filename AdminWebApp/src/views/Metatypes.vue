<template>
  <div>
    <ontology-version-toolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @selected="loadMetatypes">
    </ontology-version-toolbar>
    <v-data-table
        :headers="headers()"
        :items="metatypes"
        :server-items-length="metatypesCount"
        :options.sync="options"
        :loading="metatypesLoading"
        :items-per-page="100"
        :footer-props="{
          'items-per-page-options': [25, 50, 100]
        }"
        class="elevation-1"
    >

      <template v-slot:top>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-alert type="success" v-if="createdMetatype">
          {{$t('metatypes.metatypeSuccessfullyCreated')}} -
          <span>
            <edit-metatype-dialog :metatype="createdMetatype"></edit-metatype-dialog>
          </span>
        </v-alert>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("metatypes.metatypes")}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <create-metatype-dialog :containerID="containerID" @metatypeCreated="recentlyCreatedMetatype"></create-metatype-dialog>
        </v-toolbar>
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('metatypes.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('metatypes.searchDescription')" class="mx-4"></v-text-field>
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
        <edit-metatype-dialog :metatype="item" :icon="true" @metatypeEdited="loadMetatypes()"></edit-metatype-dialog>
        <v-icon
            small
            @click="deleteMetatype(item)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import { MetatypeT } from '@/api/types';
import EditMetatypeDialog from "@/components/editMetatypeDialog.vue";
import CreateMetatypeDialog from "@/components/createMetatypeDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import OntologyVersionToolbar from "@/components/ontology/ontologyVersionToolbar.vue";

@Component({components: {
    EditMetatypeDialog,
    CreateMetatypeDialog,
    OntologyVersionToolbar
  }})
export default class Metatypes extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  copy = mdiFileDocumentMultiple
  errorMessage = ""
  successMessage = ""
  metatypesLoading = false
  metatypes: MetatypeT[] = []
  createdMetatype: MetatypeT | null = null
  metatypesCount = 0
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
    this.loadMetatypes()
  }

  @Watch('name')
  onNameChange() {
    this.countMetatypes()
    this.loadMetatypes()
  }

  @Watch('description')
  onDescriptionChange() {
    this.countMetatypes()
    this.loadMetatypes()
  }

  mounted() {
    this.countMetatypes()
  }

  headers() {
    return  [
      { text: '', value: 'copy' },
      { text: this.$t('metatypes.id'), value: 'id' },
      { text: this.$t('metatypes.name'), value: 'name' },
      { text: this.$t('metatypes.description'), value: 'description'},
      { text: this.$t('metatypes.actions'), value: 'actions', sortable: false }
    ]
  }

  countMetatypes() {
    this.$client.listMetatypes(this.containerID, {
      ontologyVersion: this.$store.getters.selectedOntologyVersionID,
      count: true,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then(metatypesCount => {
          this.metatypesCount = metatypesCount as number
        })
        .catch(e => this.errorMessage = e)
  }

  loadMetatypes(){
    this.metatypesLoading = true
    this.metatypes = []

    const {page, itemsPerPage, sortBy, sortDesc} = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listMetatypes(this.containerID, {
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      ontologyVersion: this.$store.getters.selectedOntologyVersionID,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          this.metatypesLoading = false
          this.metatypes = results as MetatypeT[]
          this.$forceUpdate()
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteMetatype(item: any) {
    this.$client.deleteMetatype(this.containerID, item.id)
        .then(() => {
          this.loadMetatypes()
        })
        .catch(e => this.errorMessage = e)
  }

  recentlyCreatedMetatype(metatype: MetatypeT) {
    this.createdMetatype = metatype
    this.countMetatypes()
    this.loadMetatypes()
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
