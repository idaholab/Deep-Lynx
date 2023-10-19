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
  import Vue from 'vue'

  interface MessageItem {
    message: string;
    format: string;
  }

  export default Vue.extend ({
    name: 'ErrorBanner',

    props: {
      message: {
        required: true,
        type: [String, Array] as unknown as () => string | MessageItem[]
      }
    },

    data: () => ({
      alertFlag: false
    }),

    methods: {
      onMessageChange() {
        if (typeof this.message === 'string') {
          this.alertFlag = this.message.length > 0;
        } else if (Array.isArray(this.message)) {
          this.alertFlag = this.message.length > 0;
        }
      },
      closeAlert() {
        this.alertFlag = false
        this.$emit('closeAlert')
      }
    },

    watch: {
      message: {
        immediate: true,
        handler: 'onMessageChange'
      }
    }
  });
</script>
