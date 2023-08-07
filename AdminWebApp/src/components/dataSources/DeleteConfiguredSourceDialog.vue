<template>
  <v-dialog v-model="dialog" @click:outside="reset()" max-width="60%">
    <template v-slot:activator="{on}">
      <v-icon small class="mr-2" v-on="on" @click="dialog = true">mdi-delete</v-icon>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('dataSources.deleteConfigured')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">{{$t('dataSources.deleteConfiguredConfirm')}}</v-alert>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t('general.cancel')}}</v-btn>
        <v-btn color="error" text @click="deleteConfig()">{{$t('general.delete')}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue';

  interface DeleteConfiguredSourceDialogModel {
    errorMessage: string
    dialog: boolean
  }

  export default Vue.extend ({
    name: 'DeleteConfiguredSourceDialog',

    props: {
      configID: {type: String, required: true},
    },

    data: (): DeleteConfiguredSourceDialogModel => ({
      errorMessage: "",
      dialog: false
    }),

    methods: {
      deleteConfig() {
        this.$emit('delete', this.configID)
        this.reset()
      },
      reset() {
        this.dialog = false
        this.errorMessage = ""
      }
    }
  });
</script>
