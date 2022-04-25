<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("editMetatypeRelationshipPair.editMetatypeRelationshipPair")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("editMetatypeRelationshipPair.formTitle")}}</span>
      </v-card-title>   
      <v-card-text v-if="selectedPair">
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col v-if="comparisonPair" :cols="6">

            <v-form
                ref="form"
            >
              <v-text-field
                  v-model="comparisonPair.name"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.name')}}</template>
              </v-text-field>
              <v-textarea
                  v-model="comparisonPair.description"
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.description')}} </template>
              </v-textarea>
              <v-autocomplete
                  v-model="comparisonPair.origin_metatype_id"
                  :rules="[v => !!v || $t('editMetatypeRelationshipPair.originRequired')]"
                  :single-line="false"
                  :items="[comparisonPair.origin_metatype]"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.originMetatype')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="comparisonPair.relationship_id"
                  :rules="[v => !!v || $t('editMetatypeRelationshipPair.relationshipRequired')]"
                  :single-line="false"
                  :items="[comparisonPair.relationship]"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.relationship')}}</template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="comparisonPair.destination_metatype_id"
                  :single-line="false"
                  :items="[comparisonPair.destination_metatype]"
                  item-text="name"
                  item-value="id"
                  persistent-hint
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.destinationMetatype')}}</template>
              </v-autocomplete>
              <v-select
                  v-model="comparisonPair.relationship_type"
                  :items="relationshipTypeChoices"
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.relationshipType')}}</template>
              </v-select>
            </v-form>
          </v-col>

          <v-col :cols="(comparisonPair) ? 6 : 12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-text-field
                  v-model="selectedPair.name"
                  :rules="[v => !!v || $t('editMetatypeRelationshipPair.originRequired')]"
                  required
                  :class="(comparisonPair && selectedPair.name !== comparisonPair.name) ? 'edited-field' : ''"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.name')}} <small style="color:red" >*</small></template>
              </v-text-field>
              <v-textarea
                  v-model="selectedPair.description"
                  :rules="[v => !!v || $t('editMetatypeRelationshipPair.originRequired')]"
                  :class="(comparisonPair && selectedPair.description !== comparisonPair.description) ? 'edited-field' : ''"
              >
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.description')}} <small style="color:red" >*</small></template>
              </v-textarea>
              <v-autocomplete
                  v-model="selectedPair.origin_metatype_id"
                  :class="(comparisonPair && selectedPair.origin_metatype_id !== comparisonPair.origin_metatype_id) ? 'edited-field' : ''"
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
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.relationship')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-autocomplete
                  v-model="selectedPair.destination_metatype_id"
                  :rules="[v => !!v || $t('editMetatypeRelationshipPair.destinationRequired')]"
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
                <template v-slot:label>{{$t('editMetatypeRelationshipPair.destinationMetatype')}} <small style="color:red" >*</small></template>
              </v-autocomplete>
              <v-select
                  v-model="selectedPair.relationship_type"
                  :class="(comparisonPair && selectedPair.relationship_type !== comparisonPair.relationship_type) ? 'edited-field' : ''"
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

  @Prop({required: false, default: undefined})
  comparisonPair?: MetatypeRelationshipPairT | undefined

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