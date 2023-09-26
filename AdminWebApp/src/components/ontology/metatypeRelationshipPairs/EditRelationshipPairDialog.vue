<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on" style="margin-top: 0px !important;">{{$t("relationships.edit")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("relationships.edit")}}</span>
      </v-card-title>
      <v-card-text v-if="selectedPair">
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col v-if="comparisonPair" :cols="6">

            <v-form
                ref="form"
            >
              <v-text-field
                  :value="comparisonPair.name"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('general.name')}}</template>
              </v-text-field>
              <v-textarea
                  :value="comparisonPair.description"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('general.description')}} </template>
              </v-textarea>
              <v-autocomplete
                  :value="comparisonPair.origin_metatype_id"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="[comparisonPair.origin_metatype]"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  disabled
                  class="disabled"
                  v-observe-visibility="loadComparisonPair"
              >
                <template v-slot:label>{{$t('edges.originClass')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  :value="comparisonPair.relationship_id"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="[comparisonPair.relationship]"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('relationshipTypes.relType')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  :value="comparisonPair.destination_metatype_id"
                  :single-line="false"
                  :items="[comparisonPair.destination_metatype]"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('edges.destinationClass')}}</template>
              </v-autocomplete>
              <v-select
                  :value="comparisonPair.relationship_type"
                  :items="relationshipTypeChoices"
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('relationships.cardinality')}}</template>
              </v-select>
            </v-form>
          </v-col>

          <v-col :cols="(comparisonPair) ? 6 : 12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-autocomplete
                  v-model="selectedPair.origin_metatype_id"
                  :class="(comparisonPair && selectedPair.origin_metatype_id !== comparisonPair.origin_metatype_id) ? 'edited-field' : ''"
                  :rules="[validationRule]"
                  :single-line="false"
                  :items="originMetatypes"
                  :search-input.sync="originSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  disabled
              >
                <template v-slot:label>{{$t('edges.originClass')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.relationship_id"
                  :rules="[validationRule]"
                  :class="(comparisonPair && selectedPair.relationship_id !== comparisonPair.relationship_id) ? 'edited-field' : ''"
                  :single-line="false"
                  :items="metatypeRelationships"
                  :search-input.sync="relationshipSearch"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  clearable
              >
                <template v-slot:label>{{$t('relationshipTypes.relType')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.destination_metatype_id"
                  :rules="[validationRule]"
                  :class="(comparisonPair && selectedPair.destination_metatype_id !== comparisonPair.destination_metatype_id) ? 'edited-field' : ''"
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
                  v-model="selectedPair.relationship_type"
                  :class="(comparisonPair && selectedPair.relationship_type !== comparisonPair.relationship_type) ? 'edited-field' : ''"
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
        <v-btn color="primary" text :disabled="!valid" @click="editRelationshipPair()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {MetatypeRelationshipPairT, MetatypeRelationshipT, MetatypeT} from "@/api/types";

  interface EditRelationshipPairDialogModel {
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
    name: 'EditRelationshipPairDialog',

    props: {
      pair: {
        type: Object as PropType<MetatypeRelationshipPairT>,
        required: true
      },
      comparisonPair: {
        type: Object as PropType<MetatypeRelationshipPairT | undefined>,
        required: false, 
        default: undefined
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): EditRelationshipPairDialogModel => ({
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
      editRelationshipPair() {
        this.$client.updateMetatypeRelationshipPair(this.pair.container_id,
            this.pair.id!,
            {"origin_metatype_id": this.selectedPair!.origin_metatype_id,
              "destination_metatype_id": this.selectedPair!.destination_metatype_id,
              "relationship_id": this.selectedPair!.relationship_id,
              "relationship_type": this.selectedPair!.relationship_type}
        )
            .then(() => {
              this.dialog = false
              this.$emit('pairEdited')
            })
            .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      },
      loadComparisonPair(isVisible: boolean) {
        if (isVisible && this.comparisonPair) {
          if (this.comparisonPair.relationship?.id) {
            // retrieve comparisonPair relationship
            this.$client.retrieveMetatypeRelationship(
                this.comparisonPair.container_id,
                this.comparisonPair.relationship.id
            ).then((result) => {
              this.comparisonPair!.relationship = result
            }).catch((e: any) => this.errorMessage = e)
          }

          if (this.comparisonPair.origin_metatype?.id) {
            // retrieve comparisonPair origin metatype
            this.$client.retrieveMetatype(
                this.comparisonPair.container_id,
                this.comparisonPair.origin_metatype.id
            ).then((result) => {
              this.comparisonPair!.origin_metatype = result
            }).catch((e: any) => this.errorMessage = e)
          }

          if (this.comparisonPair.destination_metatype?.id) {
            // retrieve comparisonPair destination metatype
            this.$client.retrieveMetatype(
                this.comparisonPair.container_id,
                this.comparisonPair.destination_metatype.id
            ).then((result) => {
              this.comparisonPair!.destination_metatype = result
            }).catch((e: any) => this.errorMessage = e)
          }
        }
      },
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