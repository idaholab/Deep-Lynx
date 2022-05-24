<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('home.settingsDescription')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('settings.explanation')}}</p>
            <v-form v-if="container">
              <v-text-field
                  v-model="container.name"
                  :label="$t('containers.name')"
                  required
                  disabled
                  class="disabled"
              ></v-text-field>
              <v-textarea
                  :rows="2"
                  v-model="container.description"
                  :label="$t('containers.description')"
                  required
              ></v-textarea>

              <v-checkbox v-model="container.config.ontology_versioning_enabled">
                <template v-slot:label>
                  {{$t('containers.ontologyVersioningEnabled')}}
                </template>

                <template slot="prepend"><info-tooltip :message="$t('containers.ontologyVersioningHelp')"></info-tooltip> </template>
              </v-checkbox>
            </v-form>
            <h1 v-else>{{$t('containers.noneSelected')}}</h1>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <delete-container-dialog :containerID="container.id"></delete-container-dialog>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="updateContainer" ><span v-if="!loading">{{$t("home.save")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import {ContainerT} from "@/api/types";
import DeleteContainerDialog from "@/components/ontology/containers/deleteContainerDialog.vue";

@Component({components: {DeleteContainerDialog}})
export default class Settings extends Vue {
  container: ContainerT | undefined = undefined
  errorMessage = ""
  loading = false

  beforeMount() {
    this.container = this.$store.getters.activeContainer
  }

  updateContainer() {
    this.$client.updateContainer(this.container)
        .then((container) => {
          this.$store.commit('setEditMode', false)
          this.$store.commit('setActiveContainer', container)
        })
        .catch(e => {
          this.errorMessage = e
        })
        .finally(() => this.loading = false)
  }
}
</script>
