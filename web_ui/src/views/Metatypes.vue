<template>
  <div>
    <v-data-table
        :headers="headers()"
        :items="metatypes"
        :server-items-length="metatypesCount"
        :options.sync="options"
        :loading="metatypesLoading"
        :items-per-page="100"
        :footer-props="{
          'items-per-page-options': [25, 50, 100]
        }"
        class="elevation-1"
    >

      <template v-slot:top>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
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
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('metatypes.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('metatypes.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
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
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import { MetatypeT } from '@/api/types';

@Component
export default class Metatypes extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  successMessage = ""
  dialog= false
  editDialog= false
  metatypesLoading = false
  metatypes: MetatypeT[] = []
  metatypesCount = 0
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
  name = ""
  description = ""
  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}

  @Watch('options')
  onOptionChange() {
    this.loadMetatypes()
  }

  @Watch('name')
  onNameChange() {
    this.countMetatypes()
    this.loadMetatypes()
  }

  @Watch('description')
  onDescriptionChange() {
    this.countMetatypes()
    this.loadMetatypes()
  }

  mounted() {
    this.countMetatypes()
  }

  headers() {
    return  [
      { text: this.$t('metatypes.name'), value: 'name' },
      { text: this.$t('metatypes.description'), value: 'description'},
      { text: this.$t('metatypes.actions'), value: 'actions', sortable: false }
    ]
  }

  countMetatypes() {
    this.$client.listMetatypes(this.containerID, {
      count: true,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then(metatypesCount => {
          this.metatypesCount = metatypesCount as number
        })
        .catch(e => this.errorMessage = e)
  }

  loadMetatypes(){
    this.metatypesLoading = true
    this.metatypes = []

    const {page, itemsPerPage, sortBy, sortDesc} = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listMetatypes(this.containerID, {
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          this.metatypes = results as MetatypeT[]
          this.metatypesLoading = false
        })
        .catch((e: any) => this.errorMessage = e)
  }


  newMetatype() {
    this.$client.createMetatype(this.containerID, {"name": this.name, "description": this.description})
    this.dialog = false
    this.name = ""
    this.description = ""
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
          this.loadMetatypes()
        })
        .catch(e => console.log(e))
  }
}
</script>
