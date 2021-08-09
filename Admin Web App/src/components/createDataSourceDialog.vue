<template>
  <v-dialog v-model="dialog" max-width="500px" @click:outside="errorMessage = ''; dialog = false">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("createDataSource.newDataSource")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createDataSource.formTitle")}}</span>
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
                    :label="$t('createDataSource.name')"
                    required
                ></v-text-field>
                <v-select
                    v-model="select"
                    :items="adapterTypes()"
                    :rules="[v => !!v || 'Item is required']"
                    @input="selectAdapter"
                    :label="$t('createDataSource.sourceType')"
                    required
                ></v-select>

                <div v-if="newDataSource.adapter_type === 'http' || newDataSource.adapter_type === 'jazz'">
                  <v-text-field
                      v-model="newDataSource.config.endpoint"
                      label="Endpoint"
                      required
                  ></v-text-field>
                  <v-select
                      v-if="newDataSource.adapter_type === 'http'"
                      :items="dataTypes"
                      :rules="[v => !!v || 'Item is required']"
                      @input="selectDatatype"
                      :label="$t('createDataSource.dataType')"
                      required
                  ></v-select>
                  <v-select
                      v-if="newDataSource.adapter_type === 'http'"
                      v-model="select_auth"
                      :items="authMethods"
                      :rules="[v => !!v || 'Item is required']"
                      :label="$t('createDataSource.authMethod')"
                      @input="selectAuthMethod"
                      required
                  >
                  </v-select>
                  <div v-if="newDataSource.config.auth_method === 'basic'">
                    <v-text-field
                        v-model="newDataSource.config.username"
                        :label="$t('createDataSource.username')"
                        required
                    ></v-text-field>

                    <v-text-field
                        v-model="newDataSource.config.password"
                        :label="$t('createDataSource.password')"
                        required
                    ></v-text-field>
                  </div>

                  <div v-if="newDataSource.config.auth_method === 'token' || newDataSource.adapter_type === 'jazz'">
                    <v-text-field
                        v-model="newDataSource.config.token"
                        :label="$t('createDataSource.token')"
                        required
                    ></v-text-field>

                  </div>

                  <div v-if="newDataSource.adapter_type === 'jazz'">
                    <v-text-field
                        v-model="newDataSource.config.project_name"
                        :label="$t('createDataSource.projectName')"
                        required
                    ></v-text-field>

                  </div>
                  <v-text-field
                      v-model="newDataSource.config.poll_interval"
                      :label="$t('createDataSource.pollInterval')"
                      type="number"
                      required
                  ></v-text-field>
                </div>
                <v-checkbox
                    v-if="newDataSource.adapter_type === 'jazz'"
                    v-model="newDataSource.config.secure"
                    :label="$t('createDataSource.secure')"
                    required
                ></v-checkbox>
                <v-checkbox
                    v-model="newDataSource.active"
                    :label="$t('createDataSource.enable')"
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
export default class CreateDataSourceDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  dialog= false
  valid = true
  select = ""
  select_auth = ""
  authMethods = ["basic", "token"]
  dataTypes = ["json"]

  newDataSource = {
    name: "",
    adapter_type: "",
    active: false,
    config: {
      kind: "",
      endpoint: "",
      poll_interval: 10,
      project_name: "",
      data_type: "",
      auth_method: "",
      username: "",
      password: "",
      token: "",
      secure: true
    }
  }

  adapterTypes() {
    return [
      {text: this.$t('createDataSource.standard'), value: 'standard'},
      {text: this.$t('createDataSource.http'), value: 'http'},
      {text: this.$t('createDataSource.jazz'), value: 'jazz'},
    ]
  }

  clearNewAdapter() {
    this.dialog = false
    this.newDataSource = {
      name: "",
      adapter_type: "",
      active: false,
      config: {
        kind: "",
        poll_interval: 1,
        endpoint: "",
        project_name: "",
        data_type: "",
        auth_method: "",
        username: "",
        password: "",
        token: "",
        secure: true
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
    switch (this.newDataSource.adapter_type) {
      case "standard": {
        this.newDataSource.config.kind = "standard"
        break;
      }

      case "http": {
        this.newDataSource.config.kind = "http"
        break;
      }

      case "jazz": {
        this.newDataSource.config.kind = "jazz"
        break;
      }

      default: {
        this.newDataSource.config.kind = "standard"
      }
    }

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
