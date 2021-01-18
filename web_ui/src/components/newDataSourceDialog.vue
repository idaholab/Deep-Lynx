<template>
    <v-dialog v-model="dialog" max-width="500px" @click:outside="errorMessage = ''; dialog = false">
        <template v-slot:activator="{ on }">
            <v-btn color="primary" dark class="mb-2" v-on="on">New Data Source</v-btn>
        </template>
        <v-card>
            <v-card-title>
                <span class="headline">{{$t("dataSources.formTitle")}}</span>
            </v-card-title>

            <v-card-text>
                <error-banner :message="errorMessage"></error-banner>
                <v-container>
                    <v-row>
                        <v-col :cols="12">

                            <v-form
                                    ref="form"
                                    v-model="valid"
                                    lazy-validation
                            >
                                <v-text-field
                                        v-model="newDataSource.name"
                                        label="Name"
                                        required
                                ></v-text-field>
                                <v-select
                                        v-model="select"
                                        :items="adapterTypes"
                                        :rules="[v => !!v || 'Item is required']"
                                        @input="selectAdapter"
                                        label="Type of Data Source"
                                        required
                                ></v-select>

                                <div v-if="newDataSource.adapter_type === 'http'">
                                    <v-text-field
                                            v-model="newDataSource.config.endpoint"
                                            label="Endpoint"
                                            required
                                    ></v-text-field>
                                    <v-select
                                            :items="dataTypes"
                                            :rules="[v => !!v || 'Item is required']"
                                            @input="selectDatatype"
                                            label="Type of Data"
                                            required
                                    ></v-select>
                                    <v-select
                                            v-model="select_auth"
                                            :items="authMethods"
                                            :rules="[v => !!v || 'Item is required']"
                                            label="Auth Method"
                                            @input="selectAuthMethod"
                                            required
                                    >
                                    </v-select>
                                    <div v-if="newDataSource.config.auth_method === 'basic'">
                                        <v-text-field
                                                v-model="newDataSource.config.username"
                                                label="Username"
                                                required
                                        ></v-text-field>

                                        <v-text-field
                                                v-model="newDataSource.config.password"
                                                label="Password"
                                                required
                                        ></v-text-field>
                                    </div>

                                    <div v-if="newDataSource.config.auth_method === 'token'">
                                        <v-text-field
                                                v-model="newDataSource.config.token"
                                                label="Token"
                                                required
                                        ></v-text-field>

                                    </div>
                                  <v-text-field
                                      v-model="newDataSource.config.poll_interval"
                                      label="Poll Interval (in seconds)"
                                      type="number"
                                      required
                                  ></v-text-field>
                                </div>
                                <v-checkbox
                                        v-model="newDataSource.active"
                                        label="Enable"
                                        required
                                ></v-checkbox>

                            </v-form>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="clearNewAdapter" >{{$t("home.cancel")}}</v-btn>
                <v-btn color="blue darken-1" text @click="createDataSource" >{{$t("home.create")}}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from "vue-property-decorator"

    @Component
    export default class NewDataSourceDialog extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        errorMessage = ""
        dialog= false
        valid = true
        select = ""
        select_auth = ""
        authMethods = ["basic", "token"]
        dataTypes = ["json"]

        adapterTypes = ["manual", "http"]
        newDataSource = {
            name: "",
            adapter_type: "",
            active: false,
            config: {
                endpoint: "",
                poll_interval: 1,
                data_type: "",
                auth_method: "",
                username: "",
                password: "",
                token: ""
            }
        }

        clearNewAdapter() {
            this.dialog = false
            this.newDataSource = {
                name: "",
                adapter_type: "",
                active: false,
                config: {
                    poll_interval: 1,
                    endpoint: "",
                    data_type: "",
                    auth_method: "",
                    username: "",
                    password: "",
                    token: ""
                }
            }
        }

        selectAdapter(adapter: string) {
            this.newDataSource.adapter_type = adapter
        }

        selectDatatype(dataType: string) {
            this.newDataSource.config.data_type = dataType
        }

        selectAuthMethod(authMethod: string) {
            this.newDataSource.config.auth_method = authMethod
        }

        createDataSource() {
            this.$client.createDataSource(this.containerID, this.newDataSource)
                .then((dataSource)=> {
                    this.clearNewAdapter()
                    this.$emit("dataSourceCreated", dataSource)

                    this.dialog = false
                    this.errorMessage = ""
                })
                .catch(e => this.errorMessage = e)
        }

    }
</script>
