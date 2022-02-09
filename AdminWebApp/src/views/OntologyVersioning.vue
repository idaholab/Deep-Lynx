<template>
  <div>
    <v-card>
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-tabs grow>
        <v-tab @click="activeTab = 'ontologyVersions'; listOntologyVersions()">
          {{ $t('ontologyVersioning.ontologyVersions') }}
        </v-tab>
        <v-tab @click="activeTab = 'changelists'; listChangelists()">{{ $t('ontologyVersioning.changelists') }}</v-tab>
      </v-tabs>
      <v-card v-if="activeTab ==='ontologyVersions'">
        <v-data-table
            :headers="versionHeaders()"
            :items="ontologyVersions"
            :items-per-page="25"
            class="elevation-1"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >
          <template v-slot:[`item.name`]="{item, index}" >
            {{item.name}} <span v-if="index === 0">-current</span>
          </template>


          <template v-slot:[`item.actions`]="{item, index}" >
            <v-tooltip bottom v-if="index > 0">
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="rollbackOntology(item)"
                    v-bind="attrs" v-on="on"
                    small
                    class="mr-2">
                  mdi-backup-restore
                </v-icon>
              </template>
              <span>{{$t('ontologyVersioning.rollbackOntology')}}</span>
            </v-tooltip>
          </template>

        </v-data-table>
      </v-card>
      <v-card v-if="activeTab ==='changelists'">
        <v-data-table
            :headers="changelistHeaders()"
            :items="changelists"
            :items-per-page="25"
            class="elevation-1"
            :footer-props="{
                'items-per-page-options': [25,50,100]
            }"
        >
         <template v-slot:[`item.status`]="{item}">
           <v-chip :color="chipColor(item.status)" :style="textColor(item.status)">
             {{item.status}}
           </v-chip>
         </template>

          <template v-slot:[`item.actions`]="{item}">
            <v-tooltip bottom>
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="applyChangelist(item)"
                    v-bind="attrs" v-on="on"
                    v-if="item.status === 'approved'"
                    small
                    class="mr-2">
                  mdi-swap-horizontal
                </v-icon>
              </template>
              <span>{{$t('ontologyVersioning.applyChangelist')}}</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="sendChangelistForApproval(item)"
                    v-bind="attrs" v-on="on"
                    v-if="item.status === 'pending' || item.status === 'rejected'"
                    small
                    class="mr-2">
                  mdi-send
                </v-icon>
              </template>
              <span>{{$t('ontologyVersioning.sendApproval')}}</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="approveChangelist(item)"
                    v-bind="attrs" v-on="on"
                    v-if="item.status === 'ready' && $auth.Auth('containers', 'write', containerID)"
                    small
                    class="mr-2">
                  mdi-check
                </v-icon>
              </template>
              <span>{{$t('ontologyVersioning.approveChangelist')}}</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="revokeChangelistApproval(item)"
                    v-bind="attrs" v-on="on"
                    v-if="item.status === 'approved' && $auth.Auth('containers', 'write', containerID)"
                    small
                    class="mr-2">
                  mdi-close
                </v-icon>
              </template>
              <span>{{$t('ontologyVersioning.revokeApproval')}}</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="deleteChangelist(item)"
                    v-bind="attrs" v-on="on"
                    v-if="item.status !== 'applied'"
                    small
                    class="mr-2">
                  mdi-delete
                </v-icon>
              </template>
              <span>{{$t('ontologyVersioning.deleteChangelist')}}</span>
            </v-tooltip>

          </template>
        </v-data-table>
      </v-card>
    </v-card>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";
import {ChangelistT, OntologyVersionT} from "@/api/types";

@Component
export default class OntologyVersioning extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  activeTab = "ontologyVersions"
  successMessage = ""
  errorMessage = ""
  ontologyVersions: OntologyVersionT[] = []
  changelists: ChangelistT[] = []

  versionHeaders() {
    return [{
      text: this.$t('ontologyVersioning.id'),
      value: "id",
      align: 'center'
    }, {
      text: this.$t('ontologyVersioning.name'),
      value: "name",
    }, {
      text: this.$t('ontologyVersioning.description'),
      value: "description",
      sortable: false
    }, {
      text: this.$t('ontologyVersioning.actions'),
      value: 'actions',
      align: 'center',
      sortable: false
    }]
  }

  changelistHeaders() {
    return [{
      text: this.$t('ontologyVersioning.id'),
      value: "id",
      align: 'center'
    }, {
      text: this.$t('ontologyVersioning.name'),
      value: "name",
    }, {
      text: this.$t('ontologyVersioning.status'),
      value: "status",
    }, {
      text: this.$t('ontologyVersioning.appliedAt'),
      value: "applied_at",
      sortable: false
    }, {
      text: this.$t('ontologyVersioning.actions'),
      value: 'actions',
      align: 'right',
      sortable: false
    }]
  }

  mounted() {
    this.listOntologyVersions()
    this.listChangelists()
  }

  listOntologyVersions() {
    this.$client.listOntologyVersions(this.containerID)
        .then(results => {
          this.ontologyVersions = results
        })
        .catch(e => this.errorMessage = e)
  }

  listChangelists() {
    if (this.$auth.Auth('containers', 'write', this.containerID)) {
      this.$client.listChangelists(this.containerID, {})
          .then(results => {
            this.changelists = results
          })
          .catch(e => this.errorMessage = e)
    } else {
      this.$client.listChangelists(this.containerID, {createdBy: this.$auth.CurrentUser()?.id})
          .then(results => {
            this.changelists = results
          })
          .catch(e => this.errorMessage = e)
    }
  }

  applyChangelist(changelist: ChangelistT) {
    this.$client.applyChangelist(this.containerID, changelist.id!)
    .then(() => {
      this.successMessage = 'Changelist Applied Successfully'
      this.listChangelists()
    })
    .catch(e => this.errorMessage = e)
  }

  sendChangelistForApproval(changelist: ChangelistT) {
    this.$client.setChangelistStatus(this.containerID, changelist.id!, 'ready')
        .then(() => {
          this.successMessage = 'Changelist Successfully Updated'
          this.listChangelists()
        })
        .catch(e => this.errorMessage = e)
  }

  deleteChangelist(changelist: ChangelistT) {
    this.$client.deleteChangelist(this.containerID, changelist.id!)
        .then(() => {
          this.successMessage = 'Changelist Successfully Deleted'
          this.listChangelists()
        })
        .catch(e => this.errorMessage = e)
  }

  approveChangelist(changelist: ChangelistT) {
    this.$client.approveChangelist(this.containerID, changelist.id!)
        .then(() => {
          this.successMessage = 'Changelist Successfully Approved'
          this.listChangelists()
        })
        .catch(e => this.errorMessage = e)
  }

  revokeChangelistApproval(changelist: ChangelistT) {
    this.$client.revokeApproval(this.containerID, changelist.id!)
        .then(() => {
          this.successMessage = 'Changelist Successfully Updated'
          this.listChangelists()
        })
        .catch(e => this.errorMessage = e)
  }


  rollbackOntology(version: OntologyVersionT) {
    this.$client.rollbackOntology(this.containerID, version.id!)
        .then(() => {
          this.successMessage = 'Ontology Rollback Started - Check Changelists'
          this.listOntologyVersions()
        })
        .catch(e => this.errorMessage = e)
  }

  chipColor(status: string) {
    switch (status) {
      case "pending": {
        return "default";
      }

      case "ready": {
        return "primary"
      }

      case "approved": {
        return "light-green"
      }

      case "applied": {
        return "green"
      }

      case "rejected": {
        return "red"
      }
    }
  }

  textColor(status: string) {
    switch (status) {
      case "pending": {
        return "";
      }

      case "ready": {
        return "color: white"
      }

      case "approved": {
        return "color: white"
      }

      case "applied": {
        return "color: white"
      }

      case "rejected": {
        return "color: white"
      }
    }
  }
}
</script>