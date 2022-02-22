<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="50%">
    <template v-slot:activator="{ on }">
      <v-icon
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
    </template>

    <v-card v-if="selectedMetatypeKey">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <v-row>
            <v-col :cols="12">
              <h3>{{$t('viewMetatype.name')}}</h3>
              <hr>
              <p>{{selectedMetatypeKey.name}}</p>

              <h3>{{$t('viewMetatype.description')}}</h3>
              <hr>
              <p>{{selectedMetatypeKey.description}}</p>

              <h3>{{$t('viewMetatype.propertyName')}}</h3>
              <hr>
              <p>{{selectedMetatypeKey.property_name}}</p>

              <h3>{{$t('viewMetatype.dataType')}}</h3>
              <hr>
              <p>{{selectedMetatypeKey.data_type}}</p>

              <v-checkbox
                  v-model="selectedMetatypeKey.required"
                  :disabled="true"
              >
                <template v-slot:label>{{$t('editMetatypeKey.required')}}</template>
              </v-checkbox>



                <h3>{{$t('editMetatypeKey.validation')}}</h3>
                <v-text-field
                    v-model="selectedMetatypeKey.validation.regex"
                    :disabled="true"
                    :label="$t('editMetatypeKey.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.regexHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="selectedMetatypeKey.validation.max"
                    :disabled="selectedMetatypeKey.validation.regex === ''"
                    type="number"
                    :label="$t('editMetatypeKey.max')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeKey.maxHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="selectedMetatypeKey.validation.min"
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

                <v-combobox
                    v-model="selectedMetatypeKey.options"
                    :label="$t('editMetatypeKey.options')"
                    multiple
                    clearable
                    chips
                    deletable-chips
                    :disabled="true"
                ></v-combobox>

              <h3>{{$t('viewMetatype.defaultValue')}}</h3>
              <hr>
              <p>{{selectedMetatypeKey.default_value}}</p>

            </v-col>
          </v-row>
        </v-container>
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
import {MetatypeKeyT, MetatypeT} from "../api/types";

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
