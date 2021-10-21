<template>
    <v-tooltip top>
        <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on">{{info}}</v-icon>
        </template>
        <span>{{message}}</span>
    </v-tooltip>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'
    import {mdiInformation} from "@mdi/js"

    @Component
    export default class InfoTooltip extends Vue {
        @Prop({required: true})
        readonly message!: string

        info = mdiInformation
    }
</script>
