<template>
  <div>
    <v-data-table
        :headers="headers()"
        :items="relationshipPairs"
        :options.sync="options"
        :server-items-length="relationshipPairCount"
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
        <v-alert type="success" v-if="createdMetatypeRelationshipPair">
          {{$t('metatypeRelationshipPairs.pairSuccessfullyCreated')}} -
          <span>
            <edit-metatype-relationship-pair-dialog :pair="createdMetatypeRelationshipPair"></edit-metatype-relationship-pair-dialog>
          </span>
        </v-alert>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("home.metatypeRelationshipPairs")}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <create-relationship-pair-dialog :containerID="containerID" @pairCreated="recentlyCreatedPair"></create-relationship-pair-dialog>
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
      <edit-relationship-pair-dialog :pair="item" :icon="true" @pairEdited="loadMetatypeRelationshipPairs()"></edit-relationship-pair-dialog>
        <v-icon
            small
            @click="deleteRelationship(item)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import { MetatypeRelationshipT, MetatypeRelationshipPairT } from '@/api/types';
import CreateRelationshipPairDialog from "@/components/createRelationshipPairDialog.vue";
import EditRelationshipPairDialog from "@/components/editRelationshipPairDialog.vue";

@Component({components: {
  CreateRelationshipPairDialog,
  EditRelationshipPairDialog
  }})
export default class MetatypeRelationshipPairs extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  successMessage = ""
  loading = false
  relationshipPairCount = 0
  metatypeRelationships: MetatypeRelationshipT[] = []
  relationshipPairs: MetatypeRelationshipPairT[] = []
  createdMetatypeRelationshipPair: MetatypeRelationshipPairT | null = null

  name = ""
  description =  ""

  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}


  @Watch('options')
  onOptionChange() {
    this.loadMetatypeRelationshipPairs()
  }

  @Watch('name')
  onNameChange() {
    this.countRelationshipPairs()
    this.loadMetatypeRelationshipPairs()
  }

  @Watch('description')
  onDescriptionChange() {
    this.countRelationshipPairs()
    this.loadMetatypeRelationshipPairs()
  }

  mounted() {
    this.countRelationshipPairs()
  }

  headers() {
    return [
      { text: this.$t('metatypeRelationshipPairs.name'), value: 'name' },
      { text: this.$t('metatypeRelationshipPairs.description'), value: 'description'},
      { text: this.$t('metatypeRelationshipPairs.actions'), value: 'actions', sortable: false }
    ]
  }

  countRelationshipPairs() {
    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      count: true,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then(relationshipCount => {
          this.relationshipPairCount= relationshipCount as number
        })
        .catch(e => this.errorMessage = e)
  }

  loadMetatypeRelationshipPairs() {
    this.loading = true
    this.metatypeRelationships = []

    const {page, itemsPerPage, sortBy, sortDesc} = this.options;
    let sortParam: string | undefined
    let sortDescParam: boolean | undefined

    const pageNumber = page - 1
    if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
    if(sortDesc) sortDescParam = sortDesc[0]

    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      limit: itemsPerPage,
      offset: itemsPerPage * pageNumber,
      sortBy: sortParam,
      sortDesc: sortDescParam,
      name: (this.name !== "") ? this.name : undefined,
      description: (this.description !== "") ? this.description : undefined,
    })
        .then((results) => {
          this.relationshipPairs = results as MetatypeRelationshipPairT[]
          this.loading = false
        })
        .catch((e: any) => this.errorMessage = e)
  }

  deleteRelationship(item: any) {
    this.$client.deleteMetatypeRelationshipPair(this.containerID, item.id)
        .then(() => {
          this.loadMetatypeRelationshipPairs()
        })
        .catch(e => this.errorMessage = e)
  }

  recentlyCreatedPair(pair: MetatypeRelationshipPairT) {
    this.createdMetatypeRelationshipPair = pair
    this.countRelationshipPairs()
    this.loadMetatypeRelationshipPairs()
  }
}
</script>
