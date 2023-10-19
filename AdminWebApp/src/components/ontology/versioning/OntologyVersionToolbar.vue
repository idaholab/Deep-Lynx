<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <error-banner v-if="!$store.getters.selectedChangelistID && $store.state.inEditMode" :message="$t('help.selectChangelist')" @closeAlert="errorMessage = ''"></error-banner>
    <v-toolbar
      :color="backgroundColor"
      style="border-top-left-radius: 5px; border-top-right-radius: 5px;"
    >

      <div class="d-flex flex-row white--text">
        <div
          class="pr-3 mr-3"
          style="border-right: 1px solid white"
        >
          {{$t('ontology.mode')}} - <small>{{$t('general.beta')}}</small>
        </div>
        <div class="d-flex flex-row align-center">
          <span class="mr-2">
            {{$t('general.view')}}
          </span>

          <v-switch
            hide-details
            class="d-flex justify-center"
            v-model="isEditMode"
            :disabled="(!isCurrent || !$auth.Auth('ontology', 'write', containerID)) && !$store.getters.isEditMode"
            color="warning"
          ></v-switch>
          <span class="ml-2 mr-8">
            {{$t('general.edit')}}
          </span>
        </div>
      </div>

      <v-select
          dark
          v-show="$store.state.inEditMode"
          :items="changelists"
          v-model="selectedChangelist"
          item-value="id"
          item-text="name"
          :item-disabled="isGenerating"
          hide-details
          return-object
          :label="$t('ontology.activeChangelist')">

        <template v-slot:item="{item}">
          {{item.name}} <span v-if="item.status === 'generating'">- {{item.status}}</span>
        </template>
      </v-select>
      <CreateOntologyVersionDialog
          v-if="$store.state.inEditMode"
          @versionCreated="refresh()"
          :icon="true"
          :containerID="containerID">
      </CreateOntologyVersionDialog>
      <v-spacer></v-spacer>
      <v-spacer></v-spacer>
      <v-select
          v-if="versions.length > 0"
          dark
          :items="versions"
          :disabled="$store.state.inEditMode"
          v-model="selectedVersion"
          item-value="id"
          item-text="name"
          hide-details
          return-object
        :label="$t('ontology.version')">
        <template v-slot:item="{item}">
          {{item.name}}
          <div v-show="item.id === versions[0].id">-{{$t('general.current')}}</div>
        </template>
        <template v-slot:selection="{item}">
          {{item.name}}
          <div v-show="item.id === versions[0].id">-{{$t('general.current')}}</div>
        </template>
      </v-select>

    </v-toolbar>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {ChangelistT, OntologyVersionT} from "@/api/types";
  import CreateOntologyVersionDialog from "@/components/ontology/versioning/CreateOntologyVersionDialog.vue";

  interface OntologyVersionToolbarModel {
    versions: OntologyVersionT[]
    changelists: OntologyVersionT[]
    errorMessage: string
  }

  export default Vue.extend ({
    name: 'OntologyVersionToolbar',

    components: { CreateOntologyVersionDialog },

    props: {
      containerID: {type: String, required: true},
    },

    computed: {
      selectedVersion: {
        get() {
          if (this.$store.state.selectedOntologyVersion) {
            return this.$store.state.selectedOntologyVersion.id;
          }
          return "";
        },
        set(version: string) {
          this.$store.commit('selectOntologyVersion', version);
          this.$emit('selected', version);
        }
      },
      selectedChangelist: {
        get() {
          if (this.$store.state.selectedChangelist) {
            return this.$store.state.selectedChangelist.id;
          }
          return "";
        },
        set(version: string) {
          this.$store.commit('selectChangelist', version);
          this.$emit('selectedVersion', version);
        }
      },
      backgroundColor(): string {
        if(this.$store.state.inEditMode) return "warning"
        return "primary"
      },
      isEditMode: {
        get() {
          return this.$store.state.inEditMode;
        },
        set(mode: any) {
          this.$store.dispatch('refreshCurrentOntologyVersions')
            .then(() => {
              this.$store.dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
                .then(() => {
                  this.$store.commit('setEditMode', mode);
                  this.$emit('editModeToggle');
                })
                .catch(e => this.errorMessage = e);
            })
            .catch(e => this.errorMessage = e);
        }
      },
      isCurrent(): boolean{
        if(this.versions.length <= 0) {
          return true
        } else {
          return this.selectedVersion === this.versions[0]?.id
        }
      }
    },

    data: (): OntologyVersionToolbarModel => ({
      versions: [],
      changelists: [],
      errorMessage: ""
    }),

    beforeMount() {
      this.$store.dispatch('refreshCurrentOntologyVersions')
          .then(() => this.versions = this.$store.state.publishedOntologyVersions)
          .catch(e => this.errorMessage = e)
      this.$store.dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
          .then(() => this.changelists = this.$store.state.ownedCurrentChangelists)
          .catch(e => this.errorMessage = e)
    },

    methods: {
      refresh() {
        this.$store.dispatch('refreshCurrentOntologyVersions')
            .then(() => this.versions = this.$store.state.publishedOntologyVersions)
            .catch(e => this.errorMessage = e)
        this.$store.dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
            .then(() => this.changelists = this.$store.state.ownedCurrentChangelists)
            .catch(e => this.errorMessage = e)
      },
      isGenerating(changelist: ChangelistT) {
        return changelist.status === 'generating'
      },
    }
  });
</script>
