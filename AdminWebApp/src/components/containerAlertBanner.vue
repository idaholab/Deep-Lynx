<template>
  <container>
    <div v-for="alert in alerts" :key="alert.id">
      <v-alert type="error">
        <p>{{alert.message}}</p>
        <v-btn color="error" @click="acknowledgeAlert(alert.id)" v-if="$auth.Auth('containers','write', containerID)">{{$t('containerAlert.acknowledge')}}</v-btn>
        <p v-else>{{$t('containerAlert.containerAdminAcknowledge')}}</p>
      </v-alert>
    </div>
  </container>
</template>

<script lang="ts">
   import {Component, Prop, Vue} from 'vue-property-decorator'
   import {ContainerAlertT} from "@/api/types";

    @Component
    export default class ContainerAlertBanner extends Vue {
       @Prop({required: true})
       readonly containerID!: string

      alerts: ContainerAlertT[] = []

      mounted() {
        this.loadAlerts()
      }

      loadAlerts() {
         this.$client.listContainerAlerts(this.containerID)
        .then(alerts => {
          this.alerts = alerts
        })
      }

      acknowledgeAlert(id: string) {
         this.$client.acknowledgeContainerAlert(this.containerID, id)
          .then(() => {
            this.loadAlerts()
          })
      }
    }
</script>
