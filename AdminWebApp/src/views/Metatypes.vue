<template>
  <div>
    <ontology-version-toolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @editModeToggle="loadMetatypes"
        @selectedVersion="loadMetatypes"
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
        :item-class="itemRowBackground"
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
          <create-metatype-dialog
              v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled) || !$store.getters.ontologyVersioningEnabled"
              :containerID="containerID"
              @metatypeCreated="recentlyCreatedMetatype">
          </create-metatype-dialog>
        </v-toolbar>
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('metatypes.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('metatypes.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
        <v-row v-if="$store.getters.isEditMode">
          <v-col :cols="2"><div class="box created"></div><p> - {{$t('metatypes.created')}}</p></v-col>
          <v-col :cols="2"><div class="box edited"></div><p> - {{$t('metatypes.edited')}}</p></v-col>
          <v-col :cols="2"><div class="box removed"></div><p> - {{$t('metatypes.removed')}}</p></v-col>
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

      <template v-slot:[`item.actions`]="{ item }">
        <view-metatype-dialog v-if="!$store.getters.isEditMode && $store.getters.ontologyVersioningEnabled" :metatype="item" :icon="true"></view-metatype-dialog>

           <edit-metatype-dialog
               v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
               :metatype="item"
               :comparisonMetatype="comparisonMetatypes.find(m => m.name === item.name)"
               :icon="true"
               @metatypeEdited="loadMetatypes()"
           >
           </edit-metatype-dialog>

        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                v-on="on"
                small
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
                @click="deleteMetatype(item)"
            >
              mdi-delete
            </v-icon>
          </template>
          <span>{{$t('metatypes.removeMetatype')}}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                v-on="on"
                small
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && item.deleted_at)"
                @click="undeleteMetatype(item)"
            >
              mdi-restore
            </v-icon>
          </template>
          <span>{{$t('metatypes.restoreMetatype')}}</span>
        </v-tooltip>

      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {MetatypeT, OntologyVersionT} from '@/api/types';
import EditMetatypeDialog from "@/components/editMetatypeDialog.vue";
import CreateMetatypeDialog from "@/components/createMetatypeDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import OntologyVersionToolbar from "@/components/ontology/ontologyVersionToolbar.vue";
import ViewMetatypeDialog from "@/components/viewMetatypeDialog.vue";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Diff = require('diff');
const diff = require('deep-diff').diff;

@Component({components: {
    EditMetatypeDialog,
    CreateMetatypeDialog,
    OntologyVersionToolbar,
    ViewMetatypeDialog
  }})
export default class Metatypes extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  copy = mdiFileDocumentMultiple
  errorMessage = ""
  successMessage = ""
  metatypesLoading = false
  metatypes: MetatypeT[] = []
  comparisonMetatypes: MetatypeT[] = []
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
      ontologyVersion: this.ontologyVersionID,
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
      ontologyVersion: this.ontologyVersionID,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          if(!this.$store.getters.isEditMode) {
            this.metatypes = results as MetatypeT[]
            this.metatypesLoading = false
            this.$forceUpdate()
          } else {
            let nameIn = "";
            (results as MetatypeT[]).map((m, i) => {
              if(i == 0 ) nameIn = m.name
              else nameIn = nameIn + "," + m.name
            })

            this.$client.listMetatypes(this.containerID, {
              ontologyVersion: this.$store.getters.selectedOntologyVersionID,
              nameIn,
              loadKeys: true
            })
            .then((comparison) => {
              this.metatypesLoading = false
              this.comparisonMetatypes = comparison as MetatypeT[]
              this.metatypes = results as MetatypeT[]
              this.$forceUpdate()
            })
            .catch((e: any) => this.errorMessage = e)
          }
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteMetatype(item: any) {
    // if we're in edit mode, set permanent false
    this.$client.deleteMetatype(this.containerID, item.id, {permanent: !this.$store.getters.isEditMode})
        .then(() => {
          this.loadMetatypes()
        })
        .catch(e => this.errorMessage = e)
  }

  undeleteMetatype(item: any) {
    // if we're in edit mode, set permanent falst
    this.$client.deleteMetatype(this.containerID, item.id, {reverse: true})
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

  // compareMetatypes takes two metatypes and returns whether they are identical
  // this is used to indicate when a metatype has been edited as part of the new ontology
  compareMetatypes(original: MetatypeT, target: MetatypeT): boolean {
    if(typeof  original === 'undefined') return true
    if(typeof  target === 'undefined') return true
    // first copy the objects over so that our key deletion does not affect the real object, since we can't compare
    // ids and metadata we need to get rid of those on each object
    const o = {}
    const t = {}

    Object.assign(o, original)
    Object.assign(t, target)

    // remove the keys we don't want to use to compare
    function cleanMetatype(m: MetatypeT) {
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
        if(p.metatype_id) delete p.metatype_id
        if(p.ontology_version) delete  p.ontology_version
      })
    }

    cleanMetatype(o as MetatypeT)
    cleanMetatype(t as MetatypeT)

    return diff(o, t)
  }

  itemRowBackground(item: any) {
    if(this.$store.getters.isEditMode) {
      const matchedMetatype =  this.comparisonMetatypes.find(m => m.name === item.name)!

      if(item.deleted_at) {
        return 'deleted-item'
      }

      if(!matchedMetatype) {
        return 'created-item'
      }

      if(this.compareMetatypes(matchedMetatype, item)) {
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
    background: #FB8C00;
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
    background-color: #FB8C00;
  }

  .removed {
    background-color: #E53935;
  }
</style>
