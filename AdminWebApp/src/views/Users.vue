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
          <v-toolbar-title>{{$t("home.usersDescription")}}</v-toolbar-title>
        </v-toolbar>

      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <v-icon
          small
          class="mr-2"
          @click="editUser(item)"
        >
          mdi-pencil
        </v-icon>
        <v-icon
          small
          @click="deleteUser(item)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>

    <v-dialog v-model="editDialog" max-width="900px" @click:outside="clear()">
      <v-card class="pt-1 pb-3 px-2">
        <v-card-title>
          <span class="headline text-h3">{{$t("users.editUserTitle")}}</span>
        </v-card-title>   
        <v-card-text>
          <v-row>
            <v-col v-if="toEdit !== null" :cols="12">

              <v-form
                ref="form"
                lazy-validation
              >
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      v-model="toEdit.display_name"
                      :label="$t('users.name')"
                      required
                    ></v-text-field>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      v-model="toEdit.email"
                      :label="$t('users.email')"
                      required
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-form>
            </v-col>
          </v-row>
          <v-row>
            <v-col :cols="3">
              <h3>{{$t("users.assignContainerRoles")}}</h3>
              <v-list dense :nav="true">
                <v-list-item  v-for="container in containers"
                  v-bind:key="container.id"
                  :input-value="selectedContainer && selectedContainer.id === container.id"
                  two-line
                  link
                  @click="selectContainer(container)"
                >
                  <v-list-item-content>
                    <v-list-item-title>{{container.name}}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col :cols="9">
              <v-card v-if="selectedContainer">
                <v-card-title><h4 class="text-h4">{{$t("users.assignRole")}}</h4></v-card-title>
                <v-card-text>
                  <v-select @input="assignRole" v-model="selectedRole" :items="roles" :label="$t('users.role')"></v-select>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="editDialog = false">{{$t("users.cancel")}}</v-btn>
          <v-btn color="blue darken-1" text @click="saveUser">{{$t("home.save")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
  import {Component, Prop, Vue} from 'vue-property-decorator'
  import {UserT} from "@/auth/types";
  import {AssignRolePayloadT, ContainerT} from "@/api/types";

  @Component
  export default class Users extends Vue {
    @Prop({required: true})
    readonly containerID!: string;

    dialog = false
    editDialog = false
    selectedContainer: ContainerT | null = null
    users: UserT[] = []
    containers: ContainerT[] = []
    errorMessage = ""

    toEdit: UserT | null = null
    selectedRole = ""
    roles = ["user", "editor", "admin"]

    get headers() {
      return  [
        { text: this.$t("users.name"), value: 'display_name' },
        { text: this.$t("users.email"), value: 'email'},
        { text: this.$t("users.admin"), value: 'admin'},
        { text: this.$t("users.actions"), value: 'actions', sortable: false }
      ]
    }

    mounted() {
      this.refreshUsers()
      this.refreshContainers()
    }

    refreshUsers() {
      this.$client.listUsers()
      .then(users => {
        this.users = users
      })
      .catch(e => this.errorMessage = e)
    }

    refreshContainers() {
      this.$client.listContainers()
      .then(containers => {
        this.containers = containers
      })
      .catch(e => this.errorMessage = e)
    }

    retrieveUserRoles() {
      if(this.selectedContainer && this.toEdit) {
        this.$client.retrieveUserRoles(this.selectedContainer.id, this.toEdit.id)
        .then(roles => {
          if(roles.length > 0) {
            this.selectedRole = roles[0]
          }
        })
        .catch(e => this.errorMessage = e)
      }
    }

    editUser(user: UserT) {
      this.editDialog = true
      this.toEdit = user
      this.refreshContainers()
    }

    saveUser() {
      this.$client.updateUser({"display_name": this.toEdit!.display_name, "email": this.toEdit!.email}, this.toEdit!.id)
      this.editDialog = false
    }

    deleteUser(user: UserT) {
      this.$client.deleteUser(user.id)
      this.refreshUsers()
    }

    selectContainer(container: ContainerT) {
      this.selectedRole = ""
      this.selectedContainer = container
      this.retrieveUserRoles()
    }

    assignRole(role: string) {
      if(this.toEdit && this.selectedContainer) {
        const assignRolePayload: AssignRolePayloadT = {
          user_id: this.toEdit.id,
          container_id: this.selectedContainer.id,
          role_name: role
        }

        this.$client.assignRoleToUser(this.selectedContainer.id, assignRolePayload)
        .then(() => {
          this.retrieveUserRoles()
        })
        .catch(e => this.errorMessage = e)
      }
    }

    clear() {
      this.toEdit = null
      this.selectedContainer = null
      this.selectedRole = ""
    }
  }
</script>
