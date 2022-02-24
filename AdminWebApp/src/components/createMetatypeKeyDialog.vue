<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="50%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createMetatypeKey.newKey")}}</v-btn>
    </template>

    <v-card>
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('createMetatypeKey.newKey')}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="metatypeKey.name"
                    :rules="[v => !!v || $t('createMetatypeKey.nameRequired')]"
                >
                  <template v-slot:label>{{$t('createMetatypeKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="metatypeKey.property_name"
                    :rules="[v => !!v || $t('createMetatypeKey.propertyNameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('createMetatypeKey.propertyName')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="metatypeKey.data_type"
                    :items="dataTypes"
                    @change="metatypeKey.default_value = undefined"
                    :rules="[v => !!v || $t('createMetatypeKey.dataTypeRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('createMetatypeKey.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    v-model="metatypeKey.required"
                >
                  <template v-slot:label>{{$t('createMetatypeKey.required')}} <small style="color:#ff0000" >*</small></template>
                </v-checkbox>
                <v-textarea
                    v-model="metatypeKey.description"
                    :rows="2"
                    :rules="[v => !!v || $t('createMetatypeKey.descriptionRequired')]"
                >
                  <template v-slot:label>{{$t('createMetatypeKey.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <h3>{{$t('createMetatypeKey.validation')}}</h3>
                <v-text-field
                    v-model="metatypeKey.validation.regex"
                    :label="$t('createMetatypeKey.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('createMetatypeKey.regexHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="metatypeKey.validation.max"
                    :disabled="metatypeKey.validation.regex === ''"
                    type="number"
                    :label="$t('createMetatypeKey.max')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('createMetatypeKey.maxHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="metatypeKey.validation.min"
                    :disabled="metatypeKey.validation.regex === ''"
                    type="number"
                    :label="$t('createMetatypeKey.min')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('createMetatypeKey.minHelp')"></info-tooltip></template>
                </v-text-field>



                <!-- default value and options should be comboboxes when set to enumeration -->
                <div v-if="metatypeKey.data_type === 'enumeration'" >
                  <v-combobox
                      v-model="metatypeKey.default_value"
                      multiple
                      clearable
                      deletable-chips
                      chips
                      :label="$t('createMetatypeKey.defaultValue')"
                  ></v-combobox>
                </div>

                <div v-if="metatypeKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="metatypeKey.data_type === 'number'"
                      v-model="metatypeKey.default_value"
                      type="number"
                      :label="$t('createMetatypeKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="metatypeKey.data_type === 'boolean'"
                      v-model="metatypeKey.default_value"
                      :label="$t('createMetatypeKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="metatypeKey.default_value"
                      :label="$t('createMetatypeKey.defaultValue')"
                      :disabled="metatypeKey.data_type === 'file'"
                  ></v-text-field>
                </div>

                <v-combobox
                    v-model="metatypeKey.options"
                    :label="$t('createMetatypeKey.options')"
                    multiple
                    clearable
                    deletable-chips
                    chips
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createMetatypeKey.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("createMetatypeKey.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!formValid" text @click="createMetatypeKey()">{{$t("createMetatypeKey.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeKeyT, MetatypeT} from "../api/types";

@Component
export default class CreateMetatypeKeyDialog extends Vue {
  @Prop({required: true})
  metatype!: MetatypeT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  formValid = false
  metatypeKey: MetatypeKeyT = {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeKeyT
  dataTypes = ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"]
  booleanOptions =  [true, false]

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(this.dialog) this.metatypeKey = {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeKeyT
  }

  createMetatypeKey() {
    if(this.metatypeKey) {
      this.metatypeKey.container_id = this.metatype.container_id
      this.$client.createMetatypeKey(this.metatype.container_id, this.metatype.id, this.metatypeKey)
          .then(result => {
            if(!result) {
              this.errorMessage = this.$t('createMetatypeKey.errorCreatingAPI') as string
            } else {
              this.dialog = false
              this.$emit('metatypeKeyCreated', result[0])
            }
          })
          .catch(e => this.errorMessage = this.$t('createMetatypeKey.errorCreatingAPI') as string + e)
    }
  }

}
</script>
