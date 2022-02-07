<template>
  <v-dialog v-model="dialog" max-width="500px" @click:outside="clearNew">
    <template v-slot:activator="{ on }">
      <v-icon
          v-show="icon"
          class="mr-2"
          color="white"
          v-on="on"
      >mdi-plus-circle</v-icon>
      <v-btn v-show="!icon" color="orange accent-4" dark class="mb-2" v-on="on">{{ $t("createChangelist.newChangelistButton") }}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{ $t("createChangelist.formTitle") }}</span>
      </v-card-title>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-container>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  lazy-validation
              >
                <v-text-field
                    v-model="name"
                    :label="$t('createChangelist.name')"
                    required
                ></v-text-field>

              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="clearNew">{{ $t("createChangelist.cancel") }}</v-btn>
        <v-btn color="blue darken-1" text @click="createChangelist"><span v-if="!loading">{{ $t("createChangelist.save") }}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class CreateChangelistDialog extends Vue {
  errorMessage = ""
  loading = false
  dialog = false
  name = null

  @Prop({required: true})
  containerID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  clearNew() {
    this.name = null
    this.dialog = false
  }

  createChangelist() {
    this.loading = true

    this.$client.createChangelist(this.containerID, {
      name: this.name as any,
      container_id: this.containerID,
    })
        .then((changeList) => {
          this.loading = false
          this.clearNew()
          this.$emit("changelistCreated", changeList)

          this.$store.dispatch('changeActiveChangelist', changeList)
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