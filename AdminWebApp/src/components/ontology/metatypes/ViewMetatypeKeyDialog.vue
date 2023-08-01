<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="50%">
    <template v-slot:activator="{ on }">
      <v-icon
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
    </template>

    <v-card class="pt-1 pb-3 px-2" v-if="selectedMetatypeKey">
      <v-card-title>
        <span class="headline text-h3">{{selectedMetatypeKey.name}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>    
          <v-col :cols="12">
            <v-text-field
                v-model="selectedMetatypeKey.name"
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('general.name')}}</template>
            </v-text-field>

            <v-text-field
                v-model="selectedMetatypeKey.property_name"
                required
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('properties.name')}}</template>
              <template slot="append-outer"><info-tooltip :message="$t('help.propertyName')"></info-tooltip> </template>
            </v-text-field>
            <v-select
                v-model="selectedMetatypeKey.data_type"
                :items="dataTypes"
                @change="selectedMetatypeKey.default_value = undefined"
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('general.dataType')}}</template>
            </v-select>

            <v-checkbox
                v-model="selectedMetatypeKey.required"
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('validation.required')}}</template>
            </v-checkbox>
            <v-textarea
                v-model="selectedMetatypeKey.description"
                :rows="2"
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('general.description')}} </template>
            </v-textarea>


              <h3>{{$t('validation.validation')}}</h3>
              <v-text-field
                  v-model="validationRegex"
                  :disabled="true"
                  :label="$t('validation.regex')"
                  class="disabled"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="validationMax"
                  :disabled="true"
                  type="number"
                  :label="$t('validation.max')"
                  class="disabled"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="validationMin"
                  :disabled="true"
                  type="number"
                  :label="$t('validation.min')"
                  class="disabled"
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
                    :disabled="true"
                    class="disabled"
                ></v-combobox>
              </div>

              <v-combobox
                  v-model="selectedMetatypeKey.options"
                  :label="$t('general.options')"
                  multiple
                  clearable
                  chips
                  deletable-chips
                  :disabled="true"
                  class="disabled"
              ></v-combobox>

            <h3>{{$t('general.defaultValue')}}</h3>
            <hr>
            <p>{{selectedMetatypeKey.default_value}}</p>

          </v-col>
        </v-row>
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
  import {MetatypeKeyT, MetatypeT} from "../../../api/types";

  interface ViewMetatypeKeyDialogModel {
    errorMessage: string
    dialog: boolean
    formValid: boolean
    selectedMetatypeKey: MetatypeKeyT | null
    dataTypes: string[]
  }

  export default Vue.extend ({
    name: 'ViewMetatypeKeyDialog',

    props: {
      metatype: {
        type: Object as PropType<MetatypeT>,
        required: true
      },
      metatypeKey: {
        type: Object as PropType<MetatypeKeyT>,
        required: true
      },
    },

    data: (): ViewMetatypeKeyDialogModel => ({
      errorMessage: "",
      dialog: false,
      formValid: false,
      selectedMetatypeKey: null,
      dataTypes: ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file", "list"]
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