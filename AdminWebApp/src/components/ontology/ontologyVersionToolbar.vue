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
          v-show="$store.getters.isEditMode && changelists.length > 0 || $store.getters.isEditMode && $store.getters.activeChangelist"
          :items="changelists"
          v-model="selectedChangelist"
          item-value="id"
          item-text="name"
          hide-details
          return-object
          :label="$t('ontologyToolbar.activeChangelist')">
      </v-select>
      <create-changelist-dialog
          v-if="$store.getters.isEditMode"
          @changelistCreated="listChangelists"
          :icon="changelists.length > 0"
          :containerID="containerID">
      </create-changelist-dialog>
      <v-spacer></v-spacer>
      <v-spacer></v-spacer>
      <v-select
          dark
          :items="versions"
          :disabled="$store.getters.isEditMode"
          v-model="selectedVersion"
          item-value="id"
          item-text="name"
          @input="select"
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
import {ChangelistT, OntologyVersionT} from "@/api/types";
import CreateChangelistDialog from "@/components/ontology/createChangelistDialog.vue";

@Component({components: {CreateChangelistDialog}})
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

  set selectedVersion(value: string) {
    return
  }

  get selectedChangelist() {
    if(this.$store.getters.activeChangelist) {
      return this. $store.getters.activeChangelist
    }
    return ""
  }

  set selectedChangelist(changelist: any) {
    this.$store.dispatch('changeActiveChangelist', changelist)
    this.$emit('selectedChangelist', changelist)
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
    return
  }

  versions: OntologyVersionT[] = [{
    id: "",
    container_id: this.containerID,
    name: "Primary"
  }]

  changelists: ChangelistT[] = []

  mounted() {
    this.$client.listOntologyVersions(this.containerID)
    .then((results) => {
        if(results.length > 0) {
          this.versions = results

          if(!this.$store.getters.selectedOntologyVersionID) {
            this.$store.dispatch('changeOntologyVersion', results[0])
          }
        }
    })
    .catch((e: any) =>  this.errorMessage = e)

    this.listChangelists()
  }

  listChangelists() {
    this.changelists = []
    this.$client.listChangelists(this.containerID, {status: "pending"})
        .then((results) => {
          if(results.length > 0) {
            this.changelists = results

            if(!this.$store.getters.activeChangelist) {
              this.$store.dispatch('changeActiveChangelist', results[0])
            }
          }
        })
        .catch((e: any) =>  this.errorMessage = e)
  }

  select(version: OntologyVersionT) {
    this.$store.dispatch('changeOntologyVersion', version)
    this.$emit('selected', version)
  }
}
</script>