<template>
    <v-alert v-if="internalMessage !== ''" type="success">
        {{message}}
    </v-alert>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'

    @Component
    export default class SuccessBanner extends Vue {
       @Prop({required: true})
       message!: string

       internalMessage = ""

      @Watch('message', {immediate: true})
      onMessageChange() {
         // we do this so the message disappears eventually
         this.internalMessage = this.message
        setTimeout(() => {this.internalMessage = ""}, 5000)
      }
    }
</script>
