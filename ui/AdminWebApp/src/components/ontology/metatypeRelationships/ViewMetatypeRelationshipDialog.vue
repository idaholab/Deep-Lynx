<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationshipTypes.view")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeRelationship">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
          <span class="headline">{{ $t('general.view') }} {{ selectedMetatypeRelationship.name }}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedMetatypeRelationship.name"
                    :rules="[validationRule]"
                    :disabled="true"
                    required
                    class="disabled"
                >
                  <template v-slot:label>{{$t('general.name')}} </template>
                </v-text-field>
                <v-textarea
                    v-model="selectedMetatypeRelationship.description"
                    :rules="[validationRule]"
                    required
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('general.description')}} </template>
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
                    <v-toolbar-title>{{$t("properties.properties")}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.actions`]="{ item }">
                 <ViewMetatypeRelationshipKeyDialog :metatypeRelationshipKey="item" :metatypeRelationship="metatypeRelationship" :icon="true" @metatypeKeyEdited="loadKeys()"></ViewMetatypeRelationshipKeyDialog>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-container>
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
  import {MetatypeRelationshipT} from "../../../api/types";
  import ViewMetatypeRelationshipKeyDialog from '@/components/ontology/metatypeRelationships/ViewMetatypeRelationshipKeyDialog.vue';

  interface ViewMetatypeRelationshipDialogModel {
    selectedMetatypeRelationship: MetatypeRelationshipT | null
    errorMessage: string
    keysLoading: boolean
    dialog: boolean
    valid: boolean
  }

  export default Vue.extend ({
    name: 'ViewMetatypeRelationshipDialog',

    components: { ViewMetatypeRelationshipKeyDialog },

    props: {
      metatypeRelationship: {
        type: Object as PropType<MetatypeRelationshipT>,
        required: true
      },
      icon: {
        type: Boolean,
        required: false},
    },

    data: (): ViewMetatypeRelationshipDialogModel => ({
      selectedMetatypeRelationship: null,
      errorMessage: "",
      keysLoading: false,
      dialog: false,
      valid: false
    }),

    watch: {
      dialog: {
        immediate: true,
        handler(newDialog) {
          if(newDialog) {
            this.loadKeys()
          }
        }
      }
    },

    mounted() {
      // have to do this to avoid mutating properties
      this.selectedMetatypeRelationship = JSON.parse(JSON.stringify(this.metatypeRelationship))
    },

    methods: {
      headers() {
        return  [
          { text: this.$t('general.name'), value: 'name' },
          { text: this.$t('general.description'), value: 'description'},
          { text: this.$t('general.dataType'), value: 'data_type'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
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
      },
      validationRule(v: any): boolean | string {
        return !!v || this.$t('validation.required');
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