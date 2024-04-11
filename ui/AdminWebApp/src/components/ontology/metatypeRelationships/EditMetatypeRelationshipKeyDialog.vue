<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationships.editProperty")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeRelationshipKey">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
          <span class="headline">{{ $t('general.edit') }} {{ selectedMetatypeRelationshipKey.name }}</span>
          <v-row>
            <v-col v-if="comparisonRelationshipKey" :cols="6">

              <v-form class="disabled">
                <v-text-field
                    :value="comparisonRelationshipKey.name"
                    disabled
                >
                  <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    :value="comparisonRelationshipKey.property_name"
                    disabled
                >
                  <template v-slot:label>{{$t('properties.name')}} <small style="color:red" >*</small></template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.propertyName')"></info-tooltip> </template>
                </v-text-field>
                <v-select
                    :value="comparisonRelationshipKey.data_type"
                    :items="dataTypes"
                    disabled
                >
                  <template v-slot:label>{{$t('general.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    disabled
                    :value="comparisonRelationshipKey.required"
                >
                  <template v-slot:label>{{$t('validation.required')}} <small style="color:#ff0000" >*</small></template>
                </v-checkbox>
                <v-textarea
                    :value="comparisonRelationshipKey.description"
                    :rows="2"
                    disabled
                >
                  <template v-slot:label>{{$t('general.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <h3>{{$t('validation.validation')}}</h3>
                <v-text-field
                    :value="comparisonRelationshipKey.validation.regex"
                    disabled
                    :label="$t('validation.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    :value="comparisonRelationshipKey.validation.max"
                    type="number"
                    :label="$t('validation.max')"
                    disabled
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    :value="comparisonRelationshipKey.validation.min"
                    disabled
                    type="number"
                    :label="$t('validation.min')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('help.min')"></info-tooltip></template>
                </v-text-field>



                <!-- default value and options should be comboboxes when set to enumeration -->
                <div v-if="comparisonRelationshipKey.data_type === 'enumeration'" >
                  <v-combobox
                      :value="comparisonRelationshipKey.default_value"
                      multiple
                      chips
                      clearable
                      disabled
                      deletable-chips
                  ></v-combobox>
                </div>

                <div v-if="comparisonRelationshipKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="comparisonRelationshipKey.data_type === 'number'"
                      :value="comparisonRelationshipKey.default_value"
                      type="number"
                      disabled
                      :label="$t('general.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="comparisonRelationshipKey.data_type === 'boolean'"
                      :value="comparisonRelationshipKey.default_value"
                      disabled
                      :label="$t('general.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      disabled
                      :value="comparisonRelationshipKey.default_value"
                      :label="$t('general.defaultValue')"
                  ></v-text-field>
                </div>

                <v-combobox
                    :value="comparisonRelationshipKey.options"
                    :label="$t('general.options')"
                    multiple
                    clearable
                    disabled
                    chips
                    deletable-chips
                ></v-combobox>
              </v-form>
            </v-col>

            <v-col :cols="(comparisonRelationshipKey) ? 6 : 12">
              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="selectedMetatypeRelationshipKey.name"
                    :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.name !== comparisonRelationshipKey.name) ? 'edited-field' : ''"
                    :rules="[validationRule]"
                >
                  <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="selectedMetatypeRelationshipKey.property_name"
                    :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.property_name !== comparisonRelationshipKey.property_name) ? 'edited-field' : ''"
                    :rules="[validationRule]"
                    required
                >
                  <template v-slot:label>{{$t('properties.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="selectedMetatypeRelationshipKey.data_type"
                    :items="dataTypes"
                    @change="selectedMetatypeRelationshipKey.default_value = undefined"
                    :rules="[validationRule]"
                    :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.data_type !== comparisonRelationshipKey.data_type) ? 'edited-field' : ''"
                    required
                >
                  <template v-slot:label>{{$t('general.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    v-model="selectedMetatypeRelationshipKey.required"
                >
                  <template v-slot:label>{{$t('validation.required')}}</template>
                </v-checkbox>
                <v-textarea
                    v-model="selectedMetatypeRelationshipKey.description"
                    :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.description !== comparisonRelationshipKey.description) ? 'edited-field' : ''"
                    :rows="2"
                    :rules="[validationRule]"
                >
                  <template v-slot:label>{{$t('general.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <div v-if="selectedMetatypeRelationshipKey.validation">
                  <h3>{{$t('validation.validation')}}</h3>
                  <v-text-field
                      v-model="selectedMetatypeRelationshipKey.validation.regex"
                      :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.validation.regex !== comparisonRelationshipKey.validation.regex) ? 'edited-field' : ''"
                      :label="$t('validation.regex')"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
                  </v-text-field>
                  <v-text-field
                      v-model.number="selectedMetatypeRelationshipKey.validation.max"
                      :disabled="selectedMetatypeRelationshipKey.validation.regex === ''"
                      type="number"
                      :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.validation.max !== comparisonRelationshipKey.validation.max) ? 'edited-field' : ''"
                      :label="$t('validation.max')"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
                  </v-text-field>
                  <v-text-field
                      v-model.number="selectedMetatypeRelationshipKey.validation.min"
                      :disabled="selectedMetatypeRelationshipKey.validation.regex === ''"
                      type="number"
                      :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.validation.min !== comparisonRelationshipKey.validation.min) ? 'edited-field' : ''"
                      :label="$t('validation.min')"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('help.min')"></info-tooltip></template>
                  </v-text-field>
                </div>

                <!-- default value and options should be comboboxes when set to enumeration -->
                <div v-if="selectedMetatypeRelationshipKey.data_type === 'enumeration'" >
                  <v-combobox
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      multiple
                      clearable
                      deletable-chips
                      chips
                  ></v-combobox>

                  <v-combobox
                      v-model="selectedMetatypeRelationshipKey.options"
                      :label="$t('general.options')"
                      multiple
                      clearable
                      deletable-chips
                      chips
                  >
                    <template slot="append-outer"><info-tooltip :message="$t('help.enumOptions')"></info-tooltip> </template>
                  </v-combobox>
                </div>

                <div v-if="selectedMetatypeRelationshipKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="selectedMetatypeRelationshipKey.data_type === 'number'"
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      type="number"
                      :label="$t('general.defaultValue')"
                      :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.default_value !== comparisonRelationshipKey.default_value) ? 'edited-field' : ''"
                  ></v-text-field>
                  <v-select
                      v-else-if="selectedMetatypeRelationshipKey.data_type === 'boolean'"
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      :label="$t('general.defaultValue')"
                      :items="booleanOptions"
                      :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.data_type !== comparisonRelationshipKey.data_type) ? 'edited-field' : ''"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      :label="$t('general.defaultValue')"
                      :class="(comparisonRelationshipKey && selectedMetatypeRelationshipKey.default_value !== comparisonRelationshipKey.default_value) ? 'edited-field' : ''"
                  ></v-text-field>
                </div>

              </v-form>
              <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!formValid" text @click="editMetatypeKey()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../../../api/types";

  interface EditMetatypeRelationshipKeyDialogModel {
    selectedMetatypeRelationshipKey: MetatypeRelationshipKeyT | null
    errorMessage: string
    dialog: boolean
    formValid: boolean
    dataTypes: string[]
    booleanOptions: boolean[]
  }

  export default Vue.extend ({
    name: 'EditMetatypeRelationshipKeyDialog',

    props: {
      metatypeRelationship: {
        type: Object as PropType<MetatypeRelationshipT>,
        required: true
      },
      metatypeRelationshipKey: {
        type: Object as PropType<MetatypeRelationshipKeyT>,
        required: true
      },
      comparisonRelationshipKey: {
        type: [Object, undefined] as PropType<MetatypeRelationshipKeyT | undefined>,
        required: false, 
        default: undefined
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): EditMetatypeRelationshipKeyDialogModel => ({
      selectedMetatypeRelationshipKey:  null,
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
          if(newDialog){
            this.selectedMetatypeRelationshipKey = JSON.parse(JSON.stringify(this.metatypeRelationshipKey))

            if(this.selectedMetatypeRelationshipKey && !this.selectedMetatypeRelationshipKey.validation) {
              this.selectedMetatypeRelationshipKey.validation = {regex: "", min: 0, max: 0}
            }
          }
        }
      },
    },

    mounted() {
      // have to do this to avoid mutating properties
      this.selectedMetatypeRelationshipKey = JSON.parse(JSON.stringify(this.metatypeRelationshipKey))

      if(this.selectedMetatypeRelationshipKey && !this.selectedMetatypeRelationshipKey.validation) {
        this.selectedMetatypeRelationshipKey.validation = {regex: "", min: 0, max: 0}
      }
    },

    methods: {
      editMetatypeKey() {
        if(this.selectedMetatypeRelationshipKey) {
          this.selectedMetatypeRelationshipKey.container_id = this.metatypeRelationship.container_id;
          this.$client.updateMetatypeRelationshipKey(this.metatypeRelationship.container_id,this.metatypeRelationship.id!, this.selectedMetatypeRelationshipKey?.id!, this.selectedMetatypeRelationshipKey)
              .then(result => {
                if(!result) {
                  this.errorMessage = this.$t('errors.errorCommunicating') as string
                } else {
                  this.dialog = false
                  this.$emit('metatypeKeyEdited')
                }
              })
              .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
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