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
      <template v-if="mode === 'create'">
        <v-alert type="success" v-if="returnedKey" class="multi-line">
          <p>{{$t('apiKeys.success')}}</p>
          <p><strong>{{$t('general.key')}}</strong></p>
          <p>{{returnedKey.key}}</p>
          <p><strong>{{$t('general.secret')}}</strong></p>
          <p>{{returnedKey.secret_raw}}</p>
        </v-alert>
        <v-row>
          <v-col :cols="12" v-if="serviceUserID === null">
          <p>{{$t('apiKeys.userKey')}}</p>
          </v-col>
          <v-col :cols="12" v-else>
            <p>{{$t('apiKeys.serviceKey')}}</p>
          </v-col>
        </v-row>
        <v-row v-if="returnedKey === null" :style="{ padding: '15px' }">
          <v-text-field :label="$t('general.note')" v-model="note"></v-text-field>
        </v-row>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
              <v-alert type="warning">
                {{$t('warnings.deleteApiKey')}}
              </v-alert>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <template v-if="mode === 'create'">
        <div v-if="returnedKey === null">
          <v-btn  color="primary" text @click="generateApiKey">{{$t("general.create")}}</v-btn>
        </div>
      </template>

      <template v-if="mode === 'delete'">
        <v-btn color="primary" text @click="deleteApiKey">
          <span>{{$t("general.delete")}}</span>
        </v-btn>
      </template>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import {KeyPairT} from "@/api/types";

  interface ApiKeyActionsModel {
    config: {
      icon?: string
      title?: string
    }
    errorMessage: string
    returnedKey: KeyPairT | null
    note: string
  }

  export default Vue.extend ({
    name: 'ApiKeyActions',

    components: { DialogBasic },
    
    props: {
      mode: {type: String, required: true},
      icon: {type: Boolean, required: false, default: true},
      containerID: {type: String, required: false},
      maxWidth: {type: String, required: false, default: '80%'},
      serviceUserID: {type: String, required: false},
      keyPair: {type: Object as PropType<KeyPairT>, required: false}
    },

    data: (): ApiKeyActionsModel => ({
      config: {},
      errorMessage: "",
      returnedKey: null,
      note: "",
    }),

    beforeMount() {
      switch(this.mode) {
        case 'create': {
          this.config.title = this.$t('apiKeys.create') as string;
          break;
        }
        case 'delete': {
          this.config.title = this.$t('apiKeys.delete') as string;
          this.config.icon = 'mdi-delete';
          break;
        }
        default: {
          break;
        }
      }
    },

    methods: {
      generateApiKey() {
        if(this.serviceUserID) {
          this.$client.generateKeyPairForServiceUser(this.containerID!, this.serviceUserID, this.note)
              .then(key => {
                this.returnedKey = key
                this.$emit('apiKeyCreated')
              })
              .catch((e) => this.errorMessage = e)
        } else {
          this.$client.generateKeyPairForUser(this.note)
              .then(key => {
                this.returnedKey = key
                this.$emit('apiKeyCreated')
              })
              .catch((e) => this.errorMessage = e)
        }
      },
      deleteApiKey() {
        if(this.serviceUserID) {
          this.$client.deleteKeyPairForServiceUser(this.containerID!, this.serviceUserID, this.keyPair.key)
              .then(() => {
                this.closeDialog()
                this.$emit('apiKeyDeleted')
              })
              .catch(e => this.errorMessage = e)
        } else {
          this.$client.deleteKeyPairForUser(this.keyPair.key)
              .then(() => {
                this.closeDialog()
                this.$emit('apiKeyDeleted')
              })
              .catch(e => this.errorMessage = e)
        }
      },
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) {
          dialogInstance.close();
        }
      },
      openDialog() {
        this.$nextTick(() => {
          this.resetDialog();
        })
      },
      resetDialog() {
        if (this.returnedKey !== null) {
          this.returnedKey = null
          this.note = ""
        }
      }
    }
  })

</script>