<template>
  <div>
    <div v-for="alert in alerts" :key="alert.id">
      <v-alert :type="alert.type" style="margin: 40px 40px 0px 40px">
        <p>{{alert.message}}</p>
        <div v-if="$auth.Auth('containers','write', containerID)">
          <v-btn v-if="alert.message.includes('Authorize')"
            color="white"
            :class="`${alert.type}--text`"
            @click="authorizeContainer(alert.id)"
          >{{$t('containerAlert.authorize')}}</v-btn>
          <v-btn v-else
            color="white"
            :class="`${alert.type}--text`"
            @click="acknowledgeAlert(alert.id)" 
          >{{$t('containerAlert.acknowledge')}}</v-btn>
        </div>
        
        <p v-else>{{$t('containerAlert.containerAdminAcknowledge')}}</p>
      </v-alert>
    </div>

    <div v-for="version in versions" :key="version.id">
      <v-alert type="warning" style="margin: 40px 40px 0px 40px">
        <p>{{$t('containerAlert.generatingOntology')}} - {{version.name}}</p>
        <v-progress-linear color="white" indeterminate></v-progress-linear>
      </v-alert>
    </div>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {ContainerAlertT, OntologyVersionT} from "@/api/types";
import pWaitFor from "p-wait-for";
import Config from '@/config';

@Component
export default class ContainerAlertBanner extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  alerts: ContainerAlertT[] = []
  versions: OntologyVersionT[] = []

  mounted() {
    this.loadAlerts()
    pWaitFor(() => this.pendingOntologyVersions(), {
      interval: 5000
    })
        .then(() => {
          this.loadAlerts()
        })
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

  authorizeContainer(alert_id: string) {
    window.open(`${Config.p6RedirectAddress}/redirect/${this.containerID}`, "_blank");
    this.acknowledgeAlert(alert_id);
  }

  // returns true if there are generating ontologies
  async pendingOntologyVersions(): Promise<boolean> {
    try{
      const versions = await this.$client.listOntologyVersions(this.containerID, {status: "generating"})
      this.versions = versions
      return Promise.resolve(versions.length <= 0)
    } catch(e) {
      this.versions = []
      return Promise.resolve(false)
    }
  }
}
</script>
