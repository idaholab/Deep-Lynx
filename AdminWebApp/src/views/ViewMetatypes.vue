<template>
  <div>
    <ontology-version-toolbar
        v-if="$store.getters.ontologyVersioningEnabled"
        :containerID="containerID"
        @editModeToggle="countMetatypes(); loadMetatypes()"
        @selectedVersion="countMetatypes(); loadMetatypes()"
        @selected="countMetatypes(); loadMetatypes()">
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
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-alert type="success" v-if="createdMetatype">
          {{$t('classes.createdSuccessfully')}} -
          <span>
            <EditMetatypeDialog :metatype="createdMetatype"></EditMetatypeDialog>
          </span>
        </v-alert>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("classes.description")}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <CreateMetatypeDialog
              v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && $store.state.selectedChangelist) || !$store.getters.ontologyVersioningEnabled"
              :containerID="containerID"
              @metatypeCreated="recentlyCreatedMetatype">
          </CreateMetatypeDialog>
        </v-toolbar>
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('classes.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('classes.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
        <v-row v-if="$store.getters.isEditMode">
          <v-col :cols="2"><div class="box created mr-2"></div><p>{{$t('general.created')}}</p></v-col>
          <v-col :cols="2"><div class="box edited mr-2"></div><p>{{$t('general.edited')}}</p></v-col>
          <v-col :cols="2"><div class="box removed mr-2"></div><p>{{$t('general.removed')}}</p></v-col>
        </v-row>
        <v-row>
          <v-col v-if="$store.getters.isEditMode" :cols="12"><p style="margin-left: 15px"><strong>{{$t('general.note')}}: </strong> {{$t('warnings.className')}}</p></v-col>
        </v-row>
      </template>

      <template v-slot:[`item.parent_name`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <span v-bind="attrs" v-on="on">{{item.parent_name}}</span>
          </template>
          <span>{{item.parent_id}}</span>
        </v-tooltip>
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

      <template v-slot:[`item.actions`]="{ item }">
        <ViewMetatypeDialog
            v-if="!$store.getters.isEditMode && $store.getters.ontologyVersioningEnabled"
            :metatype="item"
            :icon="true">
        </ViewMetatypeDialog>

           <EditMetatypeDialog
               v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && !item.deleted_at && $store.state.selectedChangelist) || !$store.getters.ontologyVersioningEnabled"
               :metatype="item"
               :comparisonMetatype="comparisonMetatypes.find(m => m.name === item.name)"
               :icon="true"
               @metatypeEdited="loadMetatypes()"
           >
           </EditMetatypeDialog>

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
          <span>{{$t('classes.remove')}}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-bind="attrs"
                v-on="on"
                small
                v-if="($store.getters.isEditMode && $store.getters.ontologyVersioningEnabled && item.deleted_at)"
                @click="restoreDeletedMetatype(item)"
            >
              mdi-restore
            </v-icon>
          </template>
          <span>{{$t('classes.restore')}}</span>
        </v-tooltip>

      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {MetatypeT} from '@/api/types';
  import EditMetatypeDialog from "@/components/ontology/metatypes/EditMetatypeDialog.vue";
  import CreateMetatypeDialog from "@/components/ontology/metatypes/CreateMetatypeDialog.vue";
  import {mdiFileDocumentMultiple} from "@mdi/js";
  import OntologyVersionToolbar from "@/components/ontology/versioning/OntologyVersionToolbar.vue";
  import ViewMetatypeDialog from "@/components/ontology/metatypes/ViewMetatypeDialog.vue";
  import debounce from "lodash.debounce";
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const diff = require('deep-diff').diff;

  interface Options {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  }

  interface MetatypesModel {
    copy: typeof mdiFileDocumentMultiple;
    errorMessage: string;
    successMessage: string;
    metatypesLoading: boolean;

    createdMetatype: MetatypeT | null;
    metatypesCount: number;
    name: string;
    description: string;
    metatypes: MetatypeT[];
    comparisonMetatypes: MetatypeT[];
    options: Options;
    debouncedSearchWatch: any;
  }

  export default Vue.extend ({
    name: 'ViewMetatypes',

    components: { EditMetatypeDialog, CreateMetatypeDialog, OntologyVersionToolbar, ViewMetatypeDialog },

    props: {
      containerID: {type: String, required: true},
    },

    data(): MetatypesModel {
      const options: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 100,
      };

      return {
        copy: mdiFileDocumentMultiple,
        errorMessage: '',
        successMessage: '',
        metatypesLoading: false,

        createdMetatype: null,
        metatypesCount: 0,
        name: '',
        description: '',
        metatypes: [],
        comparisonMetatypes: [],
        options,
        debouncedSearchWatch: null,
      };
    },

    watch: {
      options: 'onOptionChange',
      name: 'onNameChange',
      description: 'onDescriptionChange',
    },

    methods: {
      onOptionChange() {
        this.loadMetatypes()
      },
      onNameChange() {
        this.debouncedSearchWatch()
      },
      onDescriptionChange() {
        this.debouncedSearchWatch()
      },
      headers() {
        return  [
          { text: '', value: 'copy' },
          { text: this.$t('general.id'), value: 'id' },
          { text: this.$t('general.name'), value: 'name' },
          { text: this.$t('general.description'), value: 'description'},
          { text: this.$t('general.parent'), value: 'parent_name'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      countMetatypes() {
        this.$client.listMetatypes(this.containerID, {
          ontologyVersion: this.$store.getters.activeOntologyVersionID,
          count: true,
          name: (this.name !== "") ? this.name : undefined,
          description: (this.description !== "") ? this.description : undefined,
        })
            .then(metatypesCount => {
              this.metatypesCount = metatypesCount as number
            })
            .catch(e => this.errorMessage = e)
      },
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
          ontologyVersion: this.$store.getters.activeOntologyVersionID,
          sortBy: sortParam,
          sortDesc: sortDescParam,
          name: (this.name !== "") ? this.name : undefined,
          description: (this.description !== "") ? this.description : undefined,
          loadKeys: true,
          deleted: this.$store.getters.isEditMode
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
                  ontologyVersion: this.$store.getters.currentOntologyVersionID,
                  nameIn,
                  loadKeys: true,
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
      },
      deleteMetatype(item: any) {
        // if we're in edit mode, set permanent false
        this.$client.deleteMetatype(this.containerID, item.id, {permanent: !this.$store.getters.isEditMode})
            .then(() => {
              this.loadMetatypes()
            })
            .catch(e => this.errorMessage = e)
      },
      restoreDeletedMetatype(item: any) {
        // if we're in edit mode, set permanent false
        this.$client.deleteMetatype(this.containerID, item.id, {reverse: true})
            .then(() => {
              this.loadMetatypes()
            })
            .catch(e => this.errorMessage = e)
      },
      recentlyCreatedMetatype(metatype: MetatypeT) {
        this.createdMetatype = metatype
        this.countMetatypes()
        this.loadMetatypes()
      },
      copyID(id: string) {
        navigator.clipboard.writeText(id)
      },
      // compareMetatypes takes two metatypes and returns whether they are identical
      // this is used to indicate when a metatype has been edited as part of the new ontology
      compareMetatypes(original: MetatypeT, target: MetatypeT): boolean {
        if(typeof  original === 'undefined' || typeof target === 'undefined') return true
        // first copy the objects over so that our key deletion does not affect the real object, since we can't compare
        // ids and metadata we need to get rid of those on each object
        const o = structuredClone(original)
        const t = structuredClone(target)

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
            if(p.deleted_at) delete p.deleted_at
            if(p.id) delete p.id
            if(p.metatype_id) delete p.metatype_id
            if(p.ontology_version) delete  p.ontology_version
            if(p.uuid) delete p.uuid
          })

          m.relationships!.map(p => {
            if(p.created_at) delete p.created_at
            if(p.created_by) delete p.created_by
            if(p.modified_at) delete p.modified_at
            if(p.modified_by) delete p.modified_by
            if(p.id) delete p.id
            if(p.origin_metatype_id) delete p.origin_metatype_id
            if(p.destination_metatype_id) delete p.destination_metatype_id
            if(p.relationship_id) delete p.relationship_id
            if(p.old_id) delete p.old_id
            if(p.metatype_id) delete p.metatype_id
            if(p.ontology_version) delete  p.ontology_version
            if(p.origin_metatype) delete  p.origin_metatype
            if(p.destination_metatype) delete  p.destination_metatype
            if(p.relationship) delete  p.relationship
          })

        }

        cleanMetatype(o as MetatypeT)
        cleanMetatype(t as MetatypeT)

        return diff(o, t)
      },
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
    },

    created() {
      this.$store
        .dispatch('refreshCurrentOntologyVersions')
        .then(() => {
          this.$store
            .dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
            .then(() => {
              this.countMetatypes();
              this.loadMetatypes();
            })
            .catch((e) => (this.errorMessage = e));
        })
        .catch((e) => (this.errorMessage = e));

      this.debouncedSearchWatch = debounce(() => {
        this.countMetatypes();
        this.loadMetatypes();
      }, 500);
    },

    beforeDestroy() {
      this.debouncedSearchWatch.cancel();
    },

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