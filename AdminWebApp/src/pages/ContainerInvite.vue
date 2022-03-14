<template>
    <v-container fill-height fluid>
        <v-row align="center" justify="center">
            <v-col cols="12">
                <v-card elevation="5" class="login-dialog mx-auto d-flex">
                    <v-row align="stretch">
                        <v-col cols="5" class="py-0 pr-0">
                            <v-container class="pa-0 d-flex">
                                <div class="align-self-center ma-auto">
                                    <h1 class="login-title text-center white--text mb-5">Deep Lynx</h1>
                                    <v-img max-height="165" max-width="165" src="../assets/data-white.png"></v-img>
                                </div>
                            </v-container>
                        </v-col>
                        <v-col cols="7">
                          <v-container class="py-9 pl-6 pr-9" v-if="$auth.IsLoggedIn() && !inviteSuccessful">
                            <h2 class="text-h2 text-center">{{$t('containerInvite.acceptTitle')}} {{$route.query.containerName}}</h2>
                            <p>{{$t("containerInvite.acceptDescription")}} {{$route.query.containerName}}</p>
                            <error-banner :message="errorMessage"></error-banner>
                            <success-banner :message="successMessage"></success-banner>
                            <div v-if="successful">
                              <p>{{$t('containerInvite.successful')}}</p>
                              <v-btn large block @click="home" style="margin-top: 25px" >{{$t('containerInvite.containerSelect')}}</v-btn>
                            </div>
                            <v-btn large block color="primary" @click="acceptInvite" ><span v-if="!loading">{{$t('containerInvite.acceptInvite')}}</span> <v-progress-circular indeterminate v-if="loading"></v-progress-circular> </v-btn>

                          </v-container>

                          <v-container class="py-9 pl-6 pr-9" v-if="inviteSuccessful">
                            <h2 class="text-h2 text-center">{{$t('containerInvite.inviteSuccessful')}}</h2>
                            <p>{{$t("containerInvite.inviteSuccessfulDescription")}}</p>
                            <error-banner :message="errorMessage"></error-banner>
                            <success-banner :message="successMessage"></success-banner>
                            <v-btn large block @click="containerSelect" style="margin-top: 25px" >{{$t('containerInvite.containerSelect')}}</v-btn>

                          </v-container>
                          <v-container class="py-9 pl-6 pr-9" v-if="!$auth.IsLoggedIn()">
                            <h2 class="text-h2 text-center">{{$t('containerInvite.loginToAccept')}}</h2>
                            <v-btn large block @click="home" style="margin-top: 25px" >{{$t('register.home')}}</v-btn>
                          </v-container>
                        </v-col>
                    </v-row>
                </v-card>
            </v-col>
        </v-row>


        <v-footer
                app
        >
            <v-col :cols="2" class="pa-0">
                <span class="text-h6">&copy; 2019</span>
            </v-col>
            <v-col :cols="2" :offset="8" class="pa-0">
                <language-select class="mb-1"></language-select>
            </v-col>
        </v-footer>
    </v-container>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator'
    import LanguageSelect from '@/components/general/languageSelect.vue'

    @Component({components: {
            LanguageSelect,
        }})
    export default class ContainerInvite extends Vue {
      successMessage = ""
      password = ""
      errorMessage = ""
      formValid = false
      inviteSuccessful = false
      successful = false
      show1 = false
      expired = false
      loading = false
      email = ""
      name = ""

      emailRules() {
        return [
          (v: any) => !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) || this.$t('resetPassword.validEmail')
        ]
      }

      home() {
        this.$router.push({name: 'Login'})
      }

      containerSelect() {
        this.$router.push({name: 'ContainerSelect'})
      }

      acceptInvite() {
        this.loading = true

        this.$client.acceptContainerInvite(this.$route.query.token as string)
        .then(() => {
          this.loading = false
          this.inviteSuccessful = true
        })
        .catch((e: any) => {
          this.errorMessage = e
          this.loading = false
        })
      }
    }
</script>

<style lang="scss" scoped>
.login-title {
    font-size: 1.75rem;
    font-weight: 500;
}

.login-dialog {
    max-width: 830px;
    min-width: 360px;
    min-height: 512px;

    .row > .col {
        .container {
            height: 100%;
        }

        &:first-child .container {
            background-color: $secondary;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
        }
    }
}
</style>
