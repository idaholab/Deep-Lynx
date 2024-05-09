<template>
  <DialogBasic
    ref="dialog"
    :icon-name="config.icon"
    :max-width="maxWidth" 
    :icon="icon" 
    :title="config.title"
    @closeDialog="resetDialog"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
      <template v-if="mode === 'create' || mode === 'edit'">
        <v-row>
          <v-col :cols="12">
            <p v-if="mode === 'create'">{{$t('serviceUsers.createDescription')}}</p>
            <v-form
              ref="form"
              v-model="valid"
            >
              <div v-if="mode === 'create'">
                <v-text-field
                  v-model="name"
                  :rules="[validationRules]"
                  required
                >
                  <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <span class="headline text-h4">{{$t('users.permissions')}}</span>
              </div>
              
              <p style="margin-bottom: 0px">{{$t('serviceUsers.containersDescription')}}</p>
              <v-select
                  :items="options"
                  item-text="value"
                  v-model="newPermissionSet.containers"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.containers')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUsers.ontologyDescription')}}</p>
              <v-select
                  :items="options"
                  item-text="value"
                  v-model="newPermissionSet.ontology"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.ontology')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUsers.dataDescription')}}</p>
              <v-select
                  :items="options"
                  item-text="value"
                  v-model="newPermissionSet.data"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.data')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUsers.usersDescription')}}</p>
              <v-select
                  :items="options"
                  item-text="value"
                  v-model="newPermissionSet.users"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUsers.users')}}</template>
              </v-select>
            </v-form>
            <p v-if="mode === 'create'"><span style="color:red">*</span> = {{$t('validation.required')}}</p>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'apiKey'">
        <v-row>
          <v-col :cols="12">
            <v-data-table
                :headers="headers()"
                :items="keyPairs"
                class="elevation-1"
            >
              <template v-slot:top>
                <v-toolbar flat color="white">
                  <v-toolbar-title>{{$t('apiKeys.description')}}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <ApiKeyActions mode="create" :icon="false" :maxWidth="'700px'" :containerID="containerID" :serviceUserID="serviceUserID" @apiKeyCreated="refreshKeys()"/>
                </v-toolbar>
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <ApiKeyActions mode="delete" :maxWidth="'60%'" :key-pair="item" :icon="true" :containerID="containerID" :serviceUserID="serviceUserID" @apiKeyDeleted="refreshKeys()"/>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
              <v-alert type="error">
                {{$t('warnings.deleteServiceUser')}}
              </v-alert>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <template v-if="mode === 'create'">
        <v-btn color="primary" :disabled="!valid" text @click="createServiceUser()">{{$t("general.save")}}</v-btn>
      </template>

      <template v-if="mode === 'edit'">
        <v-btn color="primary" :disabled="!valid" text @click="savePermissions()">{{$t("general.save")}}</v-btn>
      </template>

      <template v-if="mode === 'delete'">
        <v-btn color="primary" text @click="deleteServiceUser()">
          <span>{{$t("general.remove")}}</span>
        </v-btn>
      </template>
    </template>
  
  </DialogBasic>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { KeyPairT, ServiceUserPermissionSetT } from '@/api/types';
  import DialogBasic from '@/components/dialogs/DialogBasic.vue';
  import ApiKeyActions from '../ApiKeyActions.vue';

  interface ServiceUserActionsModel {
    config: {
      icon?: string
      title?: string
    }
    permissionSet: ServiceUserPermissionSetT
    errorMessage: string
    dialog: boolean
    name: string
    valid: boolean
    options: string[]
    keyPairs: KeyPairT[]
    newPermissionSet: ServiceUserPermissionSetT
  }

  export default Vue.extend ({
    name: 'ServiceUserActions',

    components: {
    DialogBasic,
    ApiKeyActions
},

    props: {
      mode: {
        type: String, 
        required: true
      },
      containerID: {
        type: String,
        required: true
      },
      serviceUserID: {
        type: String,
        required: false
      },
      icon: {
        type: Boolean,
        required: false,
        default: true
      },
      maxWidth: {
        type: String, 
        required: false, 
        default: '60%'
      },
    },

    data: (): ServiceUserActionsModel => ({
      config: {},
      errorMessage: "",
      dialog: false,
      name: "",
      valid: false,
      options: ['read', 'write'],
      permissionSet: {
        containers: [],
        ontology: [],
        users: [],
        data: []
      },
      keyPairs: [],
      newPermissionSet: {
        containers: [],
        ontology: [],
        users: [],
        data: []
      }
    }),

    beforeMount() {
      switch(this.mode) {
        case 'create': {
          this.config.title = this.$t('serviceUsers.create') as string;
          this.config.icon = 'mdi-card-plus';
          break;
        }
        case 'edit': {
          this.config.title = this.$t('serviceUsers.managePermissions') as string;
          this.config.icon = 'mdi-pencil';
          break;
        }
        case 'delete': {
          this.config.title = this.$t('serviceUsers.delete') as string;
          this.config.icon = 'mdi-delete';
          break;
        }
        case 'apiKey': {
          this.config.icon = 'mdi-key';
          break;
        }
        default: {
          break;
        }
      }
    },

    methods: {
      createServiceUser() {
        this.$client.createServiceUser(this.containerID, {display_name: this.name})
            .then(result => {
              if(!result) {
                this.errorMessage = this.$t('errors.errorCommunicating') as string
              } else {
                this.$client.setServiceUsersPermissions(this.containerID, result.id, this.permissionSet)
                    .catch(e => {
                      this.errorMessage = e
                    })
                    .finally(() => {
                      this.closeDialog()
                      this.$emit('serviceUserCreated', result)
                      this.resetDialog()
                    })
              }
            })
            .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      },
      refreshPermissions() {
        this.$client.getServiceUsersPermissions(this.containerID, this.serviceUserID)
            .then(result => {
              Object.assign(this.newPermissionSet, result)
            })
            .catch(e => this.errorMessage = e)
      },
      savePermissions() {
        this.permissionSet = {
          containers: this.newPermissionSet.containers,
          data: this.newPermissionSet.data,
          users: this.newPermissionSet.users,
          ontology: this.newPermissionSet.ontology
        }
        this.$client.setServiceUsersPermissions(this.containerID, this.serviceUserID, this.permissionSet)
            .then(()=> {
              this.closeDialog()
              this.refreshPermissions()
            })
            .catch(e => this.errorMessage = e)
      },
      headers() {
        return [
          { text: this.$t('general.key'), value: 'key'},
          { text: this.$t('general.note'), value: 'note'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      refreshKeys() {
        this.$client.listKeyPairsForServiceUser(this.containerID, this.serviceUserID)
            .then(keys => {
              this.keyPairs = keys
            })
            .catch((e) => this.errorMessage = e)
      },
      deleteServiceUser() {
        this.$client.deleteServiceUser(this.containerID, this.serviceUserID)
          .then(() => {
            this.closeDialog()
            this.$emit('serviceUserDeleted')
          })
          .catch(e => this.errorMessage = e)
      },

      openDialog() {
        this.$nextTick(() => {
          this.resetDialog();
        })
      },
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) {
          dialogInstance.close();
        }
      },
      resetDialog() {
        this.errorMessage = "";
        this.name = "";

        if (this.mode === 'create') {
          this.permissionSet = {
            containers: [],
            ontology: [],
            users: [],
            data: []
          };
        }

        if (this.mode === 'edit') {
          this.refreshPermissions()
        }
      },
      validationRules(v: string) {
        return !!v || this.$t('validation.required')
      },
    },

    mounted() {
      if (this.mode !== 'create') {
        this.refreshKeys()
      }
    }
  })
</script>