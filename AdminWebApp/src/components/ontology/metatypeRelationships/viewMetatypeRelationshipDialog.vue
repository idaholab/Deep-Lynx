<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("viewMetatypeRelationship.editMetatypeRelationship")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeRelationship">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{ $t('viewMetatypeRelationship.edit') }} {{ selectedMetatypeRelationship.name }}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedMetatypeRelationship.name"
                    :rules="[v => !!v || $t('viewMetatypeRelationship.nameRequired')]"
                    :disabled="true"
                    required
                    class="disabled"
                >
                  <template v-slot:label>{{$t('viewMetatypeRelationship.name')}} </template>
                </v-text-field>
                <v-textarea
                    v-model="selectedMetatypeRelationship.description"
                    :rules="[v => !!v || $t('viewMetatypeRelationship.descriptionRequired')]"
                    required
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('viewMetatypeRelationship.description')}} </template>
                </v-textarea>

              </v-form>
            </v-col>

            <v-col :cols="12" v-if="keysLoading">
              <v-progress-linear indeterminate></v-progress-linear>
            </v-col>
            <v-col :cols="12">
              <v-data-table
                  :headers="headers()"
                  :items="selectedMetatypeRelationship.keys"
                  :items-per-page="100"
                  :footer-props="{
                     'items-per-page-options': [25, 50, 100]
                  }"
                  class="elevation-1"
              >

                <template v-slot:top>
                  <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t("viewMetatypeRelationship.keys")}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.actions`]="{ item }">
                 <view-metatype-relationship-key-dialog :metatypeRelationshipKey="item" :metatypeRelationship="metatypeRelationship" :icon="true" @metatypeKeyEdited="loadKeys()"></view-metatype-relationship-key-dialog>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("viewMetatypeRelationship.close")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipT} from "../../../api/types";
import ViewMetatypeRelationshipKeyDialog
  from "@/components/ontology/metatypeRelationships/viewMetatypeRelationshipKeyDialog.vue";

@Component({components: {
    ViewMetatypeRelationshipKeyDialog
  }})
export default class ViewMetatypeRelationshipDialog extends Vue {
  @Prop({required: true})
  metatypeRelationship!: MetatypeRelationshipT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  keysLoading = false
  dialog = false
  selectedMetatypeRelationship: MetatypeRelationshipT | null  = null
  valid = false

  // this way we only load the keys when the edit dialog is open, so we don't
  // overload someone using this in a list
  @Watch('dialog', {immediate: true})
  isDialogOpen() {
    if(this.dialog) {
      this.loadKeys()
    }
  }

  headers() {
    return  [
      { text: this.$t('viewMetatypeRelationship.keyName'), value: 'name' },
      { text: this.$t('viewMetatypeRelationship.keyDescription'), value: 'description'},
      { text: this.$t('viewMetatypeRelationship.keyType'), value: 'data_type'},
      { text: this.$t('viewMetatypeRelationship.actions'), value: 'actions', sortable: false }
    ]
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedMetatypeRelationship = JSON.parse(JSON.stringify(this.metatypeRelationship))
  }

  loadKeys() {
    if(this.selectedMetatypeRelationship) {
      this.keysLoading = true
      this.$client.listMetatypeRelationshipKeys(this.selectedMetatypeRelationship.container_id, this.selectedMetatypeRelationship.id!)
          .then(keys => {
            if(this.selectedMetatypeRelationship) {
              this.selectedMetatypeRelationship.keys = keys
              this.keysLoading = false
              this.$forceUpdate()
            }
          })
          .catch(e => {
            this.errorMessage = e
            this.keysLoading = false
          })
    }
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