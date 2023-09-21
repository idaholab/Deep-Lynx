<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationships.newProperty")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('relationships.newProperty')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="formValid"
            >
              <v-text-field
                  v-model="metatypeRelationshipKey.name"
                  :rules="[validationRule]"
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>

              <v-text-field
                  v-model="metatypeRelationshipKey.property_name"
                  :rules="[validationRule]"
                  required
              >
                <template v-slot:label>{{$t('properties.name')}} <small style="color:red" >*</small></template>
                <template slot="append-outer"><info-tooltip :message="$t('help.propertyName')"></info-tooltip> </template>
              </v-text-field>
              <v-select
                  v-model="metatypeRelationshipKey.data_type"
                  :items="dataTypes"
                  @change="metatypeRelationshipKey.default_value = undefined"
                  :rules="[validationRule]"
                  required
              >
                <template v-slot:label>{{$t('general.dataType')}} <small style="color:red" >*</small></template>
              </v-select>
              <v-checkbox
                  v-model="metatypeRelationshipKey.required"
              >
                <template v-slot:label>{{$t('validation.required')}}</template>
              </v-checkbox>
              <v-textarea
                  v-model="metatypeRelationshipKey.description"
                  :rows="2"
                  :rules="[validationRule]"
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:red" >*</small></template>
              </v-textarea>

              <h3>{{$t('validation.validation')}}</h3>
              <v-text-field
                  v-model="metatypeRelationshipKey.validation.regex"
                  :label="$t('validation.regex')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="metatypeRelationshipKey.validation.max"
                  :disabled="metatypeRelationshipKey.validation.regex === ''"
                  type="number"
                  :label="$t('validation.max')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="metatypeRelationshipKey.validation.min"
                  :disabled="metatypeRelationshipKey.validation.regex === ''"
                  type="number"
                  :label="$t('validation.min')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.min')"></info-tooltip></template>
              </v-text-field>

              <!-- default value and options should be comboboxes when set to enumeration -->
              <div v-if="metatypeRelationshipKey.data_type === 'enumeration'" >
                <v-combobox
                    v-model="metatypeRelationshipKey.default_value"
                    multiple
                    clearable
                    deletable-chips
                    chips
                ></v-combobox>

                <v-combobox
                    v-model="metatypeRelationshipKey.options"
                    :label="$t('general.options')"
                    multiple
                    clearable
                    deletable-chips
                    chips
                >
                  <template slot="append-outer"><info-tooltip :message="$t('help.enumOptions')"></info-tooltip> </template>
                </v-combobox>
              </div>

              <div v-if="metatypeRelationshipKey.data_type !== 'enumeration'" >
                <v-text-field
                    v-if="metatypeRelationshipKey.data_type === 'number'"
                    v-model="metatypeRelationshipKey.default_value"
                    type="number"
                    :label="$t('general.defaultValue')"
                ></v-text-field>
                <v-select
                    v-else-if="metatypeRelationshipKey.data_type === 'boolean'"
                    v-model="metatypeRelationshipKey.default_value"
                    :label="$t('general.defaultValue')"
                    :items="booleanOptions"
                    required
                >
                </v-select>
                <v-text-field
                    v-else
                    v-model="metatypeRelationshipKey.default_value"
                    :label="$t('general.defaultValue')"
                ></v-text-field>
              </div>

            </v-form>
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!formValid" text @click="createMetatypeKey()">{{$t("general.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../../../api/types";

  interface CreateMetatypeRelationshipKeyDialogModel {
    metatypeRelationshipKey: MetatypeRelationshipKeyT
    errorMessage: string
    dialog: boolean
    formValid: boolean
    dataTypes: string[]
    booleanOptions: boolean[]
  }

  export default Vue.extend ({
    name: 'CreateMetatypeRelationshipKeyDialog',

    props: {
      metatypeRelationship: {
        type: Object as PropType<MetatypeRelationshipT>,
        required: true
      },
      icon: {
        type: Boolean,
        required: false},
    },

    data: (): CreateMetatypeRelationshipKeyDialogModel => ({
      metatypeRelationshipKey: {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeRelationshipKeyT,
      errorMessage: "",
      dialog: false,
      formValid: false,
      dataTypes: ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"],
      booleanOptions: [true, false]
    }),

    watch: {
      dialog: {
        immediate: true,
        handler(newDialog) {
         // @ts-ignore
         if(newDialog) this.metatypeRelationshipKey = {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeRelationshipKeyT
        }
      }
    },

    methods: {
      createMetatypeKey() {
        if(this.metatypeRelationshipKey) {
          this.metatypeRelationshipKey.container_id = this.metatypeRelationship.container_id;
          this.$client.createMetatypeRelationshipKey(this.metatypeRelationship.container_id, this.metatypeRelationship.id!, this.metatypeRelationshipKey)
              .then(result => {
                if(!result) {
                  this.errorMessage = this.$t('errors.errorCommunicating') as string
                } else {
                  this.dialog = false
                  this.$emit('metatypeRelationshipKeyCreated', result[0])
                }
              })
              .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
        }
      },
      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      },
    }
  });
</script>
