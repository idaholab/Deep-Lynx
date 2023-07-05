<template>
  <v-dialog v-model="dialog" @click:outside="errorMessage = ''; dialog = false" max-width="70%">
    <template v-slot:activator="{on}">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
      >mdi-list-status</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("events.statusTitle")}}</v-btn>
    </template>
    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('events.statusTitle')}}</span>
      </v-card-title>

      <v-data-table
        :headers="headers()"
        :items="eventActionStatus"
        :loading="eventsLoading"
        class="elevation-1"
      >
        <template v-slot:[`item.event`]="{ item }">
          <span>{{JSON.stringify(item.event)}}</span>
        </template>
      </v-data-table>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { EventActionStatusT } from '@/api/types';

@Component
export default class EventActionStatusDialog extends Vue {
  @Prop({required: false, default: true})
  readonly icon!: boolean

  @Prop({required: true})
  readonly actionID!: string;

  errorMessage = ""
  dialog = false
  eventsLoading = false
  eventActionStatus: EventActionStatusT[] = []

  headers() {
    return [
        { text: this.$t('general.id'), value: 'id'},
        { text: this.$t('events.actionID'), value: 'event_action_id' },
        { text: this.$t('general.status'), value: 'status'},
        { text: this.$t('general.statusMessage'), value: 'status_message'},
        { text: this.$t('general.dateCreated'), value: 'created_at'},
        { text: this.$t('events.event'), value: 'event'},
      ]
  }

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(this.dialog) {
      this.refreshEventActionStatus()
    }
  }

  refreshEventActionStatus() {
      this.eventsLoading = true
      this.$client.listEventActionStatusForEventAction(this.actionID)
          .then(eventActionStatus => {
            this.eventActionStatus = eventActionStatus
          })
          .catch(e => this.errorMessage = e)
          .finally(() => this.eventsLoading = false)
    }
}
</script>