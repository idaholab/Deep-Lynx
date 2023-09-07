<template>
  <v-snackbar
      v-model="alertFlag"
      multi-line
      timeout="-1"
      color="error"
  >
    <span v-if="Array.isArray(message)">
      <span v-for="item in message" :key="item.message">
        <span :style="`${item.format}`"> {{ item.message }} </span>
      </span>
    </span>

    <span v-else>
      {{ message }}
    </span>

    <template v-slot:action="{ attrs }">
      <v-btn
          color="white"
          v-bind="attrs"
          @click="closeAlert"
          elevation="2"
      >
        <span style="color: red">Close</span>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
   import {Component, Prop, Vue, Watch} from 'vue-property-decorator'

    @Component
    export default class ErrorBanner extends Vue {
        @Prop({required: true})
        readonly message!: string | {message: string, format: string}[]

        alertFlag = false

        @Watch('message', {immediate: true})
        onMessageChange() {
          (this.message === '' || this.message.length === 0) ? this.alertFlag = false : this.alertFlag = true;
        }

        closeAlert() {
          this.alertFlag = false
          this.$emit('closeAlert')
        }
    }
</script>
