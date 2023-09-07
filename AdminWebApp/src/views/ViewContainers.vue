<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-data-table
      :headers="headers"
      :items="containers"
      class="elevation-1"
    >

      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("containers.description")}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-container-dialog @containerCreated="refreshContainers"></create-container-dialog>
        </v-toolbar>

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
      <v-card class="pt-1 pb-3 px-2">
        <v-card-title>
          <span class="headline text-h3">{{$t("containers.edit")}}</span>
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
                    v-model="toEdit.name"
                    :label="$t('general.name')"
                    required
                  ></v-text-field>
                </v-col>

                <v-col :cols="6">
                  <v-text-field
                    v-model="toEdit.description"
                    :label="$t('general.description')"
                    required
                  ></v-text-field>
                </v-col>
                </v-row>
              </v-form>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="editDialog = false">{{$t("general.cancel")}}</v-btn>
          <v-btn color="primary" text @click="saveContainer">{{$t("general.save")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {UserT} from "@/auth/types";
  import {ContainerT} from "@/api/types";
  import CreateContainerDialog from "@/components/ontology/containers/createContainerDialog.vue"

  interface ContainersModel {
    dialog: boolean,
    editDialog: boolean,
    errorMessage: string,
    newContainer: {name: string | null, description: string | null},
    users: UserT[]
    containers: ContainerT[]
    toEdit: ContainerT | null
  }

  export default Vue.extend ({
    name: 'ViewContainers',

    components: { CreateContainerDialog },

    computed: {
      headers() {
         return  [
            { text: this.$t("general.name"), value: 'name' },
            { text: this.$t("general.description"), value: 'description'},
            { text: this.$t("general.actions"), value: 'actions', sortable: false }
         ]
      }
    },

    data: (): ContainersModel => ({
      dialog: false,
      editDialog: false,
      errorMessage: '',
      newContainer: {name: null, description:null},
      users: [],
      containers: [],
      toEdit: null
    }),

    methods: {
      refreshContainers() {
         this.$client.listContainers()
         .then(containers => {
            this.containers = containers
         })
         .catch(e => this.errorMessage = e)
      },
      deleteContainer(container: ContainerT) {
         this.$client.deleteContainer(container.id)
         .then(() => {
            this.refreshContainers()
         })
         .catch(e => this.errorMessage = e)
      },
      editContainer(container: ContainerT) {
         this.editDialog = true
         this.toEdit = container
         this.refreshContainers()
      },
      saveContainer() {
         this.$client.updateContainer({"name": this.toEdit!.name, "description": this.toEdit!.description})
         this.editDialog = false
         this.refreshContainers()
      }
    },

    mounted() {
        this.refreshContainers()
    }
  })
</script>
