<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="clearNewFileSet()">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("files.update")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("files.update")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
                lazy-validation
            >

              <v-file-input
                  show-size
                  truncate-length="50"
                  :label="$t('files.new')"
                  @change="changeFile"
                  v-model="fileToUpload"
                  :rules="[validateFileInput]"
              ></v-file-input>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearNewFileSet" >{{$t("general.cancel")}}</v-btn>
        <v-btn
            color="primary"
            text
            @click="updateFile" >
          {{$t("general.save")}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'

  interface EditFileSetDialogModel {
    fileToUpload: File | null;
    errorMessage: string;
    dialog: boolean;
    valid: boolean;
  }

  interface VForm extends Vue {
    validate: () => boolean;
  }

  export default Vue.extend ({
    name: 'EditFileSetDialog',

    props: {
      containerID: {
        required: true,
        type: String
      },
      file: {
        required: true,
        type: Object,
      },
      icon: {
        required: false,
        default: "none",
        type: String,
        validator: (value: string) => ["trash", "none"].includes(value)
      }
    },

    data: (): EditFileSetDialogModel => ({
      fileToUpload: null,
      errorMessage: "",
      dialog: false,
      valid: true
    }),

    methods: {
      changeFile(file: File) {
        this.fileToUpload = file;
      },
      updateFile() {
        const form = this.$refs.form as VForm;
        if(!form.validate()) return;

        this.$client.updateWebGLFiles(this.containerID, this.file.file_id!, [this.fileToUpload!])
            .then(() => {
              this.$emit('fileUpdated');
              this.clearNewFileSet();
            })
            .catch(e => this.errorMessage = e)

      },
      clearNewFileSet() {
        this.fileToUpload = null;
        this.dialog = false;
      },
      validateFileInput(v: File[] | null): boolean | string {
        return v ? v.length > 0 || this.$t('validation.required') : '';
      },
    }
  });
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>