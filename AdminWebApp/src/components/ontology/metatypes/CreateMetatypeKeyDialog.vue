<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("classes.newProperty")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('classes.newProperty')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="formValid"
            >
              <v-text-field
                  v-model="metatypeKey.name"
                  :rules="[validationRule]"
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>

              <v-text-field
                  v-model="metatypeKey.property_name"
                  :rules="[validationRule, validatePropertyName]"
                  required
              >
                <template v-slot:label>{{$t('properties.name')}} <small style="color:red" >*</small></template>
                <template slot="append-outer"><info-tooltip :message="$t('help.propertyName')"></info-tooltip> </template>
              </v-text-field>
              <v-select
                  v-model="metatypeKey.data_type"
                  :items="dataTypes"
                  @change="metatypeKey.default_value = undefined"
                  :rules="[validationRule]"
                  required
              >
                <template v-slot:label>{{$t('general.dataType')}} <small style="color:red" >*</small></template>
              </v-select>
              <v-checkbox
                  v-model="metatypeKey.required"
              >
                <template v-slot:label>{{$t('validation.required')}}</template>
              </v-checkbox>
              <v-textarea
                  v-model="metatypeKey.description"
                  :rows="2"
                  :rules="[validationRule]"
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:#ff0000" >*</small></template>
              </v-textarea>

              <h3>{{$t('validation.validation')}}</h3>
              <v-text-field
                  v-model="validationRegex"
                  :label="$t('validation.regex')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="validationMax"
                  :disabled="validationRegex === ''"
                  type="number"
                  :label="$t('validation.max')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="validationMin"
                  :disabled="validationRegex === ''"
                  type="number"
                  :label="$t('validation.min')"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('help.min')"></info-tooltip></template>
              </v-text-field>



              <!-- default value and options should be comboboxes when set to enumeration -->
              <div v-if="metatypeKey.data_type && metatypeKey.data_type === 'enumeration'" >
                <v-combobox
                    v-model="metatypeKey.default_value"
                    multiple
                    clearable
                    deletable-chips
                    chips
                    :label="$t('general.defaultValue')"
                ></v-combobox>

                <v-combobox
                    v-model="metatypeKey.options"
                    :label="$t('general.options')"
                    multiple
                    clearable
                    deletable-chips
                    chips
                >
                  <template slot="append-outer"><info-tooltip :message="$t('help.enumOptions')"></info-tooltip> </template>
                </v-combobox>
              </div>

              <div v-if="metatypeKey.data_type !== 'enumeration'" >
                <v-text-field
                    v-if="metatypeKey.data_type === 'number'"
                    v-model="metatypeKey.default_value"
                    type="number"
                    :label="$t('general.defaultValue')"
                ></v-text-field>
                <v-select
                    v-else-if="metatypeKey.data_type === 'boolean'"
                    v-model="metatypeKey.default_value"
                    :label="$t('general.defaultValue')"
                    :items="booleanOptions"
                    required
                >
                </v-select>
                <v-text-field
                    v-else
                    v-model="metatypeKey.default_value"
                    :label="$t('general.defaultValue')"
                    :disabled="metatypeKey.data_type === 'file'"
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
  import {MetatypeKeyT, MetatypeT} from "../../../api/types";

  interface CreateMetatypeKeyDialogModel {
    errorMessage: string
    dialog: boolean
    formValid: boolean
    metatypeKey: MetatypeKeyT
    dataTypes: string[]
    booleanOptions: boolean[]
  }

  export default Vue.extend ({
    name: 'CreateMetatypeKeyDialog',

    props: {
      metatype: {
        type: Object as PropType<MetatypeT>,
        required: true,
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): CreateMetatypeKeyDialogModel => ({
      errorMessage: "",
      dialog: false,
      formValid: false,
      metatypeKey: {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeKeyT,
      dataTypes: ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"],
      booleanOptions: [true, false]
    }),

    watch: {
      dialog: {
        immediate: true,
        handler(newDialog) {
         // @ts-ignore
          if(newDialog) this.metatypeKey = {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeKeyT
        }
      }
    },

    methods: {
      createMetatypeKey() {
        if(this.metatypeKey) {
          this.metatypeKey.container_id = this.metatype.container_id
          this.$client.createMetatypeKey(this.metatype.container_id, this.metatype.id!, this.metatypeKey)
          .then(result => {
            if(!result) {
              this.errorMessage = this.$t('errors.errorCommunicating') as string
            } else {
              this.dialog = false
                this.$emit('metatypeKeyCreated', result[0])
            }
          })
          .catch(e => {
            this.errorMessage = this.$t('errors.errorCommunicating') as string + e
          })
        }
      },
      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      },
      validatePropertyName(name: string) {
        // this regex should disallow spaces
        const matches = /^[^ ]+$/.exec(name)
        if(!matches || matches.length === 0) {
          return this.$t('help.propertyNameRegex');
        }

        return true;
      },
    },

    computed: {
      validationRegex: {
        get(): string {
          return this.metatypeKey.validation?.regex || '';
        },
        set(value: string): void {
          if (this.metatypeKey.validation) {
            this.metatypeKey.validation.regex = value;
          }
        }
      },
      validationMax: {
        get(): number {
          return this.metatypeKey.validation?.max || 0;
        },
        set(value: number): void {
          if (this.metatypeKey.validation) {
            this.metatypeKey.validation.max = value;
          }
        }
      },
      validationMin: {
        get(): number {
          return this.metatypeKey.validation?.min || 0;
        },
        set(value: number): void {
          if (this.metatypeKey.validation) {
            this.metatypeKey.validation.min = value;
          }
        }
      },
    }
  });
</script>


<style lang="scss" scoped>
  .v-dialog {
    width: 60%;
  }
</style>
