<template>
   <div>
      <v-data-table
              :headers="headers"
              :items="containers"
              class="elevation-1"
      >

         <template v-slot:top>
            <v-toolbar flat color="white">
               <v-toolbar-title>{{$t("containers.title")}}</v-toolbar-title>
               <v-divider
                       class="mx-4"
                       inset
                       vertical
               ></v-divider>
               <v-spacer></v-spacer>
               <new-container-dialog @containerCreated="refreshContainers"></new-container-dialog>
            </v-toolbar>

            <!-- TODO: Set search capability
                <v-text-field v-model="search" label="Search" class="mx-4"></v-text-field>
            -->

         </template>
         <template v-slot:[`item.actions`]="{ item }">
            <v-icon
                    small
                    class="mr-2"
                    @click="editContainer(item)"
            >
               mdi-pencil
            </v-icon>
            <v-icon
                    small
                    @click="deleteContainer(item)"
            >
               mdi-delete
            </v-icon>
         </template>
      </v-data-table>
      <v-dialog v-model="editDialog" max-width="900px">
         <v-card>
            <v-card-title>
               <span class="headline">{{$t("containers.editContainersTitle")}}</span>
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
                                       v-model="toEdit.name"
                                       :label="$t('containers.name')"
                                       required
                               ></v-text-field>
                            </v-col>

                            <v-col :cols="6">
                               <v-text-field
                                       v-model="toEdit.description"
                                       :label="$t('containers.description')"
                                       required
                               ></v-text-field>
                            </v-col>
                            </v-row>
                        </v-form>
                     </v-col>
                  </v-row>
               </v-container>
            </v-card-text>

            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn color="blue darken-1" text @click="editDialog = false">{{$t("home.cancel")}}</v-btn>
               <v-btn color="blue darken-1" text @click="saveContainer">{{$t("home.save")}}</v-btn>
            </v-card-actions>
         </v-card>
      </v-dialog>
   </div>
</template>

<script lang="ts">
   import {Component, Vue} from 'vue-property-decorator'
   import {UserT} from "@/auth/types";
   import {ContainerT} from "@/api/types";
   import NewContainerDialog from "@/components/newContainerDialog.vue"

   @Component({components: {NewContainerDialog}})
   export default class Containers extends Vue {
      dialog = false
      editDialog = false
      users: UserT[] = []
      containers: ContainerT[] = []
      toEdit: ContainerT | null = null
      newContainer = {name: null, description:null}

      get headers() {
         return  [
            { text: this.$t("containers.name"), value: 'name' },
            { text: this.$t("containers.description"), value: 'description'},
            { text: this.$t("containers.actions"), value: 'actions', sortable: false }
         ]
      }

      mounted() {
         this.refreshContainers()
      }

      refreshContainers() {
         this.$client.listContainers()
         .then(containers => {
            this.containers = containers
         })
         .catch(e => console.log(e))
      }

      deleteContainer(container: ContainerT) {
         this.$client.deleteContainer(container.id)
         .then(() => {
            this.refreshContainers()
         })
         .catch(e => console.log(e))
      }

      clearNew() {
         this.newContainer = {name: null, description: null}
      }

      createContainer() {
         this.$client.createContainer(this.newContainer)
         .then(() => {
            this.dialog = false
            this.clearNew()
            this.refreshContainers()
         })
         .catch(e => console.log(e))
      }

      editContainer(container: ContainerT) {
         this.editDialog = true
         this.toEdit = container
         this.refreshContainers()
      }

      saveContainer() {
         this.$client.updateContainer({"name": this.toEdit!.name, "description": this.toEdit!.description}, this.toEdit!.id)
         this.editDialog = false
         this.refreshContainers()
      }
   }
</script>
