<template>
    <v-alert :icon=false v-model="alertFlag" v-if="message !== ''" type="error" dismissible>
        {{message}}
    </v-alert>
</template>

<script lang="ts">
   import {Component, Prop, Vue, Watch} from 'vue-property-decorator'

    @Component
    export default class ErrorBanner extends Vue {
        @Prop({required: true})
        readonly message!: string

        alertFlag = false

        @Watch('message', {immediate: true})
        onMessageChange() {
            this.alertFlag = true
        }
    }
</script>
