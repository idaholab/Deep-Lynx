<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("viewMetatypeRelationshipPair.editMetatypeRelationshipPair")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">View Metatype Relationship Pair</span>
      </v-card-title>
      <v-card-text v-if="selectedPair">
        <error-banner :message="errorMessage"></error-banner>
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
                <template v-slot:label>{{$t('viewMetatypeRelationshipPair.name')}}</template>
              </v-text-field>
              <v-textarea
                  v-model="selectedPair.description"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('viewMetatypeRelationshipPair.description')}}</template>
              </v-textarea>
              <v-autocomplete
                  v-model="selectedPair.origin_metatype_id"
                  :rules="[v => !!v || $t('viewMetatypeRelationshipPair.originRequired')]"
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
                <template v-slot:label>{{$t('viewMetatypeRelationshipPair.originMetatype')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.relationship_id"
                  :rules="[v => !!v || $t('viewMetatypeRelationshipPair.relationshipRequired')]"
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
                <template v-slot:label>{{$t('viewMetatypeRelationshipPair.relationship')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.destination_metatype_id"
                  :rules="[v => !!v || $t('viewMetatypeRelationshipPair.destinationRequired')]"
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
                <template v-slot:label>{{$t('viewMetatypeRelationshipPair.destinationMetatype')}}</template>
              </v-autocomplete>
              <v-select
                  v-model="selectedPair.relationship_type"
                  :rules="[v => !!v || $t('viewMetatypeRelationshipPair.relationshipTypeRequired')]"
                  :items="relationshipTypeChoices"
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('viewMetatypeRelationshipPair.relationshipType')}}</template>
              </v-select>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("viewMetatypeRelationshipPair.close")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipPairT, MetatypeRelationshipT, MetatypeT} from "@/api/types";

@Component
export default class ViewRelationshipPairDialog extends Vue {
  @Prop({required: true})
  pair!: MetatypeRelationshipPairT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  valid = false
  destinationSearch = ""
  originSearch = ""
  relationshipSearch = ""
  relationshipTypeChoices = ["many:many", "one:one", "one:many", "many:one"]
  selectedPair: MetatypeRelationshipPairT | null = null
  originMetatypes: MetatypeT[] = []
  destinationMetatypes: MetatypeT[] = []
  metatypeRelationships: MetatypeRelationshipT[] = []

  @Watch('destinationSearch', {immediate: false})
  onDestinationSearchChange(newVal: string) {
    this.$client.listMetatypes(this.pair.container_id, {name: newVal, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then((metatypes) => {
          this.destinationMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('originSearch', {immediate: false})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.pair.container_id, {name: newVal, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipSearch', {immediate: false})
  relationshipSearchChange(newVal: string) {
    this.$client.listMetatypeRelationships(this.pair.container_id,  {name: newVal, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then(metatypeRelationships => {
          this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
        })
        .catch(e => this.errorMessage = e)
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedPair = JSON.parse(JSON.stringify(this.pair))
  }
}

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
    background: #CD7F32;
    color: white !important;
    box-shadow: -5px 0 0 #CD7F32;
  }

  textarea {
    background: #CD7F32;
    color: white !important;
    box-shadow: -5px 0 0 #CD7F32;
  }

  .v-select__slot {
    background: #CD7F32;
    color: white !important;
    box-shadow: -5px 0 0 #CD7F32;
  }

  .v-select__selection {
    background: #CD7F32;
    color: white !important;
    box-shadow: -5px 0 0 #CD7F32;
  }
}
</style>
