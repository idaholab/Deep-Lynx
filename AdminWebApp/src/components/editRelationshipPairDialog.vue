<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editMetatypeRelationshipPair.editMetatypeRelationshipPair")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("editMetatypeRelationshipPair.formTitle")}}</span>
        <error-banner :message="errorMessage"></error-banner>
      </v-card-title>

      <v-card-text>
        <v-container v-if="selectedPair">
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedPair.name"
                    :rules="[v => !!v || $t('editMetatypeRelationshipPair.originRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipPair.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="selectedPair.description"
                    :rules="[v => !!v || $t('editMetatypeRelationshipPair.originRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipPair.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
                <v-autocomplete
                    v-model="selectedPair.origin_metatype_id"
                    :rules="[v => !!v || $t('editMetatypeRelationshipPair.originRequired')]"
                    :single-line="false"
                    :items="originMetatypes"
                    :search-input.sync="originSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipPair.originMetatype')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-autocomplete
                    v-model="selectedPair.relationship_id"
                    :rules="[v => !!v || $t('editMetatypeRelationshipPair.relationshipRequired')]"
                    :single-line="false"
                    :items="metatypeRelationships"
                    :search-input.sync="relationshipSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipPair.relationship')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-autocomplete
                    v-model="selectedPair.destination_metatype_id"
                    :rules="[v => !!v || $t('editMetatypeRelationshipPair.destinationRequired')]"
                    :single-line="false"
                    :items="destinationMetatypes"
                    :search-input.sync="destinationSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipPair.destinationMetatype')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-select
                    v-model="selectedPair.relationship_type"
                    :rules="[v => !!v || $t('editMetatypeRelationshipPair.relationshipTypeRequired')]"
                    :items="relationshipTypeChoices"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipPair.relationshipType')}} <small style="color:red" >*</small></template>
                </v-select>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatypeRelationshipPair.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editMetatypeRelationshipPair.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text :disabled="!valid" @click="editRelationshipPair()">{{$t("editMetatypeRelationshipPair.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipPairT, MetatypeRelationshipT, MetatypeT} from "@/api/types";

@Component
export default class EditRelationshipPairDialog extends Vue {
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
    this.$client.listMetatypes(this.pair.container_id, {name: newVal})
        .then((metatypes) => {
          this.destinationMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('originSearch', {immediate: false})
  onOriginSearchChange(newVal: string) {
    this.$client.listMetatypes(this.pair.container_id, {name: newVal})
        .then((metatypes) => {
          this.originMetatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipSearch', {immediate: false})
  relationshipSearchChange(newVal: string) {
    this.$client.listMetatypeRelationships(this.pair.container_id,  {name: newVal})
        .then(metatypeRelationships => {
          this.metatypeRelationships = metatypeRelationships as MetatypeRelationshipT[]
        })
        .catch(e => this.errorMessage = e)
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedPair = JSON.parse(JSON.stringify(this.pair))
  }

  editRelationshipPair() {
    this.$client.updateMetatypeRelationshipPair(this.pair.container_id,
        this.pair.id,
        {"name": this.selectedPair!.name,
          "description": this.selectedPair!.description,
          "origin_metatype_id": this.selectedPair!.origin_metatype_id,
          "destination_metatype_id": this.selectedPair!.destination_metatype_id,
          "relationship_id": this.selectedPair!.relationship_id,
          "relationship_type": this.selectedPair!.relationship_type}
    )
        .then(() => {
          this.dialog = false
          this.$emit('pairEdited')
        })
        .catch(e => this.errorMessage = this.$t('editMetatypeRelationshipPair.errorEditingAPI') as string + e)
  }
}

</script>
