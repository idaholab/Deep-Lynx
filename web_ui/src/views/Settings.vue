<template>
  <div>
    Coming Soon
  </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'
    import {KeyPairT} from "@/auth/types";

    @Component
    export default class Settings extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

    }
</script>
