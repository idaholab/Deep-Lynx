<template> <v-container fill-height fluid> <v-row align="center" justify="center"> <v-col cols="12">
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

              <v-container class="py-9 pl-6 pr-9" v-if="$auth.IsLoggedIn()">
                <h2 class="text-h2 text-center">{{$t('containers.leaveConfirmation')}}</h2>
                <p>{{$t("containers.leaveDescription")}}</p>
                <v-btn large block @click="leaveContainer(user?.id)" style="margin-top: 25px" >{{$t('containers.leaveContainer')}}</v-btn>

              </v-container>

              <v-container class="py-9 pl-6 pr-9" v-if="!$auth.IsLoggedIn()">
                <h2 class="text-h2 text-center">{{$t('containers.loginToAccept')}}</h2>
                <v-btn large block @click="home" style="margin-top: 25px" >{{$t('general.returnToLogin')}}</v-btn>
              </v-container>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { UserT } from "@/auth/types";

  interface LeaveModel {
	user: UserT | null;
	successMessage: string;
	errorMessage: string;
  }

  export default Vue.extend ({
    name: 'ViewContainerLeave',

    props: {
      containerID: {
        type: String,
        required: true,
	default: undefined,
      },
    },

    data: (): LeaveModel => ({
	user: null,
        successMessage: "",
        errorMessage: "",
    }),

    methods: {
      home() {
        this.$router.push({name: 'Login'})
      },
      containerSelect() {
        this.$router.push({name: 'ContainerSelect'})
      },
      leaveContainer(userID: string) {
        this.$client.removeSelfUserRoles(this.containerID, userID)
            .then(() => {
		this.$router.push({ name: "ContainerSelect" });
            })
            .catch(e => this.errorMessage = e)
      }
    },

    mounted() {
    	this.user = this.$auth.CurrentUser();
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
            background-color: $primary;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
        }
    }
}
</style>
