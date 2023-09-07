<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-data-table
      :headers="headers"
      :items="users"
      class="elevation-1"
    >

      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("serviceUsers.description")}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <CreateServiceUser :containerID="containerID" @serviceUserCreated="refreshUsers()"></CreateServiceUser>
        </v-toolbar>

      </template>
      <template v-slot:[`item.created_at`]="{ item }">
        {{new Date(Date.parse(item.created_at)).toDateString()}}
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <ServiceUserPermissionsDialog :containerID="containerID" :serviceUserID="item.id" :icon="true"></ServiceUserPermissionsDialog>
        <ServiceUserApiKeyDialog :containerID="containerID" :serviceUserID="item.id" :icon="true"></ServiceUserApiKeyDialog>
        <DeleteServiceUserDialog
          :icon="true"
          :containerID="containerID"
          :serviceUserID="item.id"
          @serviceUserDeleted="refreshUsers()"
        />
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {UserT} from "@/auth/types";
  import CreateServiceUser from "@/components/accessManagement/serviceUsers/CreateServiceUser.vue";
  import DeleteServiceUserDialog from "@/components/accessManagement/serviceUsers/DeleteServiceUserDialog.vue";
  import ServiceUserPermissionsDialog
  from "@/components/accessManagement/serviceUsers/ServiceUserPermissionsDialog.vue";
  import ServiceUserApiKeyDialog from "@/components/accessManagement/serviceUsers/ServiceUserApiKeyDialog.vue";

  interface ServiceUsersModel {
    errorMessage: string,
    users: UserT[],
  }

  export default Vue.extend ({
    name: 'ViewServiceUsers',

    components: { CreateServiceUser, DeleteServiceUserDialog, ServiceUserPermissionsDialog, ServiceUserApiKeyDialog },

    props: {
      containerID: {type: String, required: true},
    },

    data: (): ServiceUsersModel => ({
      errorMessage: "",
      users: [],
    }),

    computed: {
      headers(): { text: string; value: string; sortable?: boolean }[] {
        return  [
          { text: this.$t("general.name"), value: 'display_name' },
          { text: this.$t("general.dateCreated"), value: 'created_at'},
          { text: this.$t("general.actions"), value: 'actions', sortable: false }
        ]
      }
    },

    methods: {
      refreshUsers() {
        this.$client.listServiceUsers(this.containerID as string)
          .then(users => {
            this.users = users
            this.errorMessage = "" // Reset the 'errorMessage' in case of a successful response

          })
          .catch(e => this.errorMessage = e.message)
      }
    },

    created() {
      this.refreshUsers()
    }
  });
</script>
