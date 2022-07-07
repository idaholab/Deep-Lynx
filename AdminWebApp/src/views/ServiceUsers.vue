<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-data-table
      :headers="headers"
      :items="users"
      class="elevation-1"
    >

      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("home.serviceUsersDescription")}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-service-user :containerID="containerID" @serviceUserCreated="refreshUsers()"></create-service-user>
        </v-toolbar>

      </template>
      <template v-slot:[`item.created_at`]="{ item }">
        {{new Date(Date.parse(item.created_at)).toDateString()}}
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <service-user-permissions-dialog :containerID="containerID" :serviceUserID="item.id" :icon="true"></service-user-permissions-dialog>
        <service-user-api-key-dialog :containerID="containerID" :serviceUserID="item.id" :icon="true"></service-user-api-key-dialog>
        <delete-service-user-dialog
            :icon="true"
            :containerID="containerID"
            :serviceUserID="item.id"
            @serviceUserDeleted="refreshUsers()"></delete-service-user-dialog>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
  import {Component, Prop, Vue} from 'vue-property-decorator'
  import {UserT} from "@/auth/types";
  import CreateServiceUser from "@/components/accessManagement/serviceUsers/createServiceUser.vue";
  import DeleteServiceUserDialog from "@/components/accessManagement/serviceUsers/deleteServiceUserDialog.vue";
  import ServiceUserPermissionsDialog
    from "@/components/accessManagement/serviceUsers/serviceUserPermissionsDialog.vue";
  import ServiceUserApiKeyDialog from "@/components/accessManagement/serviceUsers/serviceUserApiKeyDialog.vue";

  @Component({components: {CreateServiceUser, DeleteServiceUserDialog, ServiceUserPermissionsDialog, ServiceUserApiKeyDialog}})
  export default class ServiceUsers extends Vue {
    @Prop({required: true})
    readonly containerID!: string;

    dialog = false
    errorMessage = ""
    users: UserT[] = []

    get headers() {
      return  [
        { text: this.$t("users.name"), value: 'display_name' },
        { text: this.$t("users.createdAt"), value: 'created_at'},
        { text: this.$t("users.actions"), value: 'actions', sortable: false }
      ]
    }

    created() {
      this.refreshUsers()
    }

    refreshUsers() {
      this.$client.listServiceUsers(this.containerID)
      .then(users => {
        this.users = users
      })
      .catch(e => this.errorMessage = e)
    }
  }
</script>
