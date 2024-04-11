<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("classes.editProperty")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2" v-if="selectedMetatypeKey">
      <v-card-title>
        <span class="headline text-h3">{{$t('general.edit')}} {{selectedMetatypeKey.name}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col v-if="comparisonMetatypeKey" :cols="6">

            <v-form class="disabled">
              <v-text-field
                  :value="comparisonMetatypeKey.name"
                  disabled
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>

              <v-text-field
                  :value="comparisonMetatypeKey.property_name"
                  disabled
              >
                <template v-slot:label>{{$t('properties.name')}} <small style="color:red" >*</small></template>
              </v-text-field>
              <v-select
                  :value="comparisonMetatypeKey.data_type"
                  :items="dataTypes"
                  disabled
              >
                <template v-slot:label>{{$t('general.dataType')}} <small style="color:red" >*</small></template>
              </v-select>
              <v-checkbox
                  disabled
                  :value="comparisonMetatypeKey.required"
              >
                <template v-slot:label>{{$t('validation.required')}} <small style="color:#ff0000" >*</small></template>
              </v-checkbox>
              <v-textarea
                  :value="comparisonMetatypeKey.description"
                  :rows="2"
                  disabled
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:#ff0000" >*</small></template>
              </v-textarea>

              <h3>{{$t('validation.validation')}}</h3>
              <v-text-field
                  :value="comparisonMetatypeKey.validation?.regex"
                  disabled
                  :label="$t('validation.regex')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
              </v-text-field>

              <v-text-field
                  :value="comparisonMetatypeKey.validation?.max"
                  type="number"
                  :label="$t('validation.max')"
                  disabled
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
              </v-text-field>

              <v-text-field
                  :value="comparisonMetatypeKey.validation?.min"
                  disabled
                  type="number"
                  :label="$t('validation.min')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.min')"></info-tooltip></template>
              </v-text-field>



              <!-- default value and options should be comboboxes when set to enumeration -->
              <div v-if="comparisonMetatypeKey.data_type === 'enumeration'" >
                <v-combobox
                    :value="comparisonMetatypeKey.default_value"
                    multiple
                    chips
                    clearable
                    disabled
                    deletable-chips
                ></v-combobox>
              </div>

              <div v-if="comparisonMetatypeKey.data_type !== 'enumeration'" >
                <v-text-field
                    v-if="comparisonMetatypeKey.data_type === 'number'"
                    :value="comparisonMetatypeKey.default_value"
                    type="number"
                    disabled
                    :label="$t('general.defaultValue')"
                ></v-text-field>
                <v-select
                    v-else-if="comparisonMetatypeKey.data_type === 'boolean'"
                    :value="comparisonMetatypeKey.default_value"
                    disabled
                    :label="$t('general.defaultValue')"
                    :items="booleanOptions"
                    required
                >
                </v-select>
                <v-text-field
                    v-else
                    disabled
                    :value="comparisonMetatypeKey.default_value"
                    :label="$t('general.defaultValue')"
                ></v-text-field>
              </div>

              <v-combobox
                  :value="comparisonMetatypeKey.options"
                  :label="$t('general.options')"
                  multiple
                  clearable
                  disabled
                  chips
                  deletable-chips
              ></v-combobox>
            </v-form>
          </v-col>


          <v-col :cols="(comparisonMetatypeKey) ? 6 : 12">
            <v-form
                ref="form"
                v-model="formValid"
            >
              <v-text-field
                  v-model="selectedMetatypeKey.name"
                  :class="(comparisonMetatypeKey && selectedMetatypeKey.name !== comparisonMetatypeKey.name) ? 'edited-field' : ''"
                  :rules="[validationRule]"
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>

              <v-text-field
                  v-model="selectedMetatypeKey.property_name"
                  :rules="[validationRule]"
                  :class="(comparisonMetatypeKey && selectedMetatypeKey.property_name !== comparisonMetatypeKey.property_name) ? 'edited-field' : ''"
                  required
              >
                <template v-slot:label>{{$t('properties.name')}} <small style="color:red" >*</small></template>
                <template slot="append-outer"><info-tooltip :message="$t('help.propertyName')"></info-tooltip> </template>
              </v-text-field>
              <v-select
                  v-model="selectedMetatypeKey.data_type"
                  :items="dataTypes"
                  @change="selectedMetatypeKey.default_value = undefined"
                  :rules="[validationRule]"
                  required
                  :class="(comparisonMetatypeKey && selectedMetatypeKey.data_type !== comparisonMetatypeKey.data_type) ? 'edited-field' : ''"
              >
                <template v-slot:label>{{$t('general.dataType')}} <small style="color:red" >*</small></template>
              </v-select>
              <v-checkbox
                  v-model="selectedMetatypeKey.required"
              >
                <template v-slot:label>{{$t('validation.required')}}</template>
              </v-checkbox>
              <v-textarea
                  v-model="selectedMetatypeKey.description"
                  :class="(comparisonMetatypeKey && selectedMetatypeKey.description !== comparisonMetatypeKey.description) ? 'edited-field' : ''"
                  :rows="2"
                  :rules="[validationRule]"
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:#ff0000" >*</small></template>
              </v-textarea>

              <h3>{{$t('validation.validation')}}</h3>
              <v-text-field
                  v-model="validationRegex"
                  :class="(comparisonMetatypeKey && validationRegex !== validationRegex) ? 'edited-field' : ''"
                  :label="$t('validation.regex')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="validationMax"
                  :class="(comparisonMetatypeKey && validationMax !== validationMax) ? 'edited-field' : ''"
                  :disabled="validationRegex === ''"
                  type="number"
                  :label="$t('validation.max')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="validationMin"
                  :class="(comparisonMetatypeKey && validationMin !== validationMin) ? 'edited-field' : ''"
                  :disabled="validationRegex === ''"
                  type="number"
                  :label="$t('validation.min')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.min')"></info-tooltip></template>
              </v-text-field>



              <!-- default value and options should be comboboxes when set to enumeration -->
              <div v-if="selectedMetatypeKey.data_type === 'enumeration'" >
                <v-combobox
                    v-model="selectedMetatypeKey.default_value"
                    multiple
                    chips
                    clearable
                    deletable-chips
                ></v-combobox>

                <v-combobox
                    v-model="selectedMetatypeKey.options"
                    :label="$t('general.options')"
                    multiple
                    clearable
                    chips
                    deletable-chips
                >
                  <template slot="append-outer"><info-tooltip :message="$t('help.enumOptions')"></info-tooltip> </template>
                </v-combobox>
              </div>

              <div v-if="selectedMetatypeKey.data_type !== 'enumeration'" >
                <v-text-field
                    v-if="selectedMetatypeKey.data_type === 'number'"
                    v-model="selectedMetatypeKey.default_value"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.default_value !== comparisonMetatypeKey.default_value) ? 'edited-field' : ''"
                    type="number"
                    :label="$t('general.defaultValue')"
                ></v-text-field>
                <v-select
                    v-else-if="selectedMetatypeKey.data_type === 'boolean'"
                    v-model="selectedMetatypeKey.default_value"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.default_value !== comparisonMetatypeKey.default_value) ? 'edited-field' : ''"
                    :label="$t('general.defaultValue')"
                    :items="booleanOptions"
                    required
                >
                </v-select>
                <v-text-field
                    v-else
                    v-model="selectedMetatypeKey.default_value"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.default_value !== comparisonMetatypeKey.default_value) ? 'edited-field' : ''"
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
        <v-btn color="primary" text @click="editMetatypeKey()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import {MetatypeKeyT, MetatypeT} from "../../../api/types";

  interface EditMetatypeKeyDialogModel {
    errorMessage: string
    dialog: boolean
    formValid: boolean
    selectedMetatypeKey: MetatypeKeyT | null
    dataTypes: string[]
    booleanOptions: boolean[]
  }

  export default Vue.extend ({
    name: 'EditMetatypeKeyDialog',

    props: {
      metatype: {
        type: Object as PropType<MetatypeT>,
        required: true
      },
      metatypeKey: {
        type: Object as PropType<MetatypeKeyT>,
        required: true
      },
      comparisonMetatypeKey: {
        type: [Object, undefined] as PropType<MetatypeKeyT | undefined>,
        required: false,
        default: undefined
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): EditMetatypeKeyDialogModel => ({
      errorMessage: "",
      dialog: false,
      formValid: false,
      selectedMetatypeKey: null,
      dataTypes: ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"],
      booleanOptions: [true, false],
    }),

    watch: {
      dialog: {
        immediate: true,
        handler(newDialog) {
          if(newDialog) this.selectedMetatypeKey = Object.assign({}, this.metatypeKey)
          if(this.selectedMetatypeKey && !this.selectedMetatypeKey.validation) {
            this.selectedMetatypeKey.validation = {regex: "", min: 0, max: 0}
          }
        }
      }
    },

    methods: {
      editMetatypeKey() {
        if(this.selectedMetatypeKey) {
          this.selectedMetatypeKey.container_id = this.metatype.container_id;
          this.$client.updateMetatypeKey(this.metatype.container_id,this.metatype.id!, this.selectedMetatypeKey?.id!, this.selectedMetatypeKey)
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
    },

    computed: {
      validationRegex: {
        get(): string {
          // Add a null check here
          if (this.selectedMetatypeKey && this.selectedMetatypeKey.validation) {
            return this.selectedMetatypeKey.validation.regex || '';
          }
          return '';
        },
        set(value: string): void {
          if (this.selectedMetatypeKey && this.selectedMetatypeKey.validation) {
            this.selectedMetatypeKey.validation.regex = value;
          }
        }
      },
      validationMax: {
        get(): number {
          if (this.selectedMetatypeKey && this.selectedMetatypeKey.validation) {
            return this.selectedMetatypeKey.validation?.max || 0;
          }
          return 0;
        },
        set(value: number): void {
          if (this.selectedMetatypeKey && this.selectedMetatypeKey.validation) {
            this.selectedMetatypeKey.validation.max = value;
          }
        }
      },
      validationMin: {
        get(): number {
          if (this.selectedMetatypeKey && this.selectedMetatypeKey.validation) {
            return this.selectedMetatypeKey.validation?.min || 0;
          }
          return 0;
        },
        set(value: number): void {
          if (this.selectedMetatypeKey && this.selectedMetatypeKey.validation) {
            this.selectedMetatypeKey.validation.min = value;
          }
        }
      },
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