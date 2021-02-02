<template>
  <div>
    <v-data-table
        :headers="headers()"
        :items="metatypeRelationships"
        :server-items-length="metatypeRelationshipCount"
        :options.sync="options"
        :loading="loading"
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
          <v-toolbar-title>{{$t('metatypeRelationships.metatypeRelationships')}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <v-dialog v-model="dialog" max-width="500px">
            <template v-slot:activator="{ on }">
              <v-btn color="primary" dark class="mb-2" v-on="on">{{$t('metatypeRelationships.newRelationship')}}</v-btn>
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
        <v-row>
          <v-col :cols="6">
            <v-text-field v-model="name" :label="$t('metatypeRelationships.searchName')" class="mx-4"></v-text-field>
          </v-col>
          <v-col :cols="6">
            <v-text-field v-model="description" :label="$t('metatypeRelationships.searchDescription')" class="mx-4"></v-text-field>
          </v-col>
        </v-row>
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
import {MetatypeRelationshipT} from '@/api/types';
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'

@Component
export default class MetatypeRelationships extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  successMessage = ""
  dialog= false
  editDialog= false
  valid = null
  loading = false
  metatypeRelationships: MetatypeRelationshipT[] = []
  metatypeRelationshipCount = 0
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
    this.loadMetatypeRelationships()
  }

  @Watch('name')
  onNameChange() {
    this.countRelationships()
    this.loadMetatypeRelationships()
  }

  @Watch('description')
  onDescriptionChange() {
    this.countRelationships()
    this.loadMetatypeRelationships()
  }

  mounted() {
    this.countRelationships()
  }

  headers() {
    return [
      { text: this.$t('metatypeRelationships.name'), value: 'name' },
      { text: this.$t('metatypeRelationships.description'), value: 'description'},
      { text: this.$t('metatypeRelationships.actions'), value: 'actions', sortable: false }
    ]
  }

  countRelationships() {
    this.$client.listMetatypeRelationships(this.containerID, {
      count: true,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then(relationshipCount => {
          this.metatypeRelationshipCount = relationshipCount as number
        })
        .catch(e => this.errorMessage = e)
  }


  loadMetatypeRelationships(){
    this.loading = true
    this.metatypeRelationships = []

    const {page, itemsPerPage, sortBy, sortDesc} = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listMetatypeRelationships(this.containerID, {
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          this.metatypeRelationships = results as MetatypeRelationshipT[]
          this.loading = false
        })
        .catch((e: any) => this.errorMessage = e)
  }


  newMetatypeRelationship() {
    this.$client.createMetatypeRelationship(this.containerID, {"name": this.name, "description": this.description})
    this.loadMetatypeRelationships()
    this.dialog = false
    this.name = ""
    this.description = ""
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
          this.loadMetatypeRelationships()
        })
        .catch(e => console.log(e))
  }
}
</script>
