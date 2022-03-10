<template>
  <div>
    <ontology-version-toolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @editModeToggl="loadMetatypeRelationshipPairs"
        @selectedVersion="loadMetatypeRelationshipPairs"
        @selected="loadMetatypeRelationshipPairs">
    </ontology-version-toolbar>
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
        :item-class="itemRowBackground"
    >
      <template v-slot:top>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-alert type="success" v-if="createdMetatypeRelationshipPair">
          {{$t('metatypeRelationshipPairs.pairSuccessfullyCreated')}} -
          <span>
            <edit-metatype-relationship-pair-dialog :pair="createdMetatypeRelationshipPair"></edit-metatype-relationship-pair-dialog>
          </span>
        </v-alert>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("home.metatypeRelationshipPairs")}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <create-relationship-pair-dialog
              v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled) || !$store.getters.ontologyVersioningEnabled"
              :containerID="containerID"
              @pairCreated="recentlyCreatedPair">
          </create-relationship-pair-dialog>
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
          <v-col :cols="2"><div class="box created"></div><p> - {{$t('metatypes.created')}}</p></v-col>
          <v-col :cols="2"><div class="box edited"></div><p> - {{$t('metatypes.edited')}}</p></v-col>
          <v-col :cols="2"><div class="box removed"></div><p> - {{$t('metatypes.removed')}}</p></v-col>
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
        <view-relationship-pair-dialog
            v-if="!$store.getters.isEditMode && $store.getters.ontologyVersioningEnabled"
            :pair="item"
            :icon="true">
        </view-relationship-pair-dialog>

        <edit-relationship-pair-dialog
            v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
            :comparisonPair="comparisonPairs.find(p => p.name === item.name)"
            :pair="item" :icon="true"
            @pairEdited="loadMetatypeRelationshipPairs()">
        </edit-relationship-pair-dialog>

        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                v-on="on"
                small
                @click="deleteRelationship(item)"
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
            >
              mdi-delete
            </v-icon>
          </template>
          <span>{{$t('metatypeRelationshipPairs.removePair')}}</span>
        </v-tooltip>

        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                v-on="on"
                small
                @click="undeleteRelationship(item)"
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && item.deleted_at)"
            >
              mdi-restore
            </v-icon>
          </template>
          <span>{{$t('metatypeRelationshipPairs.restorePair')}}</span>
        </v-tooltip>

      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {MetatypeRelationshipT, MetatypeRelationshipPairT, MetatypeT} from '@/api/types';
import CreateRelationshipPairDialog from "@/components/ontology/metatypeRelationshipPairs/createRelationshipPairDialog.vue";
import EditRelationshipPairDialog from "@/components/ontology/metatypeRelationshipPairs/editRelationshipPairDialog.vue";
import ViewRelationshipPairDialog from "@/components/ontology/metatypeRelationshipPairs/viewRelationshipPairDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import OntologyVersionToolbar from "@/components/ontology/versioning/ontologyVersionToolbar.vue";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const diff = require('deep-diff').diff;

@Component({components: {
    CreateRelationshipPairDialog,
    EditRelationshipPairDialog,
    OntologyVersionToolbar,
    ViewRelationshipPairDialog
  }})
export default class MetatypeRelationshipPairs extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  copy = mdiFileDocumentMultiple
  errorMessage = ""
  successMessage = ""
  loading = false
  relationshipPairCount = 0
  metatypeRelationships: MetatypeRelationshipT[] = []
  relationshipPairs: MetatypeRelationshipPairT[] = []
  comparisonPairs: MetatypeRelationshipPairT[] = []
  createdMetatypeRelationshipPair: MetatypeRelationshipPairT | null = null

  name = ""
  description =  ""

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

  mounted() {
    this.countRelationshipPairs()
  }

  headers() {
    return [
      { text: '', value: 'copy' },
      { text: this.$t('metatypeRelationshipPairs.id'), value: 'id' },
      { text: this.$t('metatypeRelationshipPairs.name'), value: 'name' },
      { text: this.$t('metatypeRelationshipPairs.description'), value: 'description'},
      { text: this.$t('metatypeRelationshipPairs.actions'), value: 'actions', sortable: false }
    ]
  }

  countRelationshipPairs() {
    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      ontologyVersion: this.ontologyVersionID,
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
          if(!this.$store.getters.isEditMode) {
            this.relationshipPairs = results as MetatypeRelationshipPairT[]
            this.loading = false
            this.$forceUpdate()
          } else {
            let nameIn = "";
            (results as MetatypeRelationshipPairT[]).map((m,i) => {
              if (i === 0) nameIn = m.name
              else nameIn = nameIn + "," + m.name
            })

            this.$client.listMetatypeRelationshipPairs(this.containerID, {
              ontologyVersion: this.ontologyVersionID,
              nameIn,
              loadRelationships: true
            })
                .then((comparison) => {
                  this.loading = false
                  this.comparisonPairs = comparison as MetatypeRelationshipPairT[]
                  this.relationshipPairs = results as MetatypeRelationshipPairT[]
                  this.$forceUpdate()
                })
                .catch((e: any) => this.errorMessage = e)
          }
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteRelationship(item: any) {
    this.$client.deleteMetatypeRelationshipPair(this.containerID, item.id, {permanent: !this.$store.getters.isEditMode})
        .then(() => {
          this.loadMetatypeRelationshipPairs()
          this.$forceUpdate()
        })
        .catch(e => this.errorMessage = e)
  }

  undeleteRelationship(item: any) {
    this.$client.deleteMetatypeRelationshipPair(this.containerID, item.id, {reverse: true})
        .then(() => {
          this.loadMetatypeRelationshipPairs()
          this.$forceUpdate()
        })
        .catch(e => this.errorMessage = e)
  }

  recentlyCreatedPair(pair: MetatypeRelationshipPairT) {
    this.createdMetatypeRelationshipPair = pair
    this.countRelationshipPairs()
    this.loadMetatypeRelationshipPairs()
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
  comparePairs(original: MetatypeRelationshipPairT, target: MetatypeRelationshipPairT): boolean {
    if(typeof  original === 'undefined' || typeof target === 'undefined') return true
    // first copy the objects over so that our key deletion does not affect the real object, since we can't compare
    // ids and metadata we need to get rid of those on each object
    const o = {}
    const t = {}

    Object.assign(o, original)
    Object.assign(t, target)

    // remove the keys we don't want to use to compare
    function cleanPair(m: MetatypeRelationshipPairT) {
      if(m.created_at) delete m.created_at
      if(m.created_by) delete m.created_by
      if(m.modified_at) delete m.modified_at
      if(m.modified_by) delete m.modified_by
      if(m.ontology_version) delete m.ontology_version
      if(m.id) delete m.id
      if(m.origin_metatype) delete m.origin_metatype
      if(m.destination_metatype) delete m.destination_metatype
      if(m.relationship) delete m.relationship
      delete m.old_id
    }

    cleanPair(o as MetatypeRelationshipPairT)
    cleanPair(t as MetatypeRelationshipPairT)

    return diff(o, t)
  }

  itemRowBackground(item: any) {
    if(this.$store.getters.isEditMode) {
      const matched=  this.comparisonPairs.find(m => m.name === item.name)!

      if(item.deleted_at) {
        return 'deleted-item'
      }

      if(!matched) {
        return 'created-item'
      }

      if(this.comparePairs(matched, item)) {
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