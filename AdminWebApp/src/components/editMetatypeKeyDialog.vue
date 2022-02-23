<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" width="50%">
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
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="selectedMetatypeKey.name"
                    :rules="[v => !!v || $t('editMetatypeKey.nameRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="selectedMetatypeKey.property_name"
                    :rules="[v => !!v || $t('editMetatypeKey.propertyNameRequired')]"
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
                    :rows="2"
                    :rules="[v => !!v || $t('editMetatypeKey.descriptionRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeKey.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <h3>{{$t('editMetatypeKey.validation')}}</h3>
                <v-text-field
                    v-model="selectedMetatypeKey.validation.regex"
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

                <div v-if="selectedMetatypeKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="selectedMetatypeKey.data_type === 'number'"
                      v-model="selectedMetatypeKey.default_value"
                      type="number"
                      :label="$t('editMetatypeKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="selectedMetatypeKey.data_type === 'boolean'"
                      v-model="selectedMetatypeKey.default_value"
                      :label="$t('editMetatypeKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="selectedMetatypeKey.default_value"
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
        <v-btn color="blue darken-1" :disabled="!formValid" text @click="editMetatypeKey()">{{$t("editMetatypeKey.save")}}</v-btn>
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
