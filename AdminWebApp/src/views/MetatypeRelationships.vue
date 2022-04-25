<template>
  <div>
    <ontology-version-toolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @editModeToggle="loadMetatypeRelationships"
        @selectedVersion="loadMetatypeRelationships"
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
        :item-class="itemRowBackground"
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
          <v-toolbar-title>{{$t('home.metatypeRelationshipsDescription')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-metatype-relationship-dialog
              v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled) || !$store.getters.ontologyVersioningEnabled"
              :containerID="containerID"
              @metatypeRelationshipCreated="recentlyCreatedRelationship">
          </create-metatype-relationship-dialog>
        </v-toolbar>
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('metatypeRelationships.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('metatypeRelationships.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
        <v-row v-if="$store.getters.isEditMode">
          <v-col :cols="2"><div class="box created mr-2"></div><p>{{$t('metatypes.created')}}</p></v-col>
          <v-col :cols="2"><div class="box edited mr-2"></div><p>{{$t('metatypes.edited')}}</p></v-col>
          <v-col :cols="2"><div class="box removed mr-2"></div><p>{{$t('metatypes.removed')}}</p></v-col>
        </v-row>
        <v-row>
          <v-col v-if="$store.getters.isEditMode" :cols="12"><p style="margin-left: 15px"><strong>Note: </strong> {{$t('metatypes.legendNote')}}</p></v-col>
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

      <v-tooltip bottom>

      </v-tooltip>
      <template v-slot:[`item.actions`]="{ item }">
        <view-metatype-relationship-dialog
            v-if="!$store.getters.isEditMode && $store.getters.ontologyVersioningEnabled"
            :metatypeRelationship="item"
            :icon="true"></view-metatype-relationship-dialog>

        <edit-metatype-relationship-dialog
            v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
            :metatypeRelationship="item" :icon="true"
            :comparisonMetatypeRelationship="comparisonRelationships.find(m => m.name === item.name)"
            @metatypeRelationshipEdited="loadMetatypeRelationships"
        >
        </edit-metatype-relationship-dialog>

        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                small
                v-on="on"
                @click="deleteRelationship(item)"
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
            >
              mdi-delete
            </v-icon>
          </template>
          <span>{{$t('metatypeRelationships.removeRelationship')}}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                small
                v-on="on"
                @click="undeleteRelationship(item)"
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && item.deleted_at)"
            >
              mdi-restore
            </v-icon>
          </template>
          <span>{{$t('metatypeRelationships.restoreRelationship')}}</span>
        </v-tooltip>


      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {MetatypeRelationshipT} from '@/api/types';
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import EditMetatypeRelationshipDialog from "@/components/ontology/metatypeRelationships/editMetatypeRelationshipDialog.vue";
import CreateMetatypeRelationshipDialog from "@/components/ontology/metatypeRelationships/createMetatypeRelationshipDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import OntologyVersionToolbar from "@/components/ontology/versioning/ontologyVersionToolbar.vue";
import ViewMetatypeRelationshipDialog
  from "@/components/ontology/metatypeRelationships/viewMetatypeRelationshipDialog.vue";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const diff = require('deep-diff').diff;

@Component({components: {
    EditMetatypeRelationshipDialog,
    CreateMetatypeRelationshipDialog,
    OntologyVersionToolbar,
    ViewMetatypeRelationshipDialog
  }})
export default class MetatypeRelationships extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  copy = mdiFileDocumentMultiple
  errorMessage = ""
  successMessage = ""
  loading = false
  metatypeRelationships: MetatypeRelationshipT[] = []
  comparisonRelationships: MetatypeRelationshipT[] = []
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
      ontologyVersion: this.ontologyVersionID,
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
      ontologyVersion: this.ontologyVersionID,
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
      deleted: this.$store.getters.isEditMode
    })
        .then((results) => {
          if(!this.$store.getters.isEditMode){
            this.loading = false
            this.metatypeRelationships = results as MetatypeRelationshipT[]
            this.$forceUpdate()
          } else {
            let nameIn = "";
            (results as MetatypeRelationshipT[]).map((m, i) => {
              if(i == 0) nameIn = m.name
              else nameIn = nameIn + "," + m.name
            })

            this.$client.listMetatypeRelationships(this.containerID, {
              ontologyVersion: this.$store.getters.selectedOntologyVersionID,
              nameIn,
              loadKeys: true
            })
            .then((comparison) => {
              this.loading = false
              this.comparisonRelationships = comparison as MetatypeRelationshipT[]
              this.metatypeRelationships = results as MetatypeRelationshipT[]
              this.$forceUpdate()
            })
            .catch((e: any) => this.errorMessage = e)
          }
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

  undeleteRelationship(item: any) {
    this.$client.deleteMetatypeRelationship(this.containerID, item.id, {reverse: true})
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

  // compareMetatypes takes two relationships and returns whether they are identical
  // this is used to indicate when a metatype has been edited as part of the new ontology
  compareRelationships(original: MetatypeRelationshipT, target: MetatypeRelationshipT): boolean {
    if(typeof  original === 'undefined' || typeof target === 'undefined') return true
    // first copy the objects over so that our key deletion does not affect the real object, since we can't compare
    // ids and metadata we need to get rid of those on each object
    const o = {}
    const t = {}

    Object.assign(o, original)
    Object.assign(t, target)

    // remove the keys we don't want to use to compare
    function cleanRelationship(m: MetatypeRelationshipT) {
      if(m.created_at) delete m.created_at
      if(m.created_by) delete m.created_by
      if(m.modified_at) delete m.modified_at
      if(m.modified_by) delete m.modified_by
      if(m.ontology_version) delete m.ontology_version
      if(m.id) delete m.id
      delete m.old_id
      delete m.parent_id

      m.keys.map(p => {
        if(p.created_at) delete p.created_at
        if(p.created_by) delete p.created_by
        if(p.modified_at) delete p.modified_at
        if(p.modified_by) delete p.modified_by
        if(p.id) delete p.id
        if(p.metatype_relationship_id) delete p.metatype_relationship_id
        if(p.ontology_version) delete  p.ontology_version
      })
    }

    cleanRelationship(o as MetatypeRelationshipT)
    cleanRelationship(t as MetatypeRelationshipT)

    return diff(o, t)
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }

  itemRowBackground(item: any) {
    if(this.$store.getters.isEditMode) {
      const matchedRelationship =  this.comparisonRelationships.find(m => m.name === item.name)!

      if(item.deleted_at) {
        return 'deleted-item'
      }

      if(!matchedRelationship) {
        return 'created-item'
      }

      if(this.compareRelationships(matchedRelationship, item)) {
        return 'edited-item'
      }
    }
    return ''
  }

  get ontologyVersionID() {
    if (this.$store.getters.ontologyVersioningEnabled && this.$store.getters.isEditMode) {
      return this.$store.getters.selectedPendingOntologyVersionID
    } else if (this.$store.getters.ontologyVersioningEnabled) {
      return this.$store.getters.selectedOntologyVersionID
    } else {
      return undefined
    }
  }
}
</script>

<style lang="scss">
.edited-item {
  background: #CD7F32;
  color: white;

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

.created-item {
  background: #7CB342;
  color: white;

  &:hover {
    background: #9CCC65 !important;
    color: black;
  }

  .v-icon__svg {
    color: white !important;
  }

  .v-icon {
    color: white !important;
  }
}

.deleted-item {
  background: #E53935;
  color: white;

  &:hover {
    background: #EF5350 !important;
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

.created {
  background-color: #7CB342;
}

.edited {
  background-color: #CD7F32;
}

.removed {
  background-color: #E53935;
}
</style>
