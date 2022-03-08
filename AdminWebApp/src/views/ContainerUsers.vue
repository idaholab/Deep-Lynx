<template>
   <div>
      <v-data-table
              :headers="headers"
              :items="users"
              sort-by="calories"
              class="elevation-1"
      >

         <template v-slot:top>
            <v-toolbar flat color="white">
               <v-toolbar-title>{{$t("users.title")}}</v-toolbar-title>
               <v-divider
                       class="mx-4"
                       inset
                       vertical
               ></v-divider>
               <v-spacer></v-spacer>
              <invite-user-to-container-dialog :containerID="containerID"></invite-user-to-container-dialog>
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
            <!-- TODO: reimplement when either a delete or archive user function exists
            <v-icon
                    small
                    @click="deleteItem(item)"
            >
               mdi-delete
            </v-icon>
            -->
         </template>
      </v-data-table>
      <v-dialog v-model="editDialog" max-width="900px" @click:outside="clear()">
         <v-card>
            <v-card-title>
               <span class="headline">{{$t("containerUsers.editUserTitle")}}</span>
            </v-card-title>

            <v-card-text>
               <v-container>
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
                                       :label="$t('containerUsers.name')"
                                       required
                                       disabled
                               ></v-text-field>
                               <!-- TODO: reenable once you can edit basic user -->
                               <v-select @input="assignRole" v-model="selectedRole" :items="roles" :label="$t('users.role')"></v-select>
                            </v-col>

                            <v-col :cols="6">
                               <v-text-field
                                       v-model="toEdit.email"
                                       :label="$t('containerUsers.email')"
                                       required
                                       disabled
                               ></v-text-field>
                               <!-- TODO: reenable once you can edit basic user -->
                            </v-col>
                            </v-row>
                        </v-form>
                     </v-col>
                  </v-row>
                  <v-row>
                  </v-row>
               </v-container>
            </v-card-text>

            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn color="blue darken-1" text @click="editDialog = false">{{$t("containerUsers.cancel")}}</v-btn>
            </v-card-actions>
         </v-card>
      </v-dialog>
   </div>
</template>

<script lang="ts">
   import {Component, Prop, Vue} from 'vue-property-decorator'
   import {UserT} from "@/auth/types";
   import {AssignRolePayloadT} from "@/api/types";
   import InviteUserToContainerDialog from "@/components/accessManagement/inviteUserToContainerDialog.vue";
   @Component({
     components: {InviteUserToContainerDialog}
   })
   export default class ContainerUsers extends Vue {
      @Prop({required: true})
      readonly containerID!: string;

      dialog = false
      editDialog = false
      users: UserT[] = []
      newUser = {
         display_name: "",
         email: "",
         password: "",
         identity_provider: "username_password"
      }
      toEdit: UserT | null = null
      selectedRole = ""
      roles = ["user", "editor", "admin"]

      get headers() {
         return  [
            { text: this.$t("containerUsers.name"), value: 'display_name' },
            { text: this.$t("containerUsers.email"), value: 'email'},
            { text: this.$t("containerUsers.actions"), value: 'actions', sortable: false }
         ]
      }

      mounted() {
         this.refreshUsers()
      }

      refreshUsers() {
         this.$client.listUsersInContainer(this.containerID)
                 .then(users => {
                    this.users = users
                 })
                 .catch(e => console.log(e))
      }

      clearNewUser() {
         this.dialog = false
         this.newUser = {
            display_name: "",
            email: "",
            password: "",
            identity_provider: "username_password"
         }
      }


      retrieveUserRoles(user: UserT) {
         if(this.toEdit) {
            this.$client.retrieveUserRoles(this.containerID, user.id)
            .then(roles => {
              if(roles.length > 0) {
                this.selectedRole = roles[0]
              }
            })
            .catch(e => console.log(e))
         }
      }

      editUser(user: UserT) {
         this.editDialog = true
         this.toEdit = user
         this.retrieveUserRoles(user)
      }

      assignRole(role: string) {
          if(this.toEdit ) {
             const assignRolePayload: AssignRolePayloadT = {
                user_id: this.toEdit.id,
                container_id: this.containerID,
                role_name: role
             }
             console.log("here")

             this.$client.assignRoleToUser(this.containerID, assignRolePayload)
             .then(() => {
               console.log("assigned")

                if(this.toEdit){
                   this.retrieveUserRoles(this.toEdit)
                }
             })
             .catch(e => console.log(e))
          }

      }

      clear() {
         this.toEdit = null
         this.selectedRole = ""
      }
   }
</script>
