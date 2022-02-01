<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editPropertyKey.editPropertyKey")}}</v-btn>
    </template>

    <v-card v-if="selectedPropertyKey">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('editPropertyKey.edit')}} {{selectedPropertyKey.name}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="selectedPropertyKey.name"
                    :rules="[v => !!v || $t('editPropertyKey.nameRequired')]"
                >
                  <template v-slot:label>{{$t('editPropertyKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="selectedPropertyKey.property_name"
                    :rules="[v => !!v || $t('editPropertyKey.propertyNameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editPropertyKey.propertyName')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="selectedPropertyKey.data_type"
                    :items="dataTypes"
                    @change="selectedPropertyKey.default_value = undefined"
                    :rules="[v => !!v || $t('editPropertyKey.dataTypeRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editPropertyKey.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    v-model="selectedPropertyKey.required"
                >
                  <template v-slot:label>{{$t('editPropertyKey.required')}} <small style="color:#ff0000" >*</small></template>
                </v-checkbox>
                <v-textarea
                    v-model="selectedPropertyKey.description"
                    :rows="2"
                    :rules="[v => !!v || $t('editPropertyKey.descriptionRequired')]"
                >
                  <template v-slot:label>{{$t('editPropertyKey.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <h3>{{$t('editPropertyKey.validation')}}</h3>
                <v-text-field
                    v-model="selectedPropertyKey.validation.regex"
                    :label="$t('editPropertyKey.regex')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editPropertyKey.regexHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="selectedPropertyKey.validation.max"
                    :disabled="selectedPropertyKey.validation.regex === ''"
                    type="number"
                    :label="$t('editPropertyKey.max')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editPropertyKey.maxHelp')"></info-tooltip></template>
                </v-text-field>
                <v-text-field
                    v-model.number="selectedPropertyKey.validation.min"
                    :disabled="selectedPropertyKey.validation.regex === ''"
                    type="number"
                    :label="$t('editPropertyKey.min')"
                >
                  <template slot="append-outer"> <info-tooltip :message="$t('editPropertyKey.minHelp')"></info-tooltip></template>
                </v-text-field>



                <!-- default value and options should be comboboxes when set to enumeration -->
                <div v-if="selectedPropertyKey.data_type === 'enumeration'" >
                  <v-combobox
                      v-model="selectedPropertyKey.default_value"
                      multiple
                      chips
                      clearable
                      deletable-chips
                  ></v-combobox>
                </div>

                <div v-if="selectedPropertyKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="selectedPropertyKey.data_type === 'number'"
                      v-model="selectedPropertyKey.default_value"
                      type="number"
                      :label="$t('editPropertyKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="selectedPropertyKey.data_type === 'boolean'"
                      v-model="selectedPropertyKey.default_value"
                      :label="$t('editPropertyKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="selectedPropertyKey.default_value"
                      :label="$t('editPropertyKey.defaultValue')"
                  ></v-text-field>
                </div>

                <v-combobox
                    v-model="selectedPropertyKey.options"
                    :label="$t('editPropertyKey.options')"
                    multiple
                    clearable
                    chips
                    deletable-chips
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editPropertyKey.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editPropertyKey.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!formValid" text @click="editPropertyKey()">{{$t("editPropertyKey.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {PropertyT, MetatypeT} from "../api/types";

@Component
export default class EditPropertyKeyDialog extends Vue {
  @Prop({required: true})
  node!: MetatypeT;

  @Prop({required: true})
  metatypeKey!: PropertyT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  formValid = false
  selectedPropertyKey: PropertyT | null  = null
  dataTypes = ["number", "number64", "float", "float64", "date", "string", "boolean", "enumeration", "file"]
  booleanOptions = [true, false]

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(this.dialog) this.selectedPropertyKey = JSON.parse(JSON.stringify(this.metatypeKey))

    // if(this.selectedPropertyKey && !this.selectedPropertyKey.validation) {
    //   this.selectedPropertyKey.validation = {regex: "", min: 0, max: 0}
    // }
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedPropertyKey = JSON.parse(JSON.stringify(this.metatypeKey))

    // if(this.selectedPropertyKey && !this.selectedPropertyKey.validation) {
    //   this.selectedPropertyKey.validation = {regex: "", min: 0, max: 0}
    // }
  }

  editPropertyKey() {
    if(this.selectedPropertyKey) {
      this.$client.updatePropertyKey(this.node.container_id,this.node.id, this.selectedPropertyKey?.id!, this.selectedPropertyKey)
          .then(result => {
            if(!result) {
              this.errorMessage = this.$t('editPropertyKey.errorUpdatingAPI') as string
            } else {
              this.dialog = false
              this.$emit('metatypeKeyEdited')
            }
          })
          .catch(e => this.errorMessage = this.$t('editPropertyKey.errorUpdatingAPI') as string + e)
    }
  }
}
</script>
