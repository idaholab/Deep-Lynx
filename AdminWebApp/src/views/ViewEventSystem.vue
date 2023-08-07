<template>
    <div>
      <v-data-table
          v-if="activeTab ==='eventactions'"
          :headers="headers()"
          :items="eventActions"
          :loading="eventsLoading"
          sort-by="id"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-toolbar flat color="white">
            <v-toolbar-title>{{$t('events.actionDescription')}}</v-toolbar-title>
            <v-spacer></v-spacer>
            <create-event-action-dialog :containerID="containerID" @eventCreated="refreshEventActions()" :key="key" @dialogClose="key += 1"></create-event-action-dialog>
          </v-toolbar>
        </template>
        <template v-slot:[`item.active`]="{ item }">
          <v-switch
            v-if="!item.archived"
            @change="toggleEventActive(item)"
            v-model="item.active"
            class="mt-0"
            hide-details
          />
          <v-switch
            v-else
            :value="false"
            class="mt-0"
            hide-details
            disabled
          />
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <edit-event-action-dialog
            :containerID="containerID"
            :eventAction="item"
            @eventUpdated="refreshEventActions()"
          ></edit-event-action-dialog>
          <delete-event-action-dialog
            :containerID="containerID"
            :eventAction="item"
            @eventDeleted="refreshEventActions()"
          ></delete-event-action-dialog>
          <send-event-action-dialog
            :containerID="containerID"
            :eventAction="item"
            :actionID="item.id"
          ></send-event-action-dialog>
          <event-action-status-dialog
            :containerID="containerID"
            :eventAction="item"
            :actionID="item.id"
          ></event-action-status-dialog>
        </template>
      </v-data-table>
    </div>
  </template>

<script lang="ts">
  import Vue from 'vue';
  import CreateEventActionDialog from '@/components/eventSystem/createEventActionDialog.vue';
  import EditEventActionDialog from '@/components/eventSystem/editEventActionDialog.vue';
  import DeleteEventActionDialog from '@/components/eventSystem/deleteEventActionDialog.vue';
  import SendEventActionDialog from '@/components/eventSystem/sendEventActionDialog.vue';
  import EventActionStatusDialog from '@/components/eventSystem/eventActionStatusDialog.vue';
  import { EventActionT } from '../api/types';

  interface EventSystemModel {
    key: number,
    dialog: boolean,
    eventsLoading: boolean,
    errorMessage: string,
    activeTab: string,
    eventActions: EventActionT[]
  }

  export default Vue.extend ({
    name: 'ViewEventSystem',

    components: { CreateEventActionDialog, EditEventActionDialog, DeleteEventActionDialog, SendEventActionDialog, EventActionStatusDialog },

    props: {
      containerID: {type: String, required: true},
    },

    data: (): EventSystemModel => ({
      key: 0,
      dialog: false,
      eventsLoading: false,
      errorMessage: "",
      activeTab: 'eventactions',
      eventActions: []
    }),

    methods: {
      headers() {
        return [
          { text: this.$t('general.id'), value: 'id'},
          { text: this.$t('events.eventType'), value: 'event_type'},
          { text: this.$t('events.actionType'), value: 'action_type'},
          { text: this.$t('edges.destination'), value: 'destination'},
          { text: this.$t('general.active'), value: 'active'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      refreshEventActions() {
        this.eventsLoading = true
        this.$client.listEventActions(true, this.containerID)
            .then(eventActions => {
              this.eventActions = eventActions
            })
            .catch(e => this.errorMessage = e)
            .finally(() => this.eventsLoading = false)
      },
      toggleEventActive(eventAction: EventActionT) {
        if(eventAction.active) {
          this.$client.activateEventAction(eventAction.id!)
              .then(()=> {
                this.refreshEventActions()
              })
              .catch(e => this.errorMessage = e)
        } else {
          this.$client.deactivateEventAction(eventAction.id!)
              .then(()=> {
                this.refreshEventActions()
              })
              .catch((e: any) => this.errorMessage = e)
        }
      }
    },

    mounted() {
      this.refreshEventActions()
    }
  });
</script>
