<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          small
          class="mr-2"
          v-on="on"
      >mdi-delete</v-icon>
      <v-btn v-if="displayIcon ==='none'" color="primary" dark class="mt-2" v-on="on">{{$t("files.deleteSet")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('files.delete')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <div>
              <v-alert type="warning">
                {{$t('modelExplorer.fileDeleteWarn')}}
              </v-alert>

            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn color="error" text @click="deleteFileSet()">
          <v-progress-circular v-if="deleteLoading" indeterminate></v-progress-circular>
          <span v-if="!deleteLoading">{{$t("general.delete")}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>

  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class DeleteFileSetDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: true})
  file!: any

  @Prop({required: false, default: "none"})
  readonly icon!: "trash" | "none"

  errorMessage = ""
  dialog = false
  deleteLoading = false


  get displayIcon() {
    return this.icon
  }

  deleteFileSet() {
    this.deleteLoading = true

    this.$client.deleteWebGLFile(
        this.containerID,
        this.file!.file_id!)
        .then(() => {
          this.reset()
          this.$emit('fileDeleted')
        })
        .catch(e => this.errorMessage = e)
        .finally(() => this.deleteLoading = false)
  }

  reset() {
    this.dialog = false
  }
}
</script>