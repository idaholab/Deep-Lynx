<template>
    <el-row>
        Taxonomy Import Stub
    </el-row>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'

    @Component
    export default class TaxonomyImport extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

    }
</script>
