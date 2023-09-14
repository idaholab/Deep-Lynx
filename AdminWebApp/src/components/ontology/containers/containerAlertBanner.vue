<template>
  <div>
    <div v-for="alert in alerts" :key="alert.id">
      <v-alert :type="alert.type" style="margin: 40px 40px 0px 40px">
        <p>{{alert.message}}</p>
        <div v-if="$auth.Auth('containers','write', containerID)">
          <v-btn
            color="white"
            :class="`${alert.type}--text`"
            @click="acknowledgeAlert(alert.id)" 
          >{{$t('containers.acknowledgeAlert')}}</v-btn>
        </div>
        
        <p v-else>{{$t('containers.adminAlert')}}</p>
      </v-alert>
    </div>

    <div v-for="version in versions" :key="version.id">
      <v-alert type="warning" style="margin: 40px 40px 0px 40px">
        <p>{{$t('ontology.generating')}} - {{version.name}}</p>
        <v-progress-linear color="white" indeterminate></v-progress-linear>
      </v-alert>
    </div>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {ContainerAlertT, OntologyVersionT} from "@/api/types";
import pWaitFor from "p-wait-for";

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
