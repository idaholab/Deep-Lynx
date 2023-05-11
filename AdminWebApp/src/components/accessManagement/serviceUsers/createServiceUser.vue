<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("createServiceUser.createServiceUser")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('createServiceUser.createTitle')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('createServiceUser.description')}}</p>

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-text-field
                  v-model="name"
                  :rules="[v => !!v || $t('createServiceUser.nameMissing')]"
                  required
              >
                <template v-slot:label>{{$t('createServiceUser.name')}} <small style="color:red" >*</small></template>
              </v-text-field>


              <span class="headline text-h4">{{$t('createServiceUser.permissions')}}</span>
              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.containersDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.containers"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.containers')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.ontologyDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.ontology"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.ontology')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.dataDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.data"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.data')}}</template>
              </v-select>

              <p style="margin-bottom: 0px">{{$t('serviceUserPermissions.usersDescription')}}</p>
              <v-select
                  :items="options"
                  v-model="permissionSet.users"
                  multiple
                  style="margin-top: 0px"
              >
                <template v-slot:label>{{$t('serviceUserPermissions.users')}}</template>
              </v-select>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('createServiceUser.requiredField')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false; reset()" >{{$t("createServiceUser.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="createServiceUser()">{{$t("createServiceUser.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {ServiceUserPermissionSetT} from "@/api/types";

@Component
export default class CreateServiceUser extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  name = ""
  valid = false
  options = ['read', 'write']
  permissionSet: ServiceUserPermissionSetT = {
    containers: [],
    ontology: [],
    users: [],
    data: []
  }

  createServiceUser() {
    this.$client.createServiceUser(this.containerID, {display_name: this.name})
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('createServiceUser.errorCreatingAPI') as string
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
        .catch(e => this.errorMessage = this.$t('createServiceUser.errorCreatingAPI') as string + e)
  }

  reset() {
    this.name = ""
  }

}

</script>
