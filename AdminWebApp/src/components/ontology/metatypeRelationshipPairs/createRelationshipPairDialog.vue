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
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-autocomplete
                  v-model="originSelect"
                  :rules="[v => !!v || $t('validation.required')]"
                  :single-line="false"
                  :items="originMetatypes"
                  :search-input.sync="originSearch"
                  item-text="name"
                  return-object
                  persistent-hint
                  required
                  disabled
              >
                <template v-slot:label>{{$t('edges.originClass')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="relationshipSelect"
                  :rules="[v => !!v || $t('validation.required')]"
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
                  :rules="[v => !!v || $t('validation.required')]"
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
                  :rules="[v => !!v || $t('validation.required')]"
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
        <v-btn color="primary" text :disabled="!valid" @click="newRelationshipPair()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipT, MetatypeT} from "@/api/types";

@Component
export default class CreateRelationshipPairDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: false})
  metatype?: MetatypeT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  valid = false
  destinationSearch = ""
  originSearch = ""
  relationshipSearch = ""
  relationshipTypeChoices = ["many:many", "one:one", "one:many", "many:one"]
  name = ""
  description =  ""
  originSelect: MetatypeT | undefined = undefined
  destinationSelect = ""
  relationshipSelect = ""
  relationshipType = ""
  originMetatypes: MetatypeT[] = []
  destinationMetatypes: MetatypeT[] = []
  metatypeRelationships: MetatypeRelationshipT[] = []

  created() {
    if (this.metatype) {
      this.originSelect = this.metatype
    }
  }

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(!this.dialog) this.reset()
  }

  @Watch('destinationSearch', {immediate: true})
  onDestinationSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then((metatypes) => {
          this.destinationMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('originSearch', {immediate: true})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipSearch', {immediate: true})
  relationshipSearchChange(newVal: string) {
    this.$client.listMetatypeRelationships(this.containerID,  {name: newVal, ontologyVersion: this.$store.getters.activeOntologyVersionID})
        .then(metatypeRelationships => {
          this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
        })
        .catch(e => this.errorMessage = e)
  }

  newRelationshipPair() {
    this.$client.createMetatypeRelationshipPair(this.containerID,
        {"origin_metatype_id": this.originSelect!.id,
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
        .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
  }

  reset() {
    this.name =  ""
    this.description = ""
    this.originSelect = undefined
    this.destinationSelect = ""
    this.relationshipSelect = ""
    this.relationshipType = ""
  }
}

</script>
