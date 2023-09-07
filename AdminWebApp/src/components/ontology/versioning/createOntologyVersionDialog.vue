<template>
  <v-dialog max-width="500px" v-model="dialog" @click:outside="clearNew">
    <template v-slot:activator="{ on }">
      <v-icon
          v-show="icon"
          class="mr-2"
          v-on="on"
          style="color:white !important"
      >mdi-plus-circle</v-icon>
      <v-btn v-show="!icon" color="warning" dark class="mb-2" v-on="on">{{ $t("ontology.newChangelist") }}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{ $t("ontology.newChangelist") }}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                lazy-validation
            >
              <v-text-field
                  v-model="name"
                  :label="$t('general.name')"
                  required
              ></v-text-field>
              <v-textarea
                  v-model="description"
                  :label="$t('general.description')"
                  required
              >
              </v-textarea>


            </v-form>
            <p><b>Note:</b> {{$t('warnings.changelist')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearNew">{{ $t("general.cancel") }}</v-btn>
        <v-btn color="primary" text @click="createVersion"><span v-if="!loading">{{ $t("general.save") }}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class CreateOntologyVersionDialog extends Vue {
  errorMessage = ""
  loading = false
  dialog = false
  name = null
  description = null

  @Prop({required: true})
  containerID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  clearNew() {
    this.name = null
    this.description = null
    this.dialog = false
  }

  createVersion() {
    this.loading = true

    this.$client.createOntologyVersion(this.containerID, {
      name: this.name as any,
      description: this.description as any,
      container_id: this.containerID,
    }, this.$store.getters.currentOntologyVersionID)
        .then((version) => {
          this.loading = false
          this.clearNew()
          this.$emit("versionCreated", version)

          this.dialog = false
          this.errorMessage = ""
        })
        .catch(e => {
          this.loading = false
          this.errorMessage = e
        })
  }
}
</script>
