<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="50%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationships.view")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2" v-if="selectedPair">
      <v-card-title>
        <span class="headline text-h3">{{ $t('general.view') }} {{ selectedPair.name }}</span>
      </v-card-title>
      <v-card-text v-if="selectedPair">
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-form
                ref="form"
            >
              <v-text-field
                  v-model="selectedPair.name"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('general.name')}}</template>
              </v-text-field>
              <v-textarea
                  v-model="selectedPair.description"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('general.description')}}</template>
              </v-textarea>
              <v-autocomplete
                  v-model="selectedPair.origin_metatype_id"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="originMetatypes"
                  :search-input.sync="originSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('edges.originClass')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.relationship_id"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="metatypeRelationships"
                  :search-input.sync="relationshipSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('relationshipTypes.relType')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.destination_metatype_id"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="destinationMetatypes"
                  :search-input.sync="destinationSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('edges.destinationClass')}}</template>
              </v-autocomplete>
              <v-select
                  v-model="selectedPair.relationship_type"
                  :rules="[validationRule]"
                  :items="relationshipTypeChoices"
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('relationships.cardinality')}}</template>
              </v-select>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.close")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {MetatypeRelationshipPairT, MetatypeRelationshipT, MetatypeT} from "@/api/types";

  interface ViewRelationshipPairDialogModel {
    selectedPair: MetatypeRelationshipPairT | null
    originMetatypes: MetatypeT[]
    destinationMetatypes: MetatypeT[]
    metatypeRelationships: MetatypeRelationshipT[]
    errorMessage: string
    dialog: boolean
    valid: boolean
    destinationSearch: string
    originSearch: string
    relationshipSearch: string
    relationshipTypeChoices: string[]
  }

  export default Vue.extend ({
    name: 'ViewRelationshipPairDialog',

    props: {
      pair: {
        type: Object as PropType<MetatypeRelationshipPairT>,
        required: true
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): ViewRelationshipPairDialogModel => ({
      selectedPair: null,
      originMetatypes: [],
      destinationMetatypes: [],
      metatypeRelationships: [],
      errorMessage: "",
      dialog: false,
      valid: false,
      destinationSearch: "",
      originSearch: "",
      relationshipSearch: "",
      relationshipTypeChoices: ["many:many", "one:one", "one:many", "many:one"]
    }),

    mounted() {
      // have to do this to avoid mutating properties
      this.selectedPair = JSON.parse(JSON.stringify(this.pair))
    },

    watch: {
      destinationSearch: {
        immediate: true,
        handler(newVal) {
          this.$client
            .listMetatypes(this.pair.container_id, {
              name: newVal, 
              ontologyVersion: this.$store.getters.activeOntologyVersionID
            })
            .then((metatypes) => {
              this.destinationMetatypes = metatypes as MetatypeT[]
            })
            .catch((e: any) => this.errorMessage = e)
        }
      },
      originSearch: {
        immediate: true,
        handler(newVal) {
          this.$client
            .listMetatypes(this.pair.container_id, {
              name: newVal, 
              ontologyVersion: this.$store.getters.activeOntologyVersionID
            })
            .then((metatypes) => {
              this.originMetatypes = metatypes as MetatypeT[]
            })
            .catch((e: any) => this.errorMessage = e)
        }
      },
      relationshipSearch: {
        immediate: true,
        handler(newVal) {
          this.$client
            .listMetatypeRelationships(this.pair.container_id,  {
              name: newVal, 
              ontologyVersion: this.$store.getters.activeOntologyVersionID
            })
            .then(metatypeRelationships => {
              this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
            })
            .catch(e => this.errorMessage = e)
        }
      }
    },

    methods: {
      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      }
    }
  });
</script>

<style lang="scss">
.disabled input {
  color: black !important;
}

.disabled textarea {
  color: black !important;
}

.disabled .v-select__selection{
  color: black !important;
}

.edited-field {
  input {
    background: $warning;
    color: white !important;
    box-shadow: -5px 0 0 $warning;
  }

  textarea {
    background: $warning;
    color: white !important;
    box-shadow: -5px 0 0 $warning;
  }

  .v-select__slot {
    background: $warning;
    color: white !important;
    box-shadow: -5px 0 0 $warning;
  }

  .v-select__selection {
    background: $warning;
    color: white !important;
    box-shadow: -5px 0 0 $warning;
  }
}
</style>