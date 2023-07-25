<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <success-banner :message="inviteSuccess"></success-banner>
    <v-data-table
      :headers="headers"
      :items="users"
      class="elevation-1"
    >

      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("users.containerDescription")}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <InviteUserToContainerDialog :containerID="containerID" @userInvited="flashSuccess"></InviteUserToContainerDialog>
        </v-toolbar>
      </template>
      <template v-slot:[`item.role`]="{ item }">
        <div v-if="$store.getters.activeContainer.created_by === item.id">{{$t('users.owner')}}</div>
        <div v-else>
          {{item.role}}
        </div>
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-if="$store.getters.activeContainer.created_by !== item.id || item.id !== $auth.CurrentUser()?.id"
                small
                class="mr-2"
                @click="editUser(item)"
                v-bind="attrs"
                v-on="on"
            >
              mdi-pencil
            </v-icon>
          </template>
          <span>{{$t('users.editContainerRoles')}}</span>
        </v-tooltip>

        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon
                v-if="$store.getters.activeContainer.created_by !== item.id || item.id !== $auth.CurrentUser()?.id"
                small
                class="mr-2"
                @click="deleteUser(item)"
                v-bind="attrs"
                v-on="on"
            >
              mdi-account-multiple-minus
            </v-icon>
          </template>
          <span>{{$t('users.remove')}}</span>
        </v-tooltip>

      </template>
    </v-data-table>
    
    <v-dialog v-model="editDialog" max-width="900px" @click:outside="clear()">
      <v-card class="pt-1 pb-3 px-2">
        <v-card-title>
          <span class="headline text-h3">{{$t("users.edit")}}</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col v-if="toEdit !== null" :cols="12">
              <success-banner :message="successMessage"></success-banner>
              <v-form
                ref="form"
                lazy-validation
              >
                <v-row>
                  <v-col :cols="6">
                    <v-text-field
                      v-model="toEdit.display_name"
                      :label="$t('general.name')"
                      required
                      disabled
                    ></v-text-field>
                    <v-select @input="assignRole" v-model="selectedRole" :items="roles" :label="$t('users.role')"></v-select>
                  </v-col>

                  <v-col :cols="6">
                    <v-text-field
                      v-model="toEdit.email"
                      :label="$t('general.email')"
                      required
                      disabled
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-form>
            </v-col>
          </v-row>
          <v-row>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="editDialog = false; refreshUsers()">{{$t("general.close")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {UserT} from "@/auth/types";
  import {AssignRolePayloadT} from "@/api/types";
  import InviteUserToContainerDialog from "@/components/accessManagement/InviteUserToContainerDialog.vue";

  interface ContainerUsersModel {
    dialog: boolean,
    editDialog: boolean,
    selectedRole: string,
    roles: Array<"user" | "editor" | "admin">,
    errorMessage: string,
    successMessage: string,
    inviteSuccess: string,
    users: UserT[]
    toEdit: UserT | null,
    newUser: {
      display_name: string;
      email: string;
      password: string;
      identity_provider: "username_password";
    }
  }

  export default Vue.extend ({
    name: 'ViewContainerUsers',

    components: { InviteUserToContainerDialog },

    props: {
      containerID: {type: String, required: true},
    },

    computed: {
      headers() {
        return  [
          { text: this.$t("general.name"), value: 'display_name' },
          { text: this.$t("general.email"), value: 'email'},
          { text: this.$t("users.role"), value: 'role'},
          { text: this.$t("general.actions"), value: 'actions', sortable: false }
        ]
      }
    },

    data: (): ContainerUsersModel => ({
      dialog: false,
      editDialog: false,
      selectedRole: "",
      roles: ["user", "editor", "admin"],
      errorMessage: '',
      successMessage: '',
      inviteSuccess: '',
      users: [],
      toEdit: null,
      newUser: {
        display_name: "",
        email: "",
        password: "",
        identity_provider: "username_password"
      },
    }),

    methods: {
      refreshUsers() {
        this.$client.listUsersInContainer(this.containerID)
          .then(users => {
            users.forEach((u, i) => {
              this.$client.retrieveUserRoles(this.containerID, u.id)
                .then(roles => {
                  if(roles.length > 0) {
                    users[i].role = roles[0]
                  }
                  this.$forceUpdate()
                })
                .catch(e => this.errorMessage = e)
            });
            this.users = users;
          })
          .catch(e => this.errorMessage = e)
      },
      clearNewUser() {
        this.dialog = false
        this.newUser = {
          display_name: "",
          email: "",
          password: "",
          identity_provider: "username_password"
        }
      },
      retrieveUserRoles(user: UserT) {
        if(this.toEdit) {
          this.$client.retrieveUserRoles(this.containerID, user.id)
          .then(roles => {
            if(roles.length > 0) {
              this.selectedRole = roles[0]
            }

          })
          .catch(e => this.errorMessage = e)
        }
      },
      editUser(user: UserT) {
          this.editDialog = true
          this.toEdit = user
          this.retrieveUserRoles(user)
          this.refreshUsers()
      },
      deleteUser(user: UserT) {
        this.$client.removeAllUserRoles(this.containerID, user.id!)
            .then(() => {
              this.refreshUsers();
            })
            .catch(e => this.errorMessage = e)
      },
      flashSuccess(){
        this.inviteSuccess = this.$t('users.invited') as string
      },
      assignRole(role: string) {
        if(this.toEdit ) {
          const assignRolePayload: AssignRolePayloadT = {
            user_id: this.toEdit.id,
            container_id: this.containerID,
            role_name: role
          }

          this.$client.assignRoleToUser(this.containerID, assignRolePayload)
          .then(() => {
            this.successMessage = this.$t('users.assigned') as string

            setTimeout(() => {
              this.successMessage = ''
            }, 6000)

            if(this.toEdit){
              this.retrieveUserRoles(this.toEdit)
            }
          })
          .catch(e => this.errorMessage = e)
        }

      },
      clear() {
        this.toEdit = null
        this.selectedRole = ""
        this.refreshUsers()
      }
    },

    mounted() {
      this.refreshUsers()
    }
  });
</script>
