<template>
    <v-alert v-if="message !== ''" type="error" dismissible>
        {{message}}
    </v-alert>
</template>

<script lang="ts">
   import {Component, Prop, Vue} from 'vue-property-decorator'

    @Component
    export default class ErrorBanner extends Vue {
       @Prop({required: true})
       readonly message!: string
    }
</script>
