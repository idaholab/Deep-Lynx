<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('ontology.versioningSubtitle')}}<br><span class="text-caption">{{$t('ontology.versioningDescription')}}</span></v-toolbar-title>
      </v-toolbar>

      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-tabs grow>
        <v-tab @click="activeTab = 'ontologyVersions'; listOntologyVersions()">
          {{ $t('ontology.versions') }}
        </v-tab>
        <v-tab @click="activeTab = 'changelists'; listChangelists()">
          {{ $t('changelists.changelists') }}
        </v-tab>
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
              <span>{{$t('ontology.rollbackDescription')}}</span>
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
            <v-tooltip bottom v-if="item.status === 'approved'">
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="applyChangelist(item)"
                    v-bind="attrs" v-on="on"
                    small
                    class="mr-2">
                  mdi-swap-horizontal
                </v-icon>
              </template>
              <span>{{$t('changelists.apply')}}</span>
            </v-tooltip>

            <v-tooltip bottom v-if="item.status === 'ready' || item.status === 'rejected'">
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="sendChangelistForApproval(item)"
                    v-bind="attrs" v-on="on"
                    small
                    class="mr-2">
                  mdi-send
                </v-icon>
              </template>
              <span>{{$t('changelists.send')}}</span>
            </v-tooltip>

            <v-tooltip bottom
              v-if="item.status === 'pending' && $auth.Auth('containers', 'write', containerID)"
            >
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="approveChangelist(item)"
                    v-bind="attrs" v-on="on"
                    small
                    class="mr-2">
                  mdi-check
                </v-icon>
              </template>
              <span>{{$t('changelists.approve')}}</span>
            </v-tooltip>

            <v-tooltip bottom
                       v-if="item.status === 'approved' && $auth.Auth('containers', 'write', containerID) || item.status === 'pending' && $auth.Auth('containers', 'write', containerID)"
            >
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="revokeChangelistApproval(item)"
                    v-bind="attrs" v-on="on"
                    small
                    class="mr-2">
                  mdi-close
                </v-icon>
              </template>
              <span>{{$t('changelists.reject')}}</span>
            </v-tooltip>

            <v-tooltip bottom
                       v-if="item.status !== 'published'"
            >
              <template v-slot:activator="{on, attrs}">
                <v-icon
                    @click="deleteChangelist(item)"
                    v-bind="attrs" v-on="on"
                    small
                    class="mr-2">
                  mdi-delete
                </v-icon>
              </template>
              <span>{{$t('changelists.delete')}}</span>
            </v-tooltip>

          </template>
        </v-data-table>
      </v-card>
    </v-card>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {OntologyVersionT} from "@/api/types";

  interface OntologyVersioningModel {
    activeTab: string,
    successMessage: string,
    errorMessage: string,
    ontologyVersions: OntologyVersionT[]
    changelists: OntologyVersionT[]
  }

  export default Vue.extend ({
    name: 'ViewOntologyVersioning',

    props: {
      containerID: {type: String, required: true},
    },

    data: (): OntologyVersioningModel => ({
      activeTab: "ontologyVersions",
      successMessage: "",
      errorMessage: "",
      ontologyVersions: [],
      changelists: []
    }),

    methods: {
      versionHeaders() {
        return [{
          text: this.$t('general.id'),
          value: "id",
          align: 'center'
        }, {
          text: this.$t('general.name'),
          value: "name",
        }, {
          text: this.$t('general.description'),
          value: "description",
          sortable: false
        }, {
          text: this.$t('general.actions'),
          value: 'actions',
          align: 'center',
          sortable: false
        }]
      },
      changelistHeaders() {
        return [{
          text: this.$t('general.id'),
          value: "id",
          align: 'center'
        }, {
          text: this.$t('general.name'),
          value: "name",
        }, {
          text: this.$t('general.description'),
          value: "description",
        }, {
          text: this.$t('general.status'),
          value: "status",
        }, {
          text: this.$t('ontology.publishedAt'),
          value: "published_at",
          sortable: false
        }, {
          text: this.$t('general.actions'),
          value: 'actions',
          align: 'right',
          sortable: false
        }]
      },
      listOntologyVersions() {
        this.$client.listOntologyVersions(this.containerID, {status: 'published'})
            .then(results => {
              this.ontologyVersions = results
            })
            .catch(e => this.errorMessage = e)
      },
      listChangelists() {
        if (this.$auth.Auth('containers', 'write', this.containerID)) {
          this.$client.listOntologyVersions(this.containerID, {})
              .then(results => {
                this.changelists = results
              })
              .catch(e => this.errorMessage = e)
        } else {
          this.$client.listOntologyVersions(this.containerID, {createdBy: this.$auth.CurrentUser()?.id})
              .then(results => {
                this.changelists = results
              })
              .catch(e => this.errorMessage = e)
        }
      },
      applyChangelist(version: OntologyVersionT) {
        this.$client.applyOntologyVersion(this.containerID, version.id!)
            .then(() => {
              this.successMessage = (this.$t('changelists.applied') as string)
              this.$store.dispatch('refreshOwnedCurrentChangelists')
              this.$store.dispatch('refreshCurrentOntologyVersions')
              // ensure edit mode and selected change list are set so that users
              // cannot edit the ontology without a changelist selected
              this.$store.commit('setEditMode', false)
              this.$store.commit('selectChangelist', undefined)
              this.listChangelists()
              this.listOntologyVersions()
            })
            .catch(e => this.errorMessage = e)
      },
      sendChangelistForApproval(version: OntologyVersionT) {
        this.$client.sendOntologyVersionForApproval(this.containerID, version.id!)
            .then(() => {
              this.successMessage = (this.$t('changelists.updated') as string)
              this.listChangelists()
            })
            .catch(e => this.errorMessage = e)
      },
      deleteChangelist(version: OntologyVersionT) {
        this.$client.deleteOntologyVersion(this.containerID, version.id!)
            .then(() => {
              this.successMessage = (this.$t('changelists.deleted') as string)
              this.listChangelists()
            })
            .catch(e => this.errorMessage = e)
      },
      approveChangelist(version: OntologyVersionT) {
        this.$client.approveOntologyVersion(this.containerID, version.id!)
            .then(() => {
              this.successMessage = (this.$t('changelists.approved') as string)
              this.listChangelists()
            })
            .catch(e => this.errorMessage = e)
      },
      revokeChangelistApproval(version: OntologyVersionT) {
        this.$client.revokeOntologyVersionApproval(this.containerID, version.id!)
            .then(() => {
              this.successMessage = (this.$t('changelists.updated') as string)
              this.listChangelists()
            })
            .catch(e => this.errorMessage = e)
      },
      rollbackOntology(version: OntologyVersionT) {
        this.$client.createOntologyVersion(this.containerID,{
          name: `${version.name}-rollback ${new Date().toDateString()}`,
          description: `Roll back changelist for ${version.name}`,
          container_id: this.containerID
        }, version.id! )
            .then(() => {
              this.successMessage = (this.$t('ontology.rollbackStarted') as string)
              this.listOntologyVersions()
              this.$forceUpdate()
            })
            .catch(e => this.errorMessage = e)
      },
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

          case "published": {
            return "green"
          }

          case "rejected": {
            return "red"
          }

          case "deprecated": {
            return "orange"
          }
        }
      },
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

          case "published": {
            return "color: white"
          }

          case "rejected": {
            return "color: white"
          }
        }
      }
    },

    mounted() {
      this.listOntologyVersions()
      this.listChangelists()
    }
  });
</script>
