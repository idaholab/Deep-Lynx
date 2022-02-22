<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createMetatypeRelationshipPair.createMetatypeRelationshipPair")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createMetatypeRelationshipPair.formTitle")}}</span>
        <error-banner :message="errorMessage"></error-banner>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="name"
                    :rules="[v => !!v || $t('createMetatypeRelationshipPair.originRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipPair.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="description"
                    :rules="[v => !!v || $t('createMetatypeRelationshipPair.originRequired')]"
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipPair.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
                <v-autocomplete
                    v-model="originSelect"
                    :rules="[v => !!v || $t('createMetatypeRelationshipPair.originRequired')]"
                    :single-line="false"
                    :items="originMetatypes"
                    :search-input.sync="originSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipPair.originMetatype')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-autocomplete
                    v-model="relationshipSelect"
                    :rules="[v => !!v || $t('createMetatypeRelationshipPair.relationshipRequired')]"
                    :single-line="false"
                    :items="metatypeRelationships"
                    :search-input.sync="relationshipSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipPair.relationship')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-autocomplete
                    v-model="destinationSelect"
                    :rules="[v => !!v || $t('createMetatypeRelationshipPair.destinationRequired')]"
                    :single-line="false"
                    :items="destinationMetatypes"
                    :search-input.sync="destinationSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipPair.destinationMetatype')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-select
                    v-model="relationshipType"
                    :rules="[v => !!v || $t('createMetatypeRelationshipPair.relationshipTypeRequired')]"
                    :items="relationshipTypeChoices"
                    required
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipPair.relationshipType')}} <small style="color:red" >*</small></template>
                </v-select>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createMetatypeRelationshipPair.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("createMetatypeRelationshipPair.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text :disabled="!valid" @click="newRelationshipPair()">{{$t("createMetatypeRelationshipPair.save")}}</v-btn>
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
  originSelect = ""
  destinationSelect = ""
  relationshipSelect = ""
  relationshipType = ""
  originMetatypes: MetatypeT[] = []
  destinationMetatypes: MetatypeT[] = []
  metatypeRelationships: MetatypeRelationshipT[] = []

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(!this.dialog) this.reset()
  }

  @Watch('destinationSearch', {immediate: true})
  onDestinationSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal})
        .then((metatypes) => {
          this.destinationMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('originSearch', {immediate: true})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipSearch', {immediate: true})
  relationshipSearchChange(newVal: string) {
    this.$client.listMetatypeRelationships(this.containerID,  {name: newVal})
        .then(metatypeRelationships => {
          this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
        })
        .catch(e => this.errorMessage = e)
  }

  newRelationshipPair() {
    this.$client.createMetatypeRelationshipPair(this.containerID,
        {"name": this.name,
          "description": this.description,
          "origin_metatype_id": this.originSelect,
          "destination_metatype_id": this.destinationSelect,
          "relationship_id": this.relationshipSelect,
          "relationship_type": this.relationshipType}
    )
        .then(results => {
          this.dialog = false
          this.reset()
          this.$emit('pairCreated', results[0])
        })
        .catch(e => this.errorMessage = this.$t('createMetatypeRelationshipPair.errorCreatingAPI') as string + e)
  }

  reset() {
    this.name =  ""
    this.description = ""
    this.originSelect = ""
    this.destinationSelect = ""
    this.relationshipSelect = ""
    this.relationshipType = ""
  }
}

</script>
