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
            </v-form>
            <p><span style="color:red">*</span> = {{$t('createServiceUser.requiredField')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false; reset()" >{{$t("createServiceUser.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="createServiceUser()">{{$t("createServiceUser.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

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

  createServiceUser() {
    this.$client.createServiceUser(this.containerID, {display_name: this.name})
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('createServiceUser.errorCreatingAPI') as string
          } else {
            this.dialog = false
            this.$emit('serviceUserCreated', result)
            this.reset()
          }
        })
        .catch(e => this.errorMessage = this.$t('createServiceUser.errorCreatingAPI') as string + e)
  }

  reset() {
    this.name = ""
  }

}

</script>
