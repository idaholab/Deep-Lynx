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
      <v-btn v-if="!displayIcon" color="error" dark class="mt-2" v-on="on" @click="startCountdown()">{{$t("deleteServiceUser.deleteServiceUser")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('deleteServiceUser.deleteTitle')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
              <v-alert type="error">
                {{$t('deleteServiceUser.warning')}}
              </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="reset()">{{$t("deleteServiceUser.cancel")}}</v-btn>
        <v-btn color="red darken-1" text :disabled="countDown > 0" @click="deleteServiceUser()">
          <span>{{$t("deleteServiceUser.delete")}}</span>
          <span v-if="countDown > 0">{{$t('deleteServiceUser.in')}} {{countDown}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class DeleteServiceUserDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: true})
  serviceUserID!: string

  @Prop({required: false, default: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  deleteLoading = false
  timerRunning = false
  countDown = 5

  get displayIcon() {
    return this.icon
  }

  startCountdown() {
    this.countDown = 5

    if(!this.timerRunning) this.countdown()
  }

  countdown() {
    if(this.countDown > 0) {
      setTimeout(() => {
        this.countDown -= 1
        this.timerRunning = true
        this.countdown()
      }, 1000)
    } else {
      this.timerRunning = false
    }
  }

  deleteServiceUser() {
    this.deleteLoading = true
    this.$client.deleteServiceUser(this.containerID, this.serviceUserID)
        .then(() => {
          this.deleteLoading = false
          this.dialog = false
          this.$emit('serviceUserDeleted')
        })
        .catch(e => this.errorMessage = e)
  }

  reset() {
    this.dialog = false
    this.timerRunning = false
  }
}
</script>
