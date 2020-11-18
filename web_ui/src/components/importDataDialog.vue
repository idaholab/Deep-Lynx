<template>
    <v-dialog v-model="dialog" max-width="500px">
        <template v-slot:activator="{ on }">
            <v-btn color="primary" dark class="mb-2" v-on="on">Import Data</v-btn>
        </template>
        <v-card>
            <v-card-title>
                <span class="headline">Import JSON Data</span>
            </v-card-title>

            <v-card-text>
                <error-banner :message="errorMessage"></error-banner>
                <v-container>
                    <v-row>
                        <v-col :cols="12">

                            <v-form
                                    ref="form"
                                    lazy-validation
                            >

                                <v-file-input label=".json File" @change="addFiles"></v-file-input>

                            </v-form>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="clear" >{{$t("home.cancel")}}</v-btn>
                <v-btn color="blue darken-1" text @click="uploadImport" >{{$t("home.create")}}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'

    @Component
    export default class NewDataSourceDialog extends Vue {
        @Prop({required: true})
        readonly dataSourceID!: string
        readonly containerID!: string

        errorMessage = ""
        dialog = false
        filesToUpload: File | null = null

        addFiles(files: File) {
            this.filesToUpload = files
        }

        clear() {
            this.dialog = false
            this.errorMessage = ""
        }

        uploadImport() {
            if(this.filesToUpload) {
                this.$client.dataSourceJSONFileImport(this.containerID, this.dataSourceID, this.filesToUpload)
                    .then(() => {
                        this.dialog = false
                        this.errorMessage = ""

                        this.$emit('importUploaded')
                    })
                    .catch(e => this.errorMessage = e)
            }
        }
    }
</script>
