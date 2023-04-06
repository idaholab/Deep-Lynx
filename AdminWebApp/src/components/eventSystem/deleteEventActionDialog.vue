<template>
  <v-dialog v-model="dialog" @click:outside="reset()" max-width="70%">
    <template v-slot:activator="{on}">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
      >mdi-delete</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("deleteEventAction.deleteEvent")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('deleteEventAction.formTitle')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">
              {{$t('deleteEventAction.deleteWarning')}}
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="reset()" >{{$t("home.cancel")}}</v-btn>
        <v-btn color="red darken-1" text @click="deleteEventAction()" >{{$t("home.delete")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EventActionT } from '../../api/types';

@Component
export default class DeleteEventActionDialog extends Vue {
  @Prop({required: true})
  eventAction!: EventActionT

  @Prop({required: false, default: true})
  readonly icon!: boolean
  
  errorMessage = ""
  dialog = false
  deleteLoading = false
  importsLoading = true

  get displayIcon() {
    return this.icon
  }

  deleteEventAction() {
    this.deleteLoading = true
    this.$client.deleteEventAction(this.eventAction!.id!)
        .then(() => {
          this.reset()
          this.$emit('eventDeleted')
        })
        .catch(e => this.errorMessage = e)
  }

  reset() {
    this.dialog = false
    this.errorMessage = ""
    this.deleteLoading = false
  }
}
</script>