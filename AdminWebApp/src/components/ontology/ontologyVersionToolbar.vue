<template>
  <div>
    <v-toolbar
        elevation="4"
        :color="backgroundColor"
    >
      <p style="color: white">{{$t('ontologyToolbar.viewMode')}}
      </p>

      <v-switch
          v-model="isEditMode"
          style="margin-left: 5px; margin-top: 5px"
          :disabled="!isCurrent || !$auth.Auth('ontology', 'write', containerID)"
          color="orange darken-4"></v-switch>
      <p style="color: white; margin-right: 15px">{{$t('ontologyToolbar.editMode')}}
      </p>
      <v-select
          dark
          v-show="$store.getters.isEditMode"
          :items="pendingVersions"
          v-model="selectedPendingVersion"
          item-value="id"
          item-text="name"
          hide-details
          return-object
          :label="$t('ontologyToolbar.activeChangelist')">
      </v-select>
      <create-ontology-version-dialog
          v-if="$store.getters.isEditMode"
          :icon="true"
          :containerID="containerID">
      </create-ontology-version-dialog>
      <v-spacer></v-spacer>
      <v-spacer></v-spacer>
      <v-select
          dark
          :items="versions"
          :disabled="$store.getters.isEditMode"
          v-model="selectedVersion"
          item-value="id"
          item-text="name"
          hide-details
          return-object
        :label="$t('ontologyToolbar.ontologyVersion')">
        <template v-slot:item="{item}">
          {{item.name}}
          <div v-show="item.id === versions[0].id">-{{$t('ontologyToolbar.current')}}</div>
        </template>
        <template v-slot:selection="{item}">
          {{item.name}}
          <div v-show="item.id === versions[0].id">-{{$t('ontologyToolbar.current')}}</div>
        </template>
      </v-select>

    </v-toolbar>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";
import {OntologyVersionT} from "@/api/types";
import CreateOntologyVersionDialog from "@/components/ontology/createOntologyVersionDialog.vue";

@Component({components: {CreateOntologyVersionDialog}})
export default class OntologyVersionToolbar extends Vue {
  @Prop({required: true})
  containerID!: string;

  errorMessage = ""
  get selectedVersion() {
    if(this.$store.getters.selectedOntologyVersionID) {
      return this.$store.getters.selectedOntologyVersionID
    }
    return ""
  }

  set selectedVersion(version: string) {
    this.$store.dispatch('changeOntologyVersion', version)
    this.$emit('selected', version)

    return
  }

  get selectedPendingVersion() {
    if(this.$store.getters.selectedPendingOntologyVersion) {
      return this. $store.getters.selectedPendingOntologyVersion
    }
    return ""
  }

  set selectedPendingVersion(version: any) {
    this.$store.dispatch('changePendingOntologyVersion', version)
    this.$emit('selectedVersion', version)
    return
  }

  get backgroundColor() {
    if(this.$store.getters.isEditMode) return "warning"
    return "primary"
  }

  get isCurrent() {
    return this.selectedVersion === this.versions[0].id
  }

  get isEditMode() {
    return this.$store.getters.isEditMode
  }

  set isEditMode(mode: any) {
    this.$store.commit('setEditMode', mode)
    this.$emit('editModeToggle')
    this.listPendingVersions()
    return
  }

  versions: OntologyVersionT[] = [{
    id: "",
    container_id: this.containerID,
    name: "Primary"
  }]

  pendingVersions: OntologyVersionT[] = []

  mounted() {
    // we want only the published versions for the sidebar's selector
    this.$client.listOntologyVersions(this.containerID, {status: 'published'})
    .then((results) => {
        if(results.length > 0) {
          this.versions = results

          if(!this.$store.getters.selectedOntologyVersionID) {
            this.$store.dispatch('changeOntologyVersion', results[0])
          }
        }
    })
    .catch((e: any) =>  this.errorMessage = e)

    this.listPendingVersions()
  }

  listPendingVersions() {
    this.pendingVersions = []
    this.$client.listOntologyVersions(this.containerID, {status: "ready"})
        .then((results) => {
          if(results.length > 0) {
            this.pendingVersions = results

            if(!this.$store.getters.selectedPendingOntologyVersion) {
              this.$store.dispatch('changePendingOntologyVersion', results[0])
            }
          }
        })
        .catch((e: any) =>  this.errorMessage = e)
  }
}
</script>