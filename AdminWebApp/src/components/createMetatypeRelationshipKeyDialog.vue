<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createMetatypeRelationshipKey.newKey")}}</v-btn>
    </template>

    <v-card>
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('createMetatypeRelationshipKey.newKey')}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="metatypeRelationshipKey.name"
                    :rules="[v => !!v || $t('createMetatypeRelationshipKey.nameRequired')]"
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="metatypeRelationshipKey.property_name"
                    :rules="[v => !!v || $t('createMetatypeRelationshipKey.propertyNameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipKey.propertyName')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="metatypeRelationshipKey.data_type"
                    :items="dataTypes"
                    @change="metatypeRelationshipKey.default_value = undefined"
                    :rules="[v => !!v || $t('createMetatypeRelationshipKey.dataTypeRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipKey.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    v-model="metatypeRelationshipKey.required"
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipKey.required')}} <small style="color:red" >*</small></template>
                </v-checkbox>
                <v-textarea
                    v-model="metatypeRelationshipKey.description"
                    :rows="2"
                    :rules="[v => !!v || $t('createMetatypeRelationshipKey.descriptionRequired')]"
                >
                  <template v-slot:label>{{$t('createMetatypeRelationshipKey.description')}} <small style="color:red" >*</small></template>
                </v-textarea>

                <h3>{{$t('createMetatypeRelationshipKey.validation')}}</h3>
                <v-text-field
                    v-model="metatypeRelationshipKey.validation.regex"
                    :label="$t('createMetatypeRelationshipKey.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('createMetatypeRelationshipKey.regexHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="metatypeRelationshipKey.validation.max"
                    :disabled="metatypeRelationshipKey.validation.regex === ''"
                    type="number"
                    :label="$t('createMetatypeRelationshipKey.max')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('createMetatypeRelationshipKey.maxHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="metatypeRelationshipKey.validation.min"
                    :disabled="metatypeRelationshipKey.validation.regex === ''"
                    type="number"
                    :label="$t('createMetatypeRelationshipKey.min')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('createMetatypeRelationshipKey.minHelp')"></info-tooltip></template>
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
                </div>

                <div v-if="metatypeRelationshipKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="metatypeRelationshipKey.data_type === 'number'"
                      v-model="metatypeRelationshipKey.default_value"
                      type="number"
                      :label="$t('createMetatypeRelationshipKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="metatypeRelationshipKey.data_type === 'boolean'"
                      v-model="metatypeRelationshipKey.default_value"
                      :label="$t('createMetatypeRelationshipKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="metatypeRelationshipKey.default_value"
                      :label="$t('createMetatypeRelationshipKey.defaultValue')"
                  ></v-text-field>
                </div>

                <v-combobox
                    v-model="metatypeRelationshipKey.options"
                    :label="$t('createMetatypeRelationshipKey.options')"
                    multiple
                    clearable
                    deletable-chips
                    chips
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createMetatypeRelationshipKey.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("createMetatypeRelationshipKey.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!formValid" text @click="createMetatypeKey()">{{$t("createMetatypeRelationshipKey.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../api/types";

@Component
export default class CreateMetatypeRelationshipKeyDialog extends Vue {
  @Prop({required: true})
  metatypeRelationship!: MetatypeRelationshipT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  formValid = false
  metatypeRelationshipKey: MetatypeRelationshipKeyT = {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeRelationshipKeyT
  dataTypes = ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"]
  booleanOptions = [true, false]

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(this.dialog) this.metatypeRelationshipKey = {validation: {regex: "", min: 0, max: 0}, required: false} as MetatypeRelationshipKeyT
  }

  createMetatypeKey() {
    if(this.metatypeRelationshipKey) {
      this.metatypeRelationshipKey.container_id = this.metatypeRelationship.container_id;
      this.$client.createMetatypeRelationshipKey(this.metatypeRelationship.container_id, this.metatypeRelationship.id, this.metatypeRelationshipKey)
          .then(result => {
            if(!result) {
              this.errorMessage = this.$t('createMetatypeRelationshipKey.errorCreatingAPI') as string
            } else {
              this.dialog = false
              this.$emit('metatypeRelationshipKeyCreated', result[0])
            }
          })
          .catch(e => this.errorMessage = this.$t('createMetatypeRelationshipKey.errorCreatingAPI') as string + e)
    }
  }

}
</script>
