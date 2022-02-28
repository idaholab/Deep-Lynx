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
              <v-container class="py-9 pl-6 pr-9 d-flex">
                <div class="align-self-center ma-auto">
                  <h2 class="text-h2 text-center mb-4">{{$t('containerSelect.container')}}</h2>
                  <error-banner :message="errorMessage"></error-banner>
                  <p>{{$t('containerSelect.choose')}}</p>
                  <v-form>
                    <container-select @containerSelected="containerSelected"></container-select>
                  </v-form>
                  <v-row v-if="outstandingInvites.length > 0" class="my-8 mx-0" align="center">
                    <v-divider></v-divider>
                    <span class="px-2">{{$t('containerSelect.or')}}</span>
                    <v-divider></v-divider>
                  </v-row>
                  <p v-if="outstandingInvites.length > 0 ">{{$t('containerSelect.acceptInviteLong')}}</p>
                  <v-row class="px-11 mt-4">
                    <div v-for="invite in outstandingInvites" v-bind:key="invite.id">
                      <v-row>
                        <v-col :cols="8">{{invite.container_name}}</v-col>
                        <v-col :cols="4"><v-btn @click="acceptInvite(invite.token, invite.container_name)">{{$t('containerSelect.acceptInvite')}}</v-btn></v-col>
                      </v-row>
                    </div>
                  </v-row>

                  <v-row class="my-8 mx-0" align="center">
                    <v-divider></v-divider>
                    <span class="px-2">or</span>
                    <v-divider></v-divider>
                  </v-row>
                  <v-row class="px-11 mt-4" align="center" justify="center">
                    <create-container-dialog @containerCreated="newContainer"></create-container-dialog>
                  </v-row>

                  <logout></logout>

                  <br>
                    <p>{{$t('containerSelect.needHelp')}} <a :href="helpLink()">{{$t('containerSelect.wiki')}}</a> </p>
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
        <span class="text-h6">&copy; 2021 Idaho National Laboratory</span>
      </v-col>
      <v-col :cols="2" :offset="8" class="pa-0">
        <language-select class="mb-1"></language-select>
      </v-col>
    </v-footer>
  </v-container>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import LanguageSelect from '@/components/languageSelect.vue'
import {ContainerT, UserContainerInviteT} from "@/api/types";
import ContainerSelect from "@/components/containerSelect.vue"
import CreateContainerDialog from "@/components/createContainerDialog.vue";
import Logout from "@/components/logout.vue";
import {RefreshPermissions} from "@/auth/authentication_service";

@Component({components: {
    LanguageSelect,
    ContainerSelect,
    CreateContainerDialog,
    Logout
  }})
export default class ContainerSelection extends Vue {
  errorMessage = ""
  selectedContainer: ContainerT | null = null
  outstandingInvites: UserContainerInviteT[] = []

  mounted() {
    this.$client.listOutstandingContainerInvites()
        .then(invites => {
          this.outstandingInvites = invites
        })
        .catch(e => this.errorMessage = e)
  }

  containerSelected(container: ContainerT) {
    this.selectedContainer = container
    this.$store.commit('setActiveContainer', container)
    this.$store.commit('setEditMode', false)
    this.$store.commit('setPendingOntologyVersion', undefined)

    if(this.$store.getters.ontologyVersioningEnabled) {
      this.$client.listOntologyVersions(container.id, {status: 'published'})
          .then((results) => {
            if(results.length > 0) {
              this.$store.dispatch('changeOntologyVersion', results[0])
            }
          })
          .catch((e: any) =>  this.errorMessage = e)
    }

    this.toContainerHome()
  }

  toContainerHome() {
    // @ts-ignore
    RefreshPermissions()
    .then(() => {
      this.$router.push({name: 'Home', params: {containerID: this.selectedContainer?.id!}})
    })
    .catch(e => this.errorMessage = e)
  }

  newContainer(containerID: string) {
    RefreshPermissions()
        .then(() => {
          this.$router.push({name: 'Home', params: {containerID: containerID}})
        })
        .catch(e => this.errorMessage = e)
  }

  acceptInvite(token: string, containerName: string) {
    RefreshPermissions()
        .then(() => {
          this.$router.push({name: 'ContainerInvite', query: {token, containerName}})
        })
        .catch(e => this.errorMessage = e)
  }

  helpLink() {
    return this.$t('containerSelect.wikiLink')
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
