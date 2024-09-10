<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
          @click="startCountdown()"
      >mdi-delete</v-icon>
      <v-btn v-if="!icon" color="error" dark class="mt-2" v-on="on" @click="startCountdown()">{{$t("containers.delete")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('containers.permanentlyDelete')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
              <v-alert type="error">
                {{$t('warnings.deleteContainer')}}
              </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn color="error" text @click="deleteContainer()">
          <span>{{$t("containers.delete")}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'

  interface DeleteContainerDialogModel {
    errorMessage: string
    dialog: boolean
    transformationsLoading: boolean
    transformationCount: number
    deleteLoading: boolean
  }

  export default Vue.extend({
    name: 'DeleteContainerDialog',

    props: {
      containerID: {type: String, required: true},
      icon: {type: Boolean, required: false, default: false},
    },

    data: (): DeleteContainerDialogModel => ({
      errorMessage: "",
      dialog: false,
      transformationsLoading: true,
      transformationCount: 0,
      deleteLoading: false
    }),

    methods: {
      deleteContainer() {
        this.deleteLoading = true
        this.$client.deleteContainer(this.containerID)
            .then(() => {
              this.$router.push({name: 'ContainerSelect'})
            })
            .catch(e => this.errorMessage = e)
      },
      reset() {
        this.dialog = false
      }
    }
  })
</script>
