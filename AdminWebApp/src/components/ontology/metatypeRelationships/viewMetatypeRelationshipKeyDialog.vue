<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationships.viewProperty")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeRelationshipKey">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{ $t('general.view') }} {{ selectedMetatypeRelationshipKey.name }}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="selectedMetatypeRelationshipKey.name"
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('general.name')}}</template>
                </v-text-field>

                <v-text-field
                    v-model="selectedMetatypeRelationshipKey.property_name"
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('properties.name')}} </template>
                  <template slot="append-outer"><info-tooltip :message="$t('help.propertyName')"></info-tooltip> </template>
                </v-text-field>
                <v-select
                    v-model="selectedMetatypeRelationshipKey.data_type"
                    :items="dataTypes"
                    @change="selectedMetatypeRelationshipKey.default_value = undefined"
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('general.dataType')}} </template>
                </v-select>
                <v-checkbox
                    v-model="selectedMetatypeRelationshipKey.required"
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('validation.required')}} </template>
                </v-checkbox>
                <v-textarea
                    v-model="selectedMetatypeRelationshipKey.description"
                    :rows="2"
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('general.description')}} </template>
                </v-textarea>

                <div v-if="selectedMetatypeRelationshipKey.validation">
                  <h3>{{$t('validation.validation')}}</h3>
                  <v-text-field
                      v-model="selectedMetatypeRelationshipKey.validation.regex"
                      :label="$t('validation.regex')"
                      :disabled="true"
                      class="disabled"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('help.regex')"></info-tooltip></template>
                  </v-text-field>
                  <v-text-field
                      v-model.number="selectedMetatypeRelationshipKey.validation.max"
                      type="number"
                      :label="$t('validation.max')"
                      :disabled="true"
                      class="disabled"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('help.max')"></info-tooltip></template>
                  </v-text-field>
                  <v-text-field
                      v-model.number="selectedMetatypeRelationshipKey.validation.min"
                      type="number"
                      :label="$t('validation.min')"
                      :disabled="true"
                      class="disabled"
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
                      :disabled="true"
                      class="disabled"
                  ></v-combobox>
                </div>

                <v-combobox
                    v-model="selectedMetatypeRelationshipKey.options"
                    :label="$t('general.options')"
                    multiple
                    clearable
                    deletable-chips
                    chips
                    :disabled="true"
                    class="disabled"
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
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
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../../../api/types";

@Component
export default class ViewMetatypeRelationshipKeyDialog extends Vue {
  @Prop({required: true})
  metatypeRelationship!: MetatypeRelationshipT;

  @Prop({required: true})
  metatypeRelationshipKey!: MetatypeRelationshipKeyT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  formValid = false
  selectedMetatypeRelationshipKey: MetatypeRelationshipKeyT | null  = null
  dataTypes = ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"]
  booleanOptions = [true, false]

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(this.dialog){
      this.selectedMetatypeRelationshipKey = JSON.parse(JSON.stringify(this.metatypeRelationshipKey))

      if(this.selectedMetatypeRelationshipKey && !this.selectedMetatypeRelationshipKey.validation) {
        this.selectedMetatypeRelationshipKey.validation = {regex: "", min: 0, max: 0}
      }
    }
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedMetatypeRelationshipKey = JSON.parse(JSON.stringify(this.metatypeRelationshipKey))

    if(this.selectedMetatypeRelationshipKey && !this.selectedMetatypeRelationshipKey.validation) {
      this.selectedMetatypeRelationshipKey.validation = {regex: "", min: 0, max: 0}
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