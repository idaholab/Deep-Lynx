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
      <v-btn v-if="!displayIcon" color="error" dark class="mt-2" v-on="on" @click="startCountdown()">{{$t("deleteContainer.deleteContainer")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('deleteContainer.deleteTitle')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
              <v-alert type="error">
                {{$t('deleteContainer.warning')}}
              </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("deleteContainer.cancel")}}</v-btn>
        <v-btn color="error" text :disabled="countDown > 0" @click="deleteContainer()">
          <span>{{$t("deleteContainer.delete")}}</span>
          <span v-if="countDown > 0">{{$t('deleteContainer.in')}} {{countDown}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class DeleteContainerDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: false, default: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  transformationsLoading = true
  transformationCount = 0
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

  deleteContainer() {
    this.deleteLoading = true
    this.$client.deleteContainer(this.containerID)
        .then(() => {
          this.$router.push({name: 'ContainerSelect'})
        })
        .catch(e => this.errorMessage = e)
  }

  reset() {
    this.dialog = false
    this.timerRunning = false
  }
}
</script>
