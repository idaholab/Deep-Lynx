<template>
  <v-dialog v-model="dialog" max-width="700px" @click:outside="errorMessage = ''; dialog = false; clearNewAdapter()">
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
                    @input="selectAdapter"
                    :label="$t('createDataSource.sourceType')"
                    required
                ></v-select>


                <div v-if="newDataSource.adapter_type === 'http'">
                  <v-text-field
                      v-model="httpConfig.endpoint"
                      label="Endpoint"
                      required
                  ></v-text-field>

                  <v-select
                      v-model="select_auth"
                      :items="authMethods"
                      :label="$t('createDataSource.authMethod')"
                      @input="selectAuthMethodHttp"
                      required
                  >
                  </v-select>
                  <div v-if="httpConfig.auth_method === 'basic'">
                    <v-text-field
                        v-model="httpConfig.username"
                        :label="$t('createDataSource.username')"
                        required
                    ></v-text-field>

                    <v-text-field
                        v-model="httpConfig.password"
                        :label="$t('createDataSource.password')"
                        required
                    ></v-text-field>
                  </div>

                  <div v-if="httpConfig.auth_method === 'token'">
                    <v-text-field
                        v-model="httpConfig.token"
                        :label="$t('createDataSource.token')"
                        required
                    ></v-text-field>

                  </div>
                    <v-text-field
                        v-model="httpConfig.poll_interval"
                        :label="$t('createDataSource.pollInterval')"
                        type="number"
                        required
                    ></v-text-field>

                    <v-checkbox
                        v-model="httpConfig.secure"
                        :label="$t('createDataSource.secure')"
                        required
                    ></v-checkbox>

                </div>

                  <div v-if="newDataSource.adapter_type === 'jazz'">
                    <v-text-field
                        v-model="jazzConfig.project_name"
                        :label="$t('createDataSource.projectName')"
                        required
                    ></v-text-field>

                    <v-text-field
                        v-model="jazzConfig.endpoint"
                        :label="$t('createDataSource.endpoint')"
                        required
                    ></v-text-field>

                    <v-text-field
                        v-model="jazzConfig.token"
                        :label="$t('createDataSource.token')"
                        required
                    ></v-text-field>

                    <v-text-field
                        v-model="jazzConfig.poll_interval"
                        :label="$t('createDataSource.pollInterval')"
                        type="number"
                        required
                    ></v-text-field>

                    <v-checkbox
                        v-model="jazzConfig.secure"
                        :label="$t('createDataSource.secure')"
                        required
                    ></v-checkbox>
                  </div>

                <div v-if="newDataSource.adapter_type === 'aveva'">
                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="avevaConfig.ignore_dbs"
                      :label="$t('createDataSource.ignoreDBs')"
                  ></v-combobox>

                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="avevaConfig.ignore_element_types"
                      :label="$t('createDataSource.ignoreElements')"
                  ></v-combobox>

                  <v-combobox
                      clearable
                      multiple
                      small-chips
                      deletable-chips
                      v-model="avevaConfig.ifc_element_types"
                      :label="$t('createDataSource.ifcElementTypes')"
                  ></v-combobox>

                  <h3>{{$t("createDataSource.ifcSettingsTitle")}}</h3>
                  <v-row>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.format"
                          :label="$t('createDataSource.ifcSettings.format')"
                          required
                      ></v-text-field>

                    </v-col>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.data_level"
                          :label="$t('createDataSource.ifcSettings.dataLevel')"
                          required
                      ></v-text-field>

                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.log_detail"
                          :label="$t('createDataSource.ifcSettings.logLevel')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.arc_tolerance"
                          :label="$t('createDataSource.ifcSettings.arcTolerance')"
                          required
                      ></v-text-field>

                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col :cols="4">
                      <v-checkbox
                          v-model="avevaConfig.ifc_settings.component_level"
                          :label="$t('createDataSource.ifcSettings.componentLevel')"
                          required
                      ></v-checkbox>

                    </v-col>
                    <v-col :cols="4">
                      <v-checkbox
                          v-model="avevaConfig.ifc_settings.tube"
                          :label="$t('createDataSource.ifcSettings.tube')"
                          required
                      ></v-checkbox>

                    </v-col>

                    <v-col :cols="4">
                      <v-checkbox
                          v-model="avevaConfig.ifc_settings.cl"
                          :label="$t('createDataSource.ifcSettings.cl')"
                          required
                      ></v-checkbox>

                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.insu_translucency"
                          :label="$t('createDataSource.ifcSettings.insuTranslucency')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.obst_translucency"
                          :label="$t('createDataSource.ifcSettings.obstTranslucency')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.root"
                          :label="$t('createDataSource.ifcSettings.root')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                    <v-col :cols="6">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.pipe"
                          :label="$t('createDataSource.ifcSettings.pipe')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col :cols="4">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.nozzle"
                          :label="$t('createDataSource.ifcSettings.nozzle')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                    <v-col :cols="4">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.structure"
                          :label="$t('createDataSource.ifcSettings.structure')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                    <v-col :cols="4">
                      <v-text-field
                          v-model="avevaConfig.ifc_settings.cable"
                          :label="$t('createDataSource.ifcSettings.cable')"
                          required
                          type="number"
                      ></v-text-field>

                    </v-col>
                  </v-row>
                </div>


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
import {
  AvevaDataSourceConfig,
  DataSourceT,
  HttpDataSourceConfig,
  JazzDataSourceConfig,
  StandardDataSourceConfig
} from "@/api/types";

@Component
export default class CreateDataSourceDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  dialog= false
  valid = true
  select: string | null = ""
  select_auth = ""
  authMethods = ["Basic", "Token"]

  newDataSource: DataSourceT = {
    name: "",
    container_id: "",
    adapter_type: undefined,
    active: false,
    config: undefined
  }

  standardConfig: StandardDataSourceConfig = {
    kind: "standard",
    data_type: "json"
  }

  httpConfig: HttpDataSourceConfig = {
    kind: "http",
    endpoint: "",
    secure: true,
    auth_method: 'none',
    poll_interval: 10,
  }

  jazzConfig: JazzDataSourceConfig = {
    kind: "jazz",
    endpoint: "",
    secure: true,
    project_name: "",
    poll_interval: 10,
    token: ""
  }

  adapterTypes() {
    return [
      {text: this.$t('createDataSource.standard'), value: 'standard'},
      {text: this.$t('createDataSource.http'), value: 'http'},
      {text: this.$t('createDataSource.jazz'), value: 'jazz'},
      {text: this.$t('createDataSource.aveva'), value: 'aveva'},
    ]
  }



  selectAdapter(adapter: string) {
    this.newDataSource.adapter_type = adapter
  }

  selectDatatype(dataType: string) {
    switch(dataType) {
      case "json" : {
        this.standardConfig.data_type = 'json'
        break;
      }

      case "csv" : {
        this.standardConfig.data_type = 'csv'
        break
      }

      default : {
        this.standardConfig.data_type = 'json'
      }
    }
  }

  selectAuthMethodHttp(authMethod: string) {
    switch(authMethod) {
      case "Basic": {
        this.httpConfig.auth_method = "basic"
        break
      }

      case "Token": {
        this.httpConfig.auth_method = "token"
        break
      }

      default : {
        this.httpConfig.auth_method = "none"
      }
    }
  }

  createDataSource() {
    switch (this.newDataSource.adapter_type) {
      case "standard": {
        this.newDataSource.config = this.standardConfig
        break;
      }

      case "http": {
        this.newDataSource.config = this.httpConfig
        break;
      }

      case "jazz": {
        this.newDataSource.config = this.jazzConfig
        break;
      }

      case "aveva": {
        this.newDataSource.config = this.avevaConfig
        break;
      }

      default: {
        this.newDataSource.config = this.standardConfig
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


  // we include this at the bottom since it's so large
  clearNewAdapter() {
    this.dialog = false
    this.select = null
    this.newDataSource = {
      name: "",
      adapter_type: undefined,
      active: false,
      config: undefined
    }

    this.standardConfig = {
      kind: "standard",
      data_type: "json"
    }

    this.httpConfig = {
      kind: "http",
      endpoint: "",
      secure: true,
      auth_method: 'none',
      poll_interval: 10,
    }

    this.jazzConfig = {
      kind: "jazz",
      endpoint: "",
      secure: true,
      project_name: "",
      poll_interval: 10,
      token: ""
    }

    this.avevaConfig = {
      kind: "aveva",
      ignore_dbs: ['SYSTEM', 'DICTIONARY', 'PROPERTY', 'CATALOG', 'NSEQ'],
      ignore_element_types: [
        'GENPRI',
        'POINT',
        'INVISIBLE POINT',
        'TANGENT POINT',
        'POLYGON',
        'VERTEX',
        'AIDARC',
        'AIDCIRCLE',
        'AIDLINE',
        'AIDPOINT',
        'AIDTEXT',
        'BOX',
        'CONE',
        'CTORUS',
        'CYLINDER',
        'DISH',
        'DRAWING',
        'EXTRUSION',
        'IPOINT',
        'LINDIMENSION',
        'LOOP',
        'LOOPTS',
        'MLABEL',
        'POGON',
        'POHEDRON',
        'POINT',
        'POLFACE',
        'POLOOP',
        'POLPTLIST',
        'POLYHEDRON',
        'PYRAMID',
        'REVOLUTION',
        'RTORUS',
        'SLCYLINDER',
        'SNOUT',
        'TANPOINT',
        'VERTEX',
        'NBOX',
        'NCONE',
        'NCTORUS',
        'NCYLINDER',
        'NDISH',
        'NPOLYHEDRON',
        'NPYRAMID',
        'NREVOLUTION',
        'NRTORUS',
        'NSLCYLINDER',
        'NSNOUT',
        'NXRUSION',
      ],
      ifc_element_types: [
        'WORLD',
        'SITE',
        'AREA WORLD',
        'GROUP WORLD',
        'GROUP',
        'AREA SET',
        'AREA DEFINITION',
        'SITE',
        'ZONE',
        'DRAWING',
        'STRUCTURE',
      ],
      ifc_settings: {
        format: 'IFC2x3',
        data_level: 'GA',
        component_level: true,
        log_detail: 2,
        arc_tolerance: '10mm',
        tube: true,
        cl: false,
        insu_translucency: 25,
        obst_translucency: 50,
        root: 6,
        pipe: 6,
        nozzle: 6,
        structure: 6,
        cable: 6,
      }
    }
  }

  avevaConfig: AvevaDataSourceConfig = {
    kind: "aveva",
    ignore_dbs: ['SYSTEM', 'DICTIONARY', 'PROPERTY', 'CATALOG', 'NSEQ'],
    ignore_element_types: [
      'GENPRI',
      'POINT',
      'INVISIBLE POINT',
      'TANGENT POINT',
      'POLYGON',
      'VERTEX',
      'AIDARC',
      'AIDCIRCLE',
      'AIDLINE',
      'AIDPOINT',
      'AIDTEXT',
      'BOX',
      'CONE',
      'CTORUS',
      'CYLINDER',
      'DISH',
      'DRAWING',
      'EXTRUSION',
      'IPOINT',
      'LINDIMENSION',
      'LOOP',
      'LOOPTS',
      'MLABEL',
      'POGON',
      'POHEDRON',
      'POINT',
      'POLFACE',
      'POLOOP',
      'POLPTLIST',
      'POLYHEDRON',
      'PYRAMID',
      'REVOLUTION',
      'RTORUS',
      'SLCYLINDER',
      'SNOUT',
      'TANPOINT',
      'VERTEX',
      'NBOX',
      'NCONE',
      'NCTORUS',
      'NCYLINDER',
      'NDISH',
      'NPOLYHEDRON',
      'NPYRAMID',
      'NREVOLUTION',
      'NRTORUS',
      'NSLCYLINDER',
      'NSNOUT',
      'NXRUSION',
    ],
    ifc_element_types: [
      'WORLD',
      'SITE',
      'AREA WORLD',
      'GROUP WORLD',
      'GROUP',
      'AREA SET',
      'AREA DEFINITION',
      'SITE',
      'ZONE',
      'DRAWING',
      'STRUCTURE',
    ],
    ifc_settings: {
      format: 'IFC2x3',
      data_level: 'GA',
      component_level: true,
      log_detail: 2,
      arc_tolerance: '10mm',
      tube: true,
      cl: false,
      insu_translucency: 25,
      obst_translucency: 50,
      root: 6,
      pipe: 6,
      nozzle: 6,
      structure: 6,
      cable: 6,
    }
  }

}
</script>
