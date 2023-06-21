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
      <v-btn v-if="!icon" color="error" dark class="mt-2" v-on="on" @click="startCountdown()">{{$t("serviceUsers.delete")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('serviceUsers.delete')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
              <v-alert type="error">
                {{$t('warnings.deleteServiceUser')}}
              </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn color="error" text :disabled="countDown > 0" @click="deleteServiceUser()">
          <span>{{$t("general.remove")}}</span>
          <span v-if="countDown > 0">{{$t('operators.in')}} {{countDown}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'

  interface DeleteServiceUserDialogModel {
    errorMessage: string
    dialog: boolean
    deleteLoading: boolean
    timerRunning: boolean
    countDown: number
  }

  export default Vue.extend({
    name: 'DeleteServiceUserDialog',

    props: {
      containerID: {
        type: String,
        required: true
      },
      serviceUserID: {
        type: String,
        required: true
      },
      icon: {
        type: Boolean,
        required: false,
        default: false
      }
    },

    data: (): DeleteServiceUserDialogModel => ({
      errorMessage: "",
      dialog: false,
      deleteLoading: false,
      timerRunning: false,
      countDown: 5
    }),

    methods: {
      startCountdown() {
        this.countDown = 5;

        if (!this.timerRunning) {
          this.countdown();
        }
      },

      countdown() {
        if (this.countDown > 0) {
          setTimeout(() => {
            this.countDown -= 1
            this.timerRunning = true
            this.countdown()
          }, 1000)
        } else {
          this.timerRunning = false
        }
      },

      deleteServiceUser() {
        this.deleteLoading = true
        this.$client.deleteServiceUser(this.containerID, this.serviceUserID)
          .then(() => {
            this.deleteLoading = false
            this.dialog = false
            this.$emit('serviceUserDeleted')
          })
          .catch(e => this.errorMessage = e)
      },

      reset() {
        this.dialog = false
        this.timerRunning = false
      }
    }
  });
</script>
