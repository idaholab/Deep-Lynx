<template>
    <v-alert v-if="internalMessage !== ''" type="success">
        {{message}}
    </v-alert>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'

  export default Vue.extend ({
    name: 'SuccessBanner',

    props: {
      message: {required: true, type: String},
      timeout: {required: false, default: 5000, type: Number},
    },

    data: () => ({
      internalMessage: ""
    }),

    methods: {
      onMessageChange() {
        // we do this so the message disappears eventually
        this.internalMessage = this.message
       setTimeout(() => {this.internalMessage = ""}, this.timeout)
      }
    },

    watch: {
      message: {
        immediate: true,
        handler: 'onMessageChange'
      }
    }
  })
</script>
