<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false;" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
          @click="refreshPermissions"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("serviceUserPermissions.serviceUserPermissions")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('serviceUserPermissions.title')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.containersDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.containers"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.containers')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.ontologyDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.ontology"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.ontology')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.dataDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.data"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.data')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.usersDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.users"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.users')}}</template>
              </v-select>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false;" >{{$t("createServiceUser.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="savePermissions()">{{$t("createServiceUser.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {ServiceUserPermissionSetT} from "@/api/types";

@Component
export default class ServiceUserPermissionsDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  serviceUserID!: string

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  name = ""
  valid = false
  options = ['read', 'write']
  permissionSet: ServiceUserPermissionSetT = {
    containers: [],
    ontology: [],
    users: [],
    data: []
  }

  refreshPermissions() {
    this.$client.getServiceUsersPermissions(this.containerID, this.serviceUserID)
        .then(result => {
          Object.assign(this.permissionSet, result)
          })
        .catch(e => this.errorMessage = e)
  }

  savePermissions() {
    this.$client.setServiceUsersPermissions(this.containerID, this.serviceUserID, this.permissionSet)
        .then(()=> {
          this.dialog = false
          this.refreshPermissions()
        })
        .catch(e => this.errorMessage = e)
  }
}
</script>
