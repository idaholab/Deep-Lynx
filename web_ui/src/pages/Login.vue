<template>
    <v-container fill-height fluid>
        <v-row align="center" justify="center">
            <v-col cols="12">
                <v-card elevation="5" class="login-dialog mx-auto d-flex">
                    <v-row align="stretch">
                        <v-col cols="5" class="py-0 pr-0">
                            <v-container class="pa-0 d-flex">
                                <div class="align-self-center ma-auto">
                                    <h1 class="login-title text-center white--text mb-5">Deep Lynx UI</h1>
                                    <v-img max-height="165" max-width="165" src="../assets/data-white.png"></v-img>
                                </div>
                            </v-container>
                        </v-col>
                        <v-col cols="7">
                            <v-container class="py-9 pl-6 pr-9">
                              <error-banner :message="errorMessage"></error-banner>
                              <v-container fill-height fluid>
                                <v-row align="center" justify="center">
                                  <div class="px-11">
                                    <v-btn large block class="px-8" color="primary" type="submit" :href="loginURL">
                                      <v-img max-height="40" max-width="40" src="../assets/data-white.png"></v-img>
                                      {{$t('login.deepLynx')}}
                                    </v-btn>
                                  </div>
                                </v-row>
                              </v-container>
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
    import Config from '@/config'
    import LanguageSelect from '@/components/languageSelect.vue'
    import buildURL from "build-url"

    @Component({components: {
            LanguageSelect,
        }})
    export default class Login extends Vue {
        errorMessage = ""


      get loginURL(): string {
          const code_challenge = btoa(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))
          const state = btoa(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))

        localStorage.setItem("state", state)
        localStorage.setItem("code_challenge", code_challenge)

        return buildURL(`${Config.deepLynxApiUri}/oauth/authorize`,
              {
               queryParams: {
                 response_type: "code",
                 client_id: Config.deepLynxAppID,
                 redirect_uri: `${Config.appUrl}`,
                 state,
                 scope: "all",
                 code_challenge,
                 code_challenge_method: "plain"
               }
              })
      }

      mounted() {
          if(this.$route.query.error) this.errorMessage = this.$route.query.error as string
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
