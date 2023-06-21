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
  import {Component, Prop, Vue} from 'vue-property-decorator'
  import {UserT} from "@/auth/types";
  import CreateServiceUser from "@/components/accessManagement/serviceUsers/CreateServiceUser.vue";
  import DeleteServiceUserDialog from "@/components/accessManagement/serviceUsers/DeleteServiceUserDialog.vue";
  import ServiceUserPermissionsDialog
    from "@/components/accessManagement/serviceUsers/ServiceUserPermissionsDialog.vue";
  import ServiceUserApiKeyDialog from "@/components/accessManagement/serviceUsers/ServiceUserApiKeyDialog.vue";

  @Component({components: {CreateServiceUser, DeleteServiceUserDialog, ServiceUserPermissionsDialog, ServiceUserApiKeyDialog}})
  export default class ServiceUsers extends Vue {
    @Prop({required: true})
    readonly containerID!: string;

    dialog = false
    errorMessage = ""
    users: UserT[] = []

    get headers() {
      return  [
        { text: this.$t("general.name"), value: 'display_name' },
        { text: this.$t("general.createdAt"), value: 'created_at'},
        { text: this.$t("general.actions"), value: 'actions', sortable: false }
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
