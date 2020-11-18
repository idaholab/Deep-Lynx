<template>
    <div>
        <v-data-table
                :headers="headers"
                :items="metatypeRelationships"
                class="elevation-1"
        >
            <template v-slot:top>
                <v-toolbar flat color="white">
                    <v-toolbar-title>Metatype Relationships</v-toolbar-title>
                    <v-divider
                            class="mx-4"
                            inset
                            vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                    <v-dialog v-model="dialog" max-width="500px">
                        <template v-slot:activator="{ on }">
                            <v-btn color="primary" dark class="mb-2" v-on="on">New Relationship</v-btn>
                        </template>
                        <v-card>
                            <v-card-title>
                                <span class="headline">{{$t("metatypeRelationships.formTitle")}}</span>
                            </v-card-title>

                            <v-card-text>
                                <v-container>
                                    <v-row>
                                        <v-col :cols="12">

                                            <v-form
                                                    ref="form"
                                                    v-model="valid"
                                                    lazy-validation
                                            >
                                                <v-text-field
                                                        v-model="name"
                                                        label="Name"
                                                        required
                                                ></v-text-field>
                                                <v-textarea
                                                    v-model="description"
                                                    label="Description"
                                                ></v-textarea>
                                            </v-form>
                                        </v-col>
                                    </v-row>
                                </v-container>
                            </v-card-text>

                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("home.cancel")}}</v-btn>
                                <v-btn color="blue darken-1" text @click="newMetatypeRelationship()">{{$t("home.save")}}</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                </v-toolbar>
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <v-icon
                        small
                        class="mr-2"
                        @click="enableMetatypeRelationshipEdit(item)"
                >
                    mdi-pencil
                </v-icon>
                <v-icon
                        small
                        @click="deleteRelationship(item)"
                >
                    mdi-delete
                </v-icon>
            </template>
        </v-data-table>
        <v-dialog v-model="editDialog" max-width="500px">

            <v-card>
                <v-card-title>
                    <span class="headline">Edit {{selectedRelationship.name}}</span>
                </v-card-title>

                <v-card-text>
                    <v-container>
                        <v-row>
                            <v-col :cols="12">

                                <v-form
                                        ref="form"
                                        v-model="valid"
                                        lazy-validation
                                >
                                    <v-text-field
                                            v-model="selectedRelationship.name"
                                            label="Name"
                                            required
                                    ></v-text-field>
                                    <v-textarea
                                            v-model="selectedRelationship.description"
                                            label="Description"
                                    ></v-textarea>

                                </v-form>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="blue darken-1" text @click="editDialog = false" >{{$t("home.cancel")}}</v-btn>
                    <v-btn color="blue darken-1" text @click="editMetatypeRelationship()">{{$t("home.save")}}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
    import { MetatypeRelationshipT } from '@/api/types';
    import {Component, Prop, Vue} from 'vue-property-decorator'

    @Component
    export default class MetatypeRelationships extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        dialog= false
        editDialog= false
        selectedAdapter = ""
        selectedAuthMethod = ""
        authMethods = ["basic", "token"]
        headers = [
            { text: "Name", value: 'name' },
            { text: "Description", value: 'description'},
            { text: 'Actions', value: 'actions', sortable: false }
        ]
        dataSources = [{
            name: "Aveva",
            adapter_type: "http",
            active: true
        }]
        adapterTypes = ["manual", "http"]
        valid = null
        metatypeRelationships: MetatypeRelationshipT[] = []
        selectedRelationship: MetatypeRelationshipT = {
            id: "",
            container_id: this.containerID,
            name: "",
            properties: [],
            description: "",
            created_at: "",
            modified_at: "",
            created_by: "",
            modified_by: ""
        }
        name = null
        description = null

         mounted() {
            this.refreshMetatypeRelationships()
        }
        
        refreshMetatypeRelationships() {
            this.$client.listMetatypeRelationships(this.containerID, 1000, 0)
            .then(metatypeRelationships => {
                this.metatypeRelationships = metatypeRelationships
            })
            .catch(e => console.log(e))
        }

        selectAdapter(adapter: string) {
            this.selectedAdapter = adapter
        }

        selectAuthMethod(authMethod: string) {
            this.selectedAuthMethod = authMethod
        }

        newMetatypeRelationship() {
            this.$client.createMetatypeRelationship(this.containerID, {"name": this.name, "description": this.description})
            this.refreshMetatypeRelationships()
            this.dialog = false
            this.name = null
            this.description = null
        }

        enableMetatypeRelationshipEdit(item: any) {
            this.editDialog = true
            this.selectedRelationship = item
        }

        editMetatypeRelationship() {
            this.$client.updateMetatypeRelationship(this.containerID, this.selectedRelationship.id, 
                {"name": this.selectedRelationship.name, "description": this.selectedRelationship.description})
            this.editDialog = false
        }

        deleteRelationship(item: any) {
            this.$client.deleteMetatypeRelationship(this.containerID, item.id)
            .then(() => {
                this.refreshMetatypeRelationships()
            })
            .catch(e => console.log(e))
        }
    }
</script>
