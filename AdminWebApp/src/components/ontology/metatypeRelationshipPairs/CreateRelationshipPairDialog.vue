<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationships.create")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("relationships.new")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-text-field
                  :label="$t('edges.originClass')"
                  :value="metatype.name"
                  required
                  disabled
              />
              <v-autocomplete
                  v-model="relationshipSelect"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="metatypeRelationships"
                  :search-input.sync="relationshipSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
              >
                <template v-slot:label>{{$t('relationshipTypes.relType')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="destinationSelect"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="destinationMetatypes"
                  :search-input.sync="destinationSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  clearable
              >
                <template v-slot:label>{{$t('edges.destinationClass')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-select
                  v-model="relationshipType"
                  :rules="[validationRule]"
                  :items="relationshipTypeChoices"
                  required
              >
                <template v-slot:label>{{$t('relationships.cardinality')}} <small style="color:red" >*</small></template>
              </v-select>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text :disabled="!valid" @click="newRelationshipPair()" :loading="pairLoading">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {MetatypeRelationshipT, MetatypeT} from "@/api/types";

  interface CreateRelationshipPairDialogModel {
    errorMessage: string | {message: string, format: string}[]
    originMetatypes: MetatypeT[]
    destinationMetatypes: MetatypeT[]
    metatypeRelationships: MetatypeRelationshipT[]
    dialog: boolean
    valid: boolean
    destinationSearch: string
    originSearch: string
    relationshipSearch: string
    relationshipTypeChoices: string[]
    name: string
    description:  string
    destinationSelect: string
    relationshipSelect: string
    relationshipType: string
    pairLoading: boolean
  }

  export default Vue.extend ({
    name: 'CreateRelationshipPairDialog',

    props: {
      containerID: {
        type: String,
        required: true
      },
      metatype: {
        type: Object as PropType<MetatypeT>,
        required: false
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): CreateRelationshipPairDialogModel => ({
      errorMessage: "",
      originMetatypes: [],
      destinationMetatypes: [],
      metatypeRelationships: [],
      dialog: false,
      valid: false,
      destinationSearch: "",
      originSearch: "",
      relationshipSearch: "",
      relationshipTypeChoices: ["many:many", "one:one", "one:many", "many:one"],
      name: "",
      description:  "",
      destinationSelect: "",
      relationshipSelect: "",
      relationshipType: "",
      pairLoading: false
    }),

    watch: {
      dialog: {
        immediate: true,
        handler() {
          if (!this.dialog) this.reset();
        }
      },

      destinationSearch: {
        immediate: true,
        handler(newVal) {
          this.$client
            .listMetatypes(this.containerID, {
              name: newVal,
              ontologyVersion: this.$store.getters.activeOntologyVersionID
            })
            .then((metatypes) => {
              this.destinationMetatypes = metatypes as MetatypeT[];
            })
            .catch((e) => (this.errorMessage = e));
        }
      },

      originSearch: {
        immediate: true,
        handler(newVal) {
          this.$client
            .listMetatypes(this.containerID, {
              name: newVal,
              ontologyVersion: this.$store.getters.activeOntologyVersionID
            })
            .then((metatypes) => {
              this.originMetatypes = metatypes as MetatypeT[];
            })
            .catch((e) => (this.errorMessage = e));
        }
      },

      relationshipSearch: {
        immediate: true,
        handler(newVal) {
          this.$client
            .listMetatypeRelationships(this.containerID, {
              name: newVal,
              ontologyVersion: this.$store.getters.activeOntologyVersionID
            })
            .then((metatypeRelationships) => {
              this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[];
            })
            .catch((e) => (this.errorMessage = e));
        }
      }
    },

    methods: {
      newRelationshipPair() {
        this.pairLoading = true
        this.$client.createMetatypeRelationshipPair(this.containerID,
            {"origin_metatype_id": this.metatype!.id,
              "destination_metatype_id": this.destinationSelect,
              "relationship_id": this.relationshipSelect,
              "ontology_version": this.$store.getters.activeOntologyVersionID,
              "relationship_type": this.relationshipType}
        )
            .then(results => {
              this.dialog = false
              this.reset()
              this.$emit('pairCreated', results[0])
            })
            .catch(e => {
              this.errorMessage = [{
                message: this.$t('errors.errorCommunicating') as string,
                format: 'font-weight: bold;'
              }, {
                message: JSON.parse(e).error,
                format: ''
              }]
            })
            .finally(() => this.pairLoading = false)
      },
      reset() {
        this.name =  ""
        this.description = ""
        this.destinationSelect = ""
        this.relationshipSelect = ""
        this.relationshipType = ""
      },
      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      }
    }
  });
</script>
