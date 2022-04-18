<template>
  <v-dialog v-model="dialog" max-width="500px" @click:outside="clearNew">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("containerInvite.button")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("containerInvite.formTitle")}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
              ref="form"
              lazy-validation
              v-model="formValid"
            >
              <v-text-field
                v-model="email"
                :label="$t('containerInvite.email')"
                :rules="emailRules()"
                required
              ></v-text-field>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="clearNew" >{{$t("containerInvite.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="sendInvite" :disabled="!formValid || email === ''" ><span v-if="!loading">{{$t("containerInvite.sendInvite")}}</span><v-progress-circular indeterminate v-if="loading"></v-progress-circular> </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

    @Component
    export default class InviteUserToContainerDialog extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        errorMessage = ""
        dialog = false
        formValid = false
        loading = false
        email = ""

        clearNew() {
            this.email = ""
            this.dialog = false
        }

        sendInvite() {
          this.loading = true
            this.$client.inviteUserToContainer(this.containerID, this.email)
                .then(() => {
                    this.loading = false
                    this.clearNew()
                    this.$emit("userInvited")

                    this.dialog = false
                    this.errorMessage = ""
                })
                .catch(e => {
                  this.errorMessage = e
                  this.loading = false
                })


        }

      emailRules() {
        return [
          (v: any) => !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) || this.$t('resetPassword.validEmail')
        ]
      }
    }
</script>
