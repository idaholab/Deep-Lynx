<template>
  <div>
    <v-toolbar
        elevation="4"
        :color="backgroundColor"
    >
      <p style="color: white">View Mode
      </p>

      <v-switch
          @change="toggleEditMode"
          style="margin-left: 5px; margin-top: 5px"
          :disabled="!isCurrent"
          color="orange darken-4"></v-switch>
      <p style="color: white">Edit Mode
      </p>

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
          label="Ontology Version">
        <template v-slot:item="{item}">
          {{item.name}}
          <div v-if="item.id === versions[0].id">-current</div>
        </template>
        <template v-slot:selection="{item}">
          {{item.name}}
          <div v-if="item.id === versions[0].id">-current</div>
        </template>
      </v-select>

    </v-toolbar>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";
import {OntologyVersionT} from "@/api/types";

@Component
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

  get backgroundColor() {
    if(this.$store.getters.isEditMode) return "warning"
    return "primary"
  }

  get isCurrent() {
    return this.selectedVersion === this.versions[0].id
  }

  versions: OntologyVersionT[] = [{
    id: "",
    container_id: this.containerID,
    name: "Primary"
  }]

  mounted() {
    this.$client.listOntologyVersions(this.containerID)
    .then((results) => {
        if(results.length > 0) {
          this.versions = results
        }
    })
    .catch((e: any) =>  this.errorMessage = e)
  }

  select(version: OntologyVersionT) {
    this.$store.dispatch('changeOntologyVersion', version)
    this.$emit('selected', version)
  }

  toggleEditMode(mode: any) {
    this.$store.commit('setEditMode', mode)
  }
}
</script>