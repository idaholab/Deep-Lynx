<template>
    <div>
        <v-data-table
                :headers="headers"
                :items="relationshipPairs"
                :search="search"
                class="elevation-1"
        >
            <template v-slot:top>
                <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t("home.metatypeRelationshipPairs")}}</v-toolbar-title>
                    <v-divider
                            class="mx-4"
                            inset
                            vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                    <v-dialog v-model="dialog" max-width="500px">
                        <template v-slot:activator="{ on }">
                            <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("metatypeRelationshipPairs.formTitle")}}</v-btn>
                        </template>
                        <v-card>
                            <v-card-title>
                                <span class="headline">{{$t("metatypeRelationshipPairs.formTitle")}}</span>
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
                                                <v-autocomplete
                                                    v-model="originSelect"
                                                    hint="Origin Metatype"
                                                    :items="metatypes"
                                                    item-text="name"
                                                    item-value="id"
                                                    label="Origin Metatype"
                                                    persistent-hint
                                                    single-line
                                                    required
                                                ></v-autocomplete>
                                                <v-autocomplete
                                                    v-model="relationshipType"
                                                    hint="Relationship"
                                                    :items="metatypeRelationships"
                                                    item-text="name"
                                                    item-value="id"
                                                    label="Relationship"
                                                    persistent-hint
                                                    single-line
                                                    required
                                                ></v-autocomplete>
                                                <v-autocomplete
                                                    v-model="destinationSelect"
                                                    hint="Destination Metatype"
                                                    :items="metatypes"
                                                    item-text="name"
                                                    item-value="id"
                                                    label="Destination Metatype"
                                                    persistent-hint
                                                    single-line
                                                    required
                                                ></v-autocomplete>
                                            </v-form>
                                        </v-col>
                                    </v-row>
                                </v-container>
                            </v-card-text>

                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("home.cancel")}}</v-btn>
                                <v-btn color="blue darken-1" text @click="newRelationshipPair()">{{$t("home.save")}}</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                </v-toolbar>
                <v-text-field v-model="search" label="Search" class="mx-4"></v-text-field>
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <v-icon
                        small
                        class="mr-2"
                        @click="enableRelationshipEdit(item)"
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
                    <span class="headline">Edit {{selectedRelationshipPair.name}}</span>
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
                                        v-model="selectedRelationshipPair.name"
                                        label="Name"
                                        required
                                    ></v-text-field>
                                    <v-textarea
                                        v-model="selectedRelationshipPair.description"
                                        label="Description"
                                    ></v-textarea>
                                    <v-autocomplete
                                        v-model="selectedRelationshipPair.origin_metatype_id"
                                        hint="Origin Metatype"
                                        :items="metatypes"
                                        item-text="name"
                                        item-value="id"
                                        label="Origin Metatype"
                                        persistent-hint
                                        single-line
                                        required
                                    ></v-autocomplete>
                                    <v-autocomplete
                                        v-model="selectedRelationshipPair.relationship_id"
                                        hint="Relationship"
                                        :items="metatypeRelationships"
                                        item-text="name"
                                        item-value="id"
                                        label="Relationship"
                                        persistent-hint
                                        single-line
                                        required
                                    ></v-autocomplete>
                                    <v-autocomplete
                                        v-model="selectedRelationshipPair.destination_metatype_id"
                                        hint="Destination Metatype"
                                        :items="metatypes"
                                        item-text="name"
                                        item-value="id"
                                        label="Destination Metatype"
                                        persistent-hint
                                        single-line
                                        required
                                    ></v-autocomplete>
                                </v-form>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="blue darken-1" text @click="editDialog = false" >{{$t("home.cancel")}}</v-btn>
                    <v-btn color="blue darken-1" text @click="editRelationship()">{{$t("home.save")}}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'
    import { MetatypeT, MetatypeRelationshipT, MetatypeRelationshipPairT } from '@/api/types';

    @Component
    export default class MetatypeRelationshipPairs extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        dialog= false
        editDialog= false
        search = null
        headers = [
            { text: "Name", value: 'name' },
            { text: "Description", value: 'description'},
            { text: 'Actions', value: 'actions', sortable: false }
        ]
        metatypes: MetatypeT[] = []
        metatypeRelationships: MetatypeRelationshipT[] = []
        relationshipPairs: MetatypeRelationshipPairT[] = []
        selectedRelationshipPair: MetatypeRelationshipPairT = {
            id: "",
            container_id: this.containerID,
            name: "",
            description: "",
            relationship_id: "",
            origin_metatype_id: "",
            destination_metatype_id: "",
            relationship_type: "many:many",
            created_at: "",
            modified_at: "",
            created_by: "",
            modified_by: ""
        }
        valid = null
        name = null
        description = null
        originSelect = ""
        destinationSelect = ""
        relationshipType = ""

        mounted() {
            this.refreshRelationshipPairs()
            this.refreshMetatypes()
            this.refreshMetatypeRelationships()
        }

        refreshMetatypes() {
            this.$client.listMetatypes(this.containerID, {"limit": 1000, "offset": 0})
            .then(metatypes => {
                this.metatypes = metatypes as MetatypeT[]
            })
            .catch(e => console.log(e))
        }

        refreshMetatypeRelationships() {
            this.$client.listMetatypeRelationships(this.containerID,  {limit: 1000, offset: 0})
            .then(metatypeRelationships => {
                this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
            })
            .catch(e => console.log(e))
        }

        refreshRelationshipPairs() {
            this.$client.listMetatypeRelationshipPairs(this.containerID, {"limit": 1000, "offset": 0})
            .then(relationshipPairs => {
                this.relationshipPairs = relationshipPairs
            })
            .catch(e => console.log(e))
        }

        newRelationshipPair() {
            this.$client.createMetatypeRelationshipPair(this.containerID,
                {"name": this.name,
                "description": this.description,
                "origin_metatype_id": this.originSelect,
                "destination_metatype_id": this.destinationSelect,
                "relationship_id": this.relationshipType,
                "relationship_type": "many:many"}
            )
            this.dialog = false
            this.name = null
            this.description = null
            this.refreshRelationshipPairs()
        }

        enableRelationshipEdit(item: any) {
            this.editDialog = true
            this.selectedRelationshipPair = item
        }

        editRelationship() {
            this.$client.updateMetatypeRelationshipPair(this.containerID, this.selectedRelationshipPair.id,
                {"name": this.selectedRelationshipPair.name,
                "description": this.selectedRelationshipPair.description,
                "origin_metatype_id": this.selectedRelationshipPair.origin_metatype_id,
                "destination_metatype_id": this.selectedRelationshipPair.destination_metatype_id,
                "relationship_id": this.selectedRelationshipPair.relationship_id}
            )
            this.editDialog = false
        }

        deleteRelationship(item: any) {
            this.$client.deleteMetatypeRelationshipPair(this.containerID, item.id)
            .then(() => {
                this.refreshRelationshipPairs()
            })
            .catch(e => console.log(e))
        }
    }
</script>
