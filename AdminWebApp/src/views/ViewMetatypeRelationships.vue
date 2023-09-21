<template>
  <div>
    <OntologyVersionToolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @editModeToggle="countRelationships(); loadMetatypeRelationships()"
        @selectedVersion="countRelationships(); loadMetatypeRelationships()"
        @selected="countRelationships(); loadMetatypeRelationships()">
    </OntologyVersionToolbar>
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
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-alert type="success" v-if="createdRelationship">
          {{$t('relationshipTypes.createdSuccessfully')}} -
          <span>
            <EditMetatypeRelationshipDialog :metatypeRelationship="createdRelationship"></EditMetatypeRelationshipDialog>
          </span>
        </v-alert>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('relationshipTypes.description')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <CreateMetatypeRelationshipDialog
              v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && $store.state.selectedChangelist) || !$store.getters.ontologyVersioningEnabled"
              :containerID="containerID"
              @metatypeRelationshipCreated="recentlyCreatedRelationship">
          </CreateMetatypeRelationshipDialog>
        </v-toolbar>
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('relationshipTypes.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('relationshipTypes.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
        <v-row v-if="$store.getters.isEditMode">
          <v-col :cols="2"><div class="box created mr-2"></div><p>{{$t('general.created')}}</p></v-col>
          <v-col :cols="2"><div class="box edited mr-2"></div><p>{{$t('general.edited')}}</p></v-col>
          <v-col :cols="2"><div class="box removed mr-2"></div><p>{{$t('general.removed')}}</p></v-col>
        </v-row>
        <v-row>
          <v-col v-if="$store.getters.isEditMode" :cols="12"><p style="margin-left: 15px"><strong>{{$t('general.note')}}: </strong> {{$t('warnings.relName')}}</p></v-col>
        </v-row>
      </template>

      <template v-slot:[`item.copy`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
          </template>
          <span>{{$t('general.copyID')}}&nbsp;</span>
          <span>{{item.id}}</span>
        </v-tooltip>
      </template>

      <v-tooltip bottom>

      </v-tooltip>
      <template v-slot:[`item.actions`]="{ item }">
        <ViewMetatypeRelationshipDialog
            v-if="!$store.getters.isEditMode && $store.getters.ontologyVersioningEnabled"
            :metatypeRelationship="item"
            :icon="true">
        </ViewMetatypeRelationshipDialog>

        <EditMetatypeRelationshipDialog
            v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled"
            :metatypeRelationship="item" :icon="true"
            :comparisonMetatypeRelationship="comparisonRelationships.find(m => m.name === item.name)"
            @metatypeRelationshipEdited="loadMetatypeRelationships"
        >
        </EditMetatypeRelationshipDialog>

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
          <span>{{$t('relationshipTypes.remove')}}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                small
                v-on="on"
                @click="restoreDeletedRelationship(item)"
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && item.deleted_at)"
            >
              mdi-restore
            </v-icon>
          </template>
          <span>{{$t('relationshipTypes.restore')}}</span>
        </v-tooltip>


      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {MetatypeRelationshipT} from '@/api/types';
  import EditMetatypeRelationshipDialog from "@/components/ontology/metatypeRelationships/EditMetatypeRelationshipDialog.vue";
  import CreateMetatypeRelationshipDialog from "@/components/ontology/metatypeRelationships/CreateMetatypeRelationshipDialog.vue";
  import {mdiFileDocumentMultiple} from "@mdi/js";
  import OntologyVersionToolbar from "@/components/ontology/versioning/ontologyVersionToolbar.vue";
  import ViewMetatypeRelationshipDialog from "@/components/ontology/metatypeRelationships/ViewMetatypeRelationshipDialog.vue";
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const diff = require('deep-diff').diff;

  interface Options {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  }

  interface MetatypeRelationshipsModel {
    copy: typeof mdiFileDocumentMultiple,
    errorMessage: string,
    successMessage: string,
    loading: boolean,
    createdRelationship: MetatypeRelationshipT | null,
    metatypeRelationshipCount: number,
    name: string,
    description: string,
    metatypeRelationships: MetatypeRelationshipT[],
    comparisonRelationships: MetatypeRelationshipT[]
    options: Options
  }

  export default Vue.extend ({
    name: 'ViewMetatypeRelationships',

    components: { EditMetatypeRelationshipDialog, CreateMetatypeRelationshipDialog, OntologyVersionToolbar, ViewMetatypeRelationshipDialog },

    props: {
      containerID: {type: String, required: true},
    },

    data(): MetatypeRelationshipsModel {
      const options: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 100,
      }

      return {
        copy: mdiFileDocumentMultiple,
        errorMessage: "",
        successMessage: "",
        loading: false,
        createdRelationship: null,
        metatypeRelationshipCount: 0,
        name: "",
        description: "",
        metatypeRelationships: [],
        comparisonRelationships: [],
        options
      }
    },

    watch: {
      options: 'onOptionChange',
      name: 'onNameChange',
      description: 'onDescriptionChange',
    },

    methods: {
      onOptionChange() {
        this.loadMetatypeRelationships()
      },
      onNameChange() {
        this.countRelationships()
        this.loadMetatypeRelationships()
      },
      onDescriptionChange() {
        this.countRelationships()
        this.loadMetatypeRelationships()
      },
      headers() {
        return [
          { text: '', value: 'copy' },
          { text: this.$t('general.id'), value: 'id' },
          { text: this.$t('general.name'), value: 'name' },
          { text: this.$t('general.description'), value: 'description'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      countRelationships() {
        this.$client.listMetatypeRelationships(this.containerID, {
          count: true,
          ontologyVersion: this.$store.getters.activeOntologyVersionID,
          name: (this.name !== "") ? this.name : undefined,
          description: (this.description !== "") ? this.description : undefined,
        })
            .then(relationshipCount => {
              this.metatypeRelationshipCount = relationshipCount as number
            })
            .catch(e => this.errorMessage = e)
      },
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
          ontologyVersion: this.$store.getters.activeOntologyVersionID,
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
                  ontologyVersion: this.$store.getters.currentOntologyVersionID,
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
      },
      deleteRelationship(item: any) {
        this.$client.deleteMetatypeRelationship(this.containerID, item.id, {permanent: !this.$store.getters.isEditMode})
            .then(() => {
              this.loadMetatypeRelationships()
            })
            .catch(e => this.errorMessage = e)
      },
      restoreDeletedRelationship(item: any) {
        this.$client.deleteMetatypeRelationship(this.containerID, item.id, {reverse: true})
            .then(() => {
              this.loadMetatypeRelationships()
            })
            .catch(e => this.errorMessage = e)
      },
      recentlyCreatedRelationship(relationship: MetatypeRelationshipT) {
        this.createdRelationship = relationship
        this.countRelationships()
        this.loadMetatypeRelationships()
      },
      // compareRelationships takes two relationships and returns whether they are identical
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
      },
      copyID(id: string) {
        navigator.clipboard.writeText(id)
      },
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
    },

    created() {
      this.$store
        .dispatch('refreshCurrentOntologyVersions')
        .then(() => {
          this.$store
            .dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
            .then(() => {
              this.countRelationships();
              this.loadMetatypeRelationships();
            })
            .catch((e) => (this.errorMessage = e));
        })
        .catch((e) => (this.errorMessage = e));
    },

    mounted() {
      this.countRelationships()
    }
  });
</script>

<style lang="scss">
.edited-item {
  background: $warning;
  color: white;

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

.created-item {
  background: $success;
  color: white;

  &:hover {
    background: lighten($success, 5%) !important;
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
  background: $error;
  color: white;

  &:hover {
    background: lighten($error, 5%) !important;
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
  background-color: $success;
}

.edited {
  background-color: $warning;
}

.removed {
  background-color: $error;
}
</style>