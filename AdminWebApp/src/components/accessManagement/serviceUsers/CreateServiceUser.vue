<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("serviceUsers.create")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('serviceUsers.create')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('serviceUsers.createDescription')}}</p>

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-text-field
                  v-model="name"
                  :rules="validationRules"
                  required
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>


              <span class="headline text-h4">{{$t('users.permissions')}}</span>
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
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false; reset()" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="createServiceUser()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ServiceUserPermissionSetT} from "@/api/types";

  interface CreateServiceUserModel {
    permissionSet: ServiceUserPermissionSetT
    errorMessage: string
    dialog: boolean
    name: string
    valid: boolean
    options: string[]
  }

  export default Vue.extend ({
    name: 'CreateServiceUser',

    props: {
      containerID: {
        type: String,
        required: true
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): CreateServiceUserModel => ({
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
    }),

    methods: {
      createServiceUser() {
        this.$client.createServiceUser(this.containerID, {display_name: this.name})
            .then(result => {
              if(!result) {
                this.errorMessage = this.$t('errors.errorCommunicating') as string
              } else {
                this.$client.setServiceUsersPermissions(this.containerID, result.id, this.permissionSet)
                    .then(()=> {
                      this.dialog = false
                    })
                    .catch(e => {
                      this.errorMessage = e
                    })
                    .finally(() => {
                      this.dialog = false
                      this.$emit('serviceUserCreated', result)
                      this.reset()
                    })
              }
            })
            .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      },

      reset() {
        this.name = ""
      },

      validationRules(v: string) {
        return !!v || this.$t('validation.required')
      }
    }
  });
</script>
