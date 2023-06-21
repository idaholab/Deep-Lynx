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
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("serviceUsers.managePermissions")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('serviceUsers.managePermissions')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <p style="margin-bottom: 0px">{{$t('serviceUsers.containersDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.containers"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.containers')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUsers.ontologyDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.ontology"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.ontology')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUsers.dataDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.data"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.data')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUsers.usersDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.users"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.users')}}</template>
              </v-select>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false;" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="savePermissions()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ServiceUserPermissionSetT} from "@/api/types";

  interface ServiceUserPermissionsDialogModel {
    permissionSet: ServiceUserPermissionSetT
    errorMessage: string
    dialog: boolean
    name: string
    valid: boolean
    options: string[]
  }

  export default Vue.extend ({
    name: 'ServiceUserPermissionsDialog',

    props: {
      containerID: {
        type: String,
        required: true
      },
      serviceUserID: {
        type: String,
        required: true
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): ServiceUserPermissionsDialogModel => ({
      permissionSet: {
        containers: [],
        ontology: [],
        users: [],
        data: []
      },
      errorMessage: "",
      dialog: false,
      name: "",
      valid: false,
      options: ['read', 'write']
    }),

    methods: {
      refreshPermissions() {
        this.$client.getServiceUsersPermissions(this.containerID, this.serviceUserID)
            .then(result => {
              Object.assign(this.permissionSet, result)
              })
            .catch(e => this.errorMessage = e)
      },
      savePermissions() {
        this.$client.setServiceUsersPermissions(this.containerID, this.serviceUserID, this.permissionSet)
            .then(()=> {
              this.dialog = false
              this.refreshPermissions()
            })
            .catch(e => this.errorMessage = e)
      }
    }
  });
</script>
