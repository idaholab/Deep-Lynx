<template>
    <div>
        <v-data-table
                :headers="headers"
                :items="metatypes"
                :search="search"
                class="elevation-1"
        >

            <template v-slot:top>
                <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t("metatypes.metatypes")}}</v-toolbar-title>
                    <v-divider
                            class="mx-4"
                            inset
                            vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                    <v-dialog v-model="dialog" max-width="500px">
                        <template v-slot:activator="{ on }">
                            <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("metatypes.formTitle")}}</v-btn>
                        </template>
                        <v-card>
                            <v-card-title>
                                <span class="headline">{{$t("metatypes.formTitle")}}</span>
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
                                <v-btn color="blue darken-1" text @click="newMetatype()">{{$t("home.save")}}</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                </v-toolbar>
                    <v-text-field v-model="search" label="Search" class="mx-4"></v-text-field>
                    <v-switch @change="toggleFilter()" v-model="descriptionFilter">
                        <template v-slot:label v-if="descriptionFilter">
                            Search on Name and Description
                        </template>
                        <template v-slot:label v-else>
                            Search on Name Only
                        </template>
                    </v-switch>
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <v-icon
                        small
                        class="mr-2"
                        @click="enableMetatypeEdit(item)"
                >
                    mdi-pencil
                </v-icon>
                <v-icon
                        small
                        @click="deleteMetatype(item)"
                >
                    mdi-delete
                </v-icon>
            </template>
        </v-data-table>
        <v-dialog v-model="editDialog" max-width="500px">

            <v-card>
                <v-card-title>
                    <span class="headline">Edit {{selectedMetatype.name}}</span>
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
                                            v-model="selectedMetatype.name"
                                            label="Name"
                                            required
                                    ></v-text-field>
                                    <v-textarea
                                            v-model="selectedMetatype.description"
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
                    <v-btn color="blue darken-1" text @click="editMetatype()">{{$t("home.save")}}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'
    import { MetatypeT } from '@/api/types';

    @Component
    export default class Metatypes extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        dialog= false
        editDialog= false
        search = null
        descriptionFilter = true
        headers = [
            { text: "Name", value: 'name' },
            { text: "Description", value: 'description', filterable: this.descriptionFilter},
            { text: 'Actions', value: 'actions', sortable: false }
        ]
        metatypes: MetatypeT[] = []
        selectedMetatype: MetatypeT = {
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
        valid = null
        name = null
        description = null

        mounted() {
            this.refreshMetatypes()
        }
        
        refreshMetatypes() {
            this.$client.listMetatypes(this.containerID, {"limit": 1000, "offset": 0})
            .then(metatypes => {
                this.metatypes = metatypes
            })
            .catch(e => console.log(e))
        }

        toggleFilter() {
            this.headers[1].filterable = this.descriptionFilter
        }

        newMetatype() {
            this.$client.createMetatype(this.containerID, {"name": this.name, "description": this.description})
            this.dialog = false
            this.name = null
            this.description = null
            this.refreshMetatypes()
        }

        enableMetatypeEdit(item: any) {
            this.editDialog = true
            this.selectedMetatype = item
        }

        editMetatype() {
            this.$client.updateMetatype(this.containerID, this.selectedMetatype.id, 
                {"name": this.selectedMetatype.name, "description": this.selectedMetatype.description})
            this.editDialog = false
        }

        deleteMetatype(item: any) {
            this.$client.deleteMetatype(this.containerID, item.id)
            .then(() => {
                this.refreshMetatypes()
            })
            .catch(e => console.log(e))
        }
    }
</script>
