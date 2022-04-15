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
              <template v-slot:label>{{$t('viewMetatypeKey.name')}}</template>
            </v-text-field>

            <v-text-field
                v-model="selectedMetatypeKey.property_name"
                required
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('viewMetatypeKey.propertyName')}}</template>
            </v-text-field>
            <v-select
                v-model="selectedMetatypeKey.data_type"
                :items="dataTypes"
                @change="selectedMetatypeKey.default_value = undefined"
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('viewMetatypeKey.dataType')}}</template>
            </v-select>

            <v-checkbox
                v-model="selectedMetatypeKey.required"
                :disabled="true"
                class="disabled"
            >
              <template v-slot:label>{{$t('editMetatypeKey.required')}}</template>
            </v-checkbox>



              <h3>{{$t('editMetatypeKey.validation')}}</h3>
              <v-text-field
                  v-model="selectedMetatypeKey.validation.regex"
                  :disabled="true"
                  :label="$t('editMetatypeKey.regex')"
                  class="disabled"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.regexHelp')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="selectedMetatypeKey.validation.max"
                  :disabled="true"
                  type="number"
                  :label="$t('editMetatypeKey.max')"
                  class="disabled"
              >
                <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.maxHelp')"></info-tooltip></template>
              </v-text-field>
              <v-text-field
                  v-model.number="selectedMetatypeKey.validation.min"
                  :disabled="true"
                  type="number"
                  :label="$t('editMetatypeKey.min')"
                  class="disabled"
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
                    :disabled="true"
                    class="disabled"
                ></v-combobox>
              </div>

              <v-combobox
                  v-model="selectedMetatypeKey.options"
                  :label="$t('editMetatypeKey.options')"
                  multiple
                  clearable
                  chips
                  deletable-chips
                  :disabled="true"
                  class="disabled"
              ></v-combobox>

            <h3>{{$t('viewMetatype.defaultValue')}}</h3>
            <hr>
            <p>{{selectedMetatypeKey.default_value}}</p>

          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("viewMetatypeKey.close")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeKeyT, MetatypeT} from "../../../api/types";

@Component
export default class ViewMetatypeKeyDialog extends Vue {
  @Prop({required: true})
  metatype!: MetatypeT;

  @Prop({required: true})
  metatypeKey!: MetatypeKeyT;

  errorMessage = ""
  dialog = false
  formValid = false
  selectedMetatypeKey: MetatypeKeyT | null  = null
  dataTypes = ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file", "list"]

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