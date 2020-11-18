<template>
    <v-dialog v-model="dialog" max-width="500px" @click:outside="clearNew">
        <template v-slot:activator="{ on }">
            <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("containers.newContainer")}}</v-btn>
        </template>
        <v-card>
            <v-card-title>
                <span class="headline">{{$t("containers.formTitle")}}</span>
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
                                <v-text-field
                                        v-model="newContainer.name"
                                        :label="$t('containers.name')"
                                        required
                                ></v-text-field>
                                <v-textarea
                                        :rows="2"
                                        v-model="newContainer.description"
                                        :label="$t('containers.description')"
                                        required
                                ></v-textarea>
                            </v-form>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="clearNew" >{{$t("home.cancel")}}</v-btn>
                <v-btn color="blue darken-1" text @click="createContainer" >{{$t("home.save")}}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
   import {Component, Vue} from 'vue-property-decorator'

    @Component
    export default class NewContainerDialog extends Vue {
        errorMessage = ""
        dialog = false
        newContainer = {name: null, description:null}

        clearNew() {
            this.newContainer = {name: null, description: null}
            this.dialog = false
        }

        createContainer() {
            this.$client.createContainer(this.newContainer)
                .then((container) => {
                    this.clearNew()
                    this.$emit("containerCreated", container)

                    this.dialog = false
                    this.errorMessage = ""
                })
                .catch(e => this.errorMessage = e)

        }
    }
</script>
