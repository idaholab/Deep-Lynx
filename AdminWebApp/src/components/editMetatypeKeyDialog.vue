<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editMetatypeKey.editMetatypeKey")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeKey">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('editMetatypeKey.edit')}} {{selectedMetatypeKey.name}}</span>
          <v-row>
            <v-col v-if="comparisonMetatypeKey" :cols="6">

              <v-form class="disabled">
                <v-text-field
                    v-model="comparisonMetatypeKey.name"
                    disabled
                >
                  <template v-slot:label>{{$t('editMetatypeKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="comparisonMetatypeKey.property_name"
                    disabled
                >
                  <template v-slot:label>{{$t('editMetatypeKey.propertyName')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="comparisonMetatypeKey.data_type"
                    :items="dataTypes"
                    disabled
                >
                  <template v-slot:label>{{$t('editMetatypeKey.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    disabled
                    v-model="comparisonMetatypeKey.required"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.required')}} <small style="color:#ff0000" >*</small></template>
                </v-checkbox>
                <v-textarea
                    v-model="comparisonMetatypeKey.description"
                    :rows="2"
                    disabled
                >
                  <template v-slot:label>{{$t('editMetatypeKey.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <h3>{{$t('editMetatypeKey.validation')}}</h3>
                <v-text-field
                    v-model="comparisonMetatypeKey.validation.regex"
                    disabled
                    :label="$t('editMetatypeKey.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.regexHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="comparisonMetatypeKey.validation.max"
                    type="number"
                    :label="$t('editMetatypeKey.max')"
                    disabled
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.maxHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="comparisonMetatypeKey.validation.min"
                    disabled
                    type="number"
                    :label="$t('editMetatypeKey.min')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.minHelp')"></info-tooltip></template>
                </v-text-field>



                <!-- default value and options should be comboboxes when set to enumeration -->
                <div v-if="comparisonMetatypeKey.data_type === 'enumeration'" >
                  <v-combobox
                      v-model="comparisonMetatypeKey.default_value"
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
                      v-model="comparisonMetatypeKey.default_value"
                      type="number"
                      disabled
                      :label="$t('editMetatypeKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="comparisonMetatypeKey.data_type === 'boolean'"
                      v-model="comparisonMetatypeKey.default_value"
                      disabled
                      :label="$t('editMetatypeKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      disabled
                      v-model="comparisonMetatypeKey.default_value"
                      :label="$t('editMetatypeKey.defaultValue')"
                  ></v-text-field>
                </div>

                <v-combobox
                    v-model="comparisonMetatypeKey.options"
                    :label="$t('editMetatypeKey.options')"
                    multiple
                    clearable
                    disabled
                    chips
                    deletable-chips
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatypeKey.requiredField')}}</p>
            </v-col>


            <v-col :cols="(comparisonMetatypeKey) ? 6 : 12">
              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="selectedMetatypeKey.name"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.name !== comparisonMetatypeKey.name) ? 'edited-field' : ''"
                    :rules="[v => !!v || $t('editMetatypeKey.nameRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="selectedMetatypeKey.property_name"
                    :rules="[v => !!v || $t('editMetatypeKey.propertyNameRequired')]"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.property_name !== comparisonMetatypeKey.property_name) ? 'edited-field' : ''"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeKey.propertyName')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="selectedMetatypeKey.data_type"
                    :items="dataTypes"
                    @change="selectedMetatypeKey.default_value = undefined"
                    :rules="[v => !!v || $t('editMetatypeKey.dataTypeRequired')]"
                    required
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.data_type !== comparisonMetatypeKey.data_type) ? 'edited-field' : ''"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    v-model="selectedMetatypeKey.required"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.required')}} <small style="color:#ff0000" >*</small></template>
                </v-checkbox>
                <v-textarea
                    v-model="selectedMetatypeKey.description"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.description !== comparisonMetatypeKey.description) ? 'edited-field' : ''"
                    :rows="2"
                    :rules="[v => !!v || $t('editMetatypeKey.descriptionRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <h3>{{$t('editMetatypeKey.validation')}}</h3>
                <v-text-field
                    v-model="selectedMetatypeKey.validation.regex"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.validation.regex !== comparisonMetatypeKey.validation.regex) ? 'edited-field' : ''"
                    :label="$t('editMetatypeKey.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.regexHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="selectedMetatypeKey.validation.max"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.validation.max !== comparisonMetatypeKey.validation.max) ? 'edited-field' : ''"
                    :disabled="selectedMetatypeKey.validation.regex === ''"
                    type="number"
                    :label="$t('editMetatypeKey.max')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.maxHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="selectedMetatypeKey.validation.min"
                    :class="(comparisonMetatypeKey && selectedMetatypeKey.validation.min !== comparisonMetatypeKey.validation.min) ? 'edited-field' : ''"
                    :disabled="selectedMetatypeKey.validation.regex === ''"
                    type="number"
                    :label="$t('editMetatypeKey.min')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.minHelp')"></info-tooltip></template>
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
                </div>

                <div v-if="selectedMetatypeKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="selectedMetatypeKey.data_type === 'number'"
                      v-model="selectedMetatypeKey.default_value"
                      :class="(comparisonMetatypeKey && selectedMetatypeKey.default_value !== comparisonMetatypeKey.default_value) ? 'edited-field' : ''"
                      type="number"
                      :label="$t('editMetatypeKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="selectedMetatypeKey.data_type === 'boolean'"
                      v-model="selectedMetatypeKey.default_value"
                      :class="(comparisonMetatypeKey && selectedMetatypeKey.default_value !== comparisonMetatypeKey.default_value) ? 'edited-field' : ''"
                      :label="$t('editMetatypeKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="selectedMetatypeKey.default_value"
                      :class="(comparisonMetatypeKey && selectedMetatypeKey.default_value !== comparisonMetatypeKey.default_value) ? 'edited-field' : ''"
                      :label="$t('editMetatypeKey.defaultValue')"
                  ></v-text-field>
                </div>

                <v-combobox
                    v-model="selectedMetatypeKey.options"
                    :label="$t('editMetatypeKey.options')"
                    multiple
                    clearable
                    chips
                    deletable-chips
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatypeKey.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editMetatypeKey.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="editMetatypeKey()">{{$t("editMetatypeKey.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeKeyT, MetatypeT} from "../api/types";

@Component
export default class EditMetatypeKeyDialog extends Vue {
  @Prop({required: true})
  metatype!: MetatypeT;

  @Prop({required: true})
  metatypeKey!: MetatypeKeyT;

  @Prop({required: true, default: undefined})
  comparisonMetatypeKey!: MetatypeKeyT | undefined;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  formValid = false
  selectedMetatypeKey: MetatypeKeyT | null  = null
  dataTypes = ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"]
  booleanOptions = [true, false]

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(this.dialog) this.selectedMetatypeKey = JSON.parse(JSON.stringify(this.metatypeKey))

    if(this.selectedMetatypeKey && !this.selectedMetatypeKey.validation) {
      this.selectedMetatypeKey.validation = {regex: "", min: 0, max: 0}
    }
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedMetatypeKey = JSON.parse(JSON.stringify(this.metatypeKey))

    if(this.selectedMetatypeKey && !this.selectedMetatypeKey.validation) {
      this.selectedMetatypeKey.validation = {regex: "", min: 0, max: 0}
    }
  }

  editMetatypeKey() {
    if(this.selectedMetatypeKey) {
      this.selectedMetatypeKey.container_id = this.metatype.container_id;
      this.$client.updateMetatypeKey(this.metatype.container_id,this.metatype.id, this.selectedMetatypeKey?.id!, this.selectedMetatypeKey)
          .then(result => {
            if(!result) {
              this.errorMessage = this.$t('editMetatypeKey.errorUpdatingAPI') as string
            } else {
              this.dialog = false
              this.$emit('metatypeKeyEdited')
            }
          })
          .catch(e => this.errorMessage = this.$t('editMetatypeKey.errorUpdatingAPI') as string + e)
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
    background: #FB8C00;
    color: white !important;
    box-shadow: -5px 0 0 #FB8C00;
  }

  textarea {
    background: #FB8C00;
    color: white !important;
    box-shadow: -5px 0 0 #FB8C00;
  }

  .v-select__slot {
    background: #FB8C00;
    color: white !important;
    box-shadow: -5px 0 0 #FB8C00;
  }

  .v-select__selection {
    background: #FB8C00;
    color: white !important;
    box-shadow: -5px 0 0 #FB8C00;
  }
}
</style>
