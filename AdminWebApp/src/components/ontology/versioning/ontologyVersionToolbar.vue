<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <error-banner v-if="!$store.getters.selectedChangelistID && $store.state.inEditMode" :message="$t('help.selectChangelist')"></error-banner>
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
      <create-ontology-version-dialog
          v-if="$store.state.inEditMode"
          @versionCreated="refresh()"
          :icon="true"
          :containerID="containerID">
      </create-ontology-version-dialog>
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
import {Component, Prop, Vue} from "vue-property-decorator";
import {ChangelistT, OntologyVersionT} from "@/api/types";
import CreateOntologyVersionDialog from "@/components/ontology/versioning/createOntologyVersionDialog.vue";

@Component({components: {CreateOntologyVersionDialog}})
export default class OntologyVersionToolbar extends Vue {
  @Prop({required: true})
  containerID!: string;

  errorMessage = ""

  beforeCreate() {
    this.$store.dispatch('refreshCurrentOntologyVersions')
        .then(() => this.versions = this.$store.state.publishedOntologyVersions)
        .catch(e => this.errorMessage = e)
    this.$store.dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
        .then(() => this.changelists = this.$store.state.ownedCurrentChangelists)
        .catch(e => this.errorMessage = e)
  }

  refresh() {
    this.$store.dispatch('refreshCurrentOntologyVersions')
        .then(() => this.versions = this.$store.state.publishedOntologyVersions)
        .catch(e => this.errorMessage = e)
    this.$store.dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
        .then(() => this.changelists = this.$store.state.ownedCurrentChangelists)
        .catch(e => this.errorMessage = e)
  }

  isGenerating(changelist: ChangelistT) {
    return changelist.status === 'generating'
  }

  get selectedVersion() {
    if(this.$store.state.selectedOntologyVersion) {
      return this.$store.state.selectedOntologyVersion.id
    }
    return ""
  }

  set selectedVersion(version: string) {
    this.$store.commit('selectOntologyVersion', version)
    this.$emit('selected', version)

    return
  }

  get selectedChangelist() {
    if(this.$store.state.selectedChangelist) {
      return this. $store.state.selectedChangelist.id
    }
    return ""
  }

  set selectedChangelist(version: any) {
    this.$store.commit('selectChangelist', version)
    this.$emit('selectedVersion', version)
    return
  }

  get backgroundColor() {
    if(this.$store.state.inEditMode) return "warning"
    return "primary"
  }

  get isEditMode() {
    return this.$store.state.inEditMode
  }

  set isEditMode(mode: any) {
    this.$store.dispatch('refreshCurrentOntologyVersions')
        .then(() => {
          this.$store.dispatch('refreshOwnedCurrentChangelists', this.$auth.CurrentUser()?.id)
              .then(() => {
                this.$store.commit('setEditMode', mode)
                this.$emit('editModeToggle')
              })
              .catch(e => this.errorMessage = e)
        })
        .catch(e => this.errorMessage = e)

    return
  }

  get isCurrent(){
    if(this.versions.length <= 0) {
      return true
    } else {
      return this.selectedVersion === this.versions[0]?.id
    }
  }

  versions: OntologyVersionT[] = this.$store.state.publishedOntologyVersions
  changelists: OntologyVersionT[] = this.$store.state.ownedCurrentChangelists
}
</script>
