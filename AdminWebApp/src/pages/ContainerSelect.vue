<template>
  <v-container fill-height fluid>
    <v-row align="center" justify="center">
      <v-col cols="12">
        <v-card elevation="5" class="login-dialog mx-auto d-flex">
          <v-row align="stretch">
            <v-col cols="5" class="pr-0">
              <v-container class="pa-0 d-flex">
                <div class="align-self-center ma-auto">
                  <v-img max-height="250" max-width="250" src="../assets/lynx-white.png"></v-img>
                </div>
              </v-container>
            </v-col>
            <v-col cols="7">
              <v-container class="py-9 pl-6 pr-9 d-flex">
                <div class="align-self-center ma-auto">
                  <h2 class="text-h2 text-center mb-4">{{$t('general.welcome')}}</h2>
                  <error-banner :message="errorMessage"></error-banner>
                  <p>{{$t('help.chooseContainer')}}</p>
                  <v-form>
                    <container-select @containerSelected="containerSelected"></container-select>
                  </v-form>
                  <v-row v-if="outstandingInvites.length > 0" class="my-8 mx-0" align="center">
                    <v-divider></v-divider>
                    <span class="px-2">{{$t('general.or')}}</span>
                    <v-divider></v-divider>
                  </v-row>
                  <p v-if="outstandingInvites.length > 0 ">{{$t('containers.acceptInviteLong')}}</p>
                  <div v-for="invite in outstandingInvites" v-bind:key="invite.id">
                    <v-row class="px-11 mt-4">
                      <v-col :cols="8">{{invite.container_name}}</v-col>
                      <v-col :cols="4"><v-btn @click="acceptInvite(invite.token, invite.container_name)">{{$t('containers.acceptInvite')}}</v-btn></v-col>
                    </v-row>
                  </div>



                  <v-row class="my-8 mx-0" align="center">
                    <v-divider></v-divider>
                    <span class="px-2">or</span>
                    <v-divider></v-divider>
                  </v-row>
                  <v-row class="px-11 mt-4" align="center" justify="center">
                    <create-container-dialog @containerCreated="newContainer" @error="onError"></create-container-dialog>
                  </v-row>


                  <br>
                  <p>{{$t('help.needHelp')}} <a :href="helpLink()">{{$t('general.wiki')}}</a> </p>
                  <p style="margin-top: 10px">{{$t('help.foundBugs')}} <a :href="email()">{{$t('help.tellUs')}}</a> </p>

                  <v-row>
                    <logout></logout>
                  </v-row>

                </div>


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
        <span class="d-block text-h6">&copy; {{ new Date().getFullYear() }} {{$t('general.inl')}}</span>
      </v-col>
      <v-col :cols="2" :offset="8" class="pa-0">
        <language-select class="mb-1"></language-select>
      </v-col>
    </v-footer>
  </v-container>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import LanguageSelect from '@/components/general/languageSelect.vue'
  import {ContainerT, UserContainerInviteT} from "@/api/types";
  import ContainerSelect from "@/components/ontology/containers/containerSelect.vue"
  import CreateContainerDialog from "@/components/ontology/containers/createContainerDialog.vue";
  import Logout from "@/components/accessManagement/logout.vue";
  import {RefreshPermissions} from "@/auth/authentication_service";

  interface ContainerSelectionModel {
    errorMessage: string
    selectedContainer: ContainerT | null
    outstandingInvites: UserContainerInviteT[]
  }

  export default Vue.extend ({
    name: 'ContainerSelection',

    components: { LanguageSelect, ContainerSelect, CreateContainerDialog, Logout },

    data: (): ContainerSelectionModel => ({
      errorMessage: "",
      selectedContainer: null,
      outstandingInvites: []
    }),

    methods: {
      containerSelected(container: ContainerT) {
        this.selectedContainer = container
        this.$store.commit('setActiveContainer', container)
        this.$store.commit('setEditMode', false)

        this.toContainerHome()
      },
      toContainerHome() {
        this.$store.commit('setEditMode', false)

        // @ts-ignore
        RefreshPermissions()
            .then(() => {
              this.$router.push({name: 'Home', params: {containerID: this.selectedContainer?.id!}})
            })
            .catch(e => this.errorMessage = e)
      },
      newContainer(containerID: string) {
        this.$store.commit('setEditMode', false)

        RefreshPermissions()
            .then(() => {
              this.$router.push({name: 'Home', params: {containerID: containerID}})
            })
            .catch(e => this.errorMessage = e)
      },
      onError(error: string) {
        this.errorMessage = error
      },
      acceptInvite(token: string, containerName: string) {
        this.$store.commit('setEditMode', false)

        RefreshPermissions()
            .then(() => {
              this.$router.push({name: 'ContainerInvite', query: {token, containerName}})
            })
            .catch(e => this.errorMessage = e)
      },

      helpLink() {
        // Use the $t function to get the translated value
        const translatedLink = this.$t('links.wiki');
        
        // Ensure it's a string before returning
        if (typeof translatedLink === 'string') {
          return translatedLink;
        }
        
        // Return a default value or handle the error as per requirements
        return '';
      },
      email() {
        // Use the $t function to get the translated value
        const translatedLink = this.$t('links.email');
        
        // Ensure it's a string before returning
        if (typeof translatedLink === 'string') {
          return translatedLink;
        }
        
        // Return a default value or handle the error as per requirements
        return '';
      }
    },

    mounted() {
      this.$client.listOutstandingContainerInvites()
          .then(invites => {
            this.outstandingInvites = invites
          })
          .catch(e => this.errorMessage = e)
    }
  })
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
