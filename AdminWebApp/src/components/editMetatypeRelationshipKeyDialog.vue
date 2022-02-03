<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editMetatypeRelationshipKey.editMetatypeKey")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeRelationshipKey">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{ $t('editMetatypeRelationshipKey.edit') }} {{ selectedMetatypeRelationshipKey.name }}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="formValid"
              >
                <v-text-field
                    v-model="selectedMetatypeRelationshipKey.name"
                    :rules="[v => !!v || $t('editMetatypeRelationshipKey.nameRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipKey.name')}} <small style="color:red" >*</small></template>
                </v-text-field>

                <v-text-field
                    v-model="selectedMetatypeRelationshipKey.property_name"
                    :rules="[v => !!v || $t('editMetatypeRelationshipKey.propertyNameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipKey.propertyName')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-select
                    v-model="selectedMetatypeRelationshipKey.data_type"
                    :items="dataTypes"
                    @change="selectedMetatypeRelationshipKey.default_value = undefined"
                    :rules="[v => !!v || $t('editMetatypeRelationshipKey.dataTypeRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipKey.dataType')}} <small style="color:red" >*</small></template>
                </v-select>
                <v-checkbox
                    v-model="selectedMetatypeRelationshipKey.required"
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipKey.required')}} <small style="color:#ff0000" >*</small></template>
                </v-checkbox>
                <v-textarea
                    v-model="selectedMetatypeRelationshipKey.description"
                    :rows="2"
                    :rules="[v => !!v || $t('editMetatypeRelationshipKey.descriptionRequired')]"
                >
                  <template v-slot:label>{{$t('editMetatypeRelationshipKey.description')}} <small style="color:#ff0000" >*</small></template>
                </v-textarea>

                <div v-if="selectedMetatypeRelationshipKey.validation">
                  <h3>{{$t('editMetatypeRelationshipKey.validation')}}</h3>
                  <v-text-field
                      v-model="selectedMetatypeRelationshipKey.validation.regex"
                      :label="$t('editMetatypeRelationshipKey.regex')"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeRelationshipKey.regexHelp')"></info-tooltip></template>
                  </v-text-field>
                  <v-text-field
                      v-model.number="selectedMetatypeRelationshipKey.validation.max"
                      :disabled="selectedMetatypeRelationshipKey.validation.regex === ''"
                      type="number"
                      :label="$t('editMetatypeRelationshipKey.max')"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeRelationshipKey.maxHelp')"></info-tooltip></template>
                  </v-text-field>
                  <v-text-field
                      v-model.number="selectedMetatypeRelationshipKey.validation.min"
                      :disabled="selectedMetatypeRelationshipKey.validation.regex === ''"
                      type="number"
                      :label="$t('editMetatypeRelationshipKey.min')"
                  >
                    <template slot="append-outer"> <info-tooltip :message="$t('editMetatypeRelationshipKey.minHelp')"></info-tooltip></template>
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
                  ></v-combobox>
                </div>

                <div v-if="selectedMetatypeRelationshipKey.data_type !== 'enumeration'" >
                  <v-text-field
                      v-if="selectedMetatypeRelationshipKey.data_type === 'number'"
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      type="number"
                      :label="$t('editMetatypeRelationshipKey.defaultValue')"
                  ></v-text-field>
                  <v-select
                      v-else-if="selectedMetatypeRelationshipKey.data_type === 'boolean'"
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      :label="$t('editMetatypeRelationshipKey.defaultValue')"
                      :items="booleanOptions"
                      required
                  >
                  </v-select>
                  <v-text-field
                      v-else
                      v-model="selectedMetatypeRelationshipKey.default_value"
                      :label="$t('editMetatypeRelationshipKey.defaultValue')"
                  ></v-text-field>
                </div>

                <v-combobox
                    v-model="selectedMetatypeRelationshipKey.options"
                    :label="$t('editMetatypeRelationshipKey.options')"
                    multiple
                    clearable
                    deletable-chips
                    chips
                ></v-combobox>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatypeRelationshipKey.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editMetatypeRelationshipKey.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!formValid" text @click="editMetatypeKey()">{{$t("editMetatypeRelationshipKey.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../api/types";

@Component
export default class EditMetatypeRelationshipKeyDialog extends Vue {
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

  editMetatypeKey() {
    if(this.selectedMetatypeRelationshipKey) {
      this.selectedMetatypeRelationshipKey.container_id = this.metatypeRelationship.container_id;
      this.$client.updateMetatypeRelationshipKey(this.metatypeRelationship.container_id,this.metatypeRelationship.id, this.selectedMetatypeRelationshipKey?.id!, this.selectedMetatypeRelationshipKey)
          .then(result => {
            if(!result) {
              this.errorMessage = this.$t('editMetatypeRelationshipKey.errorUpdatingAPI') as string
            } else {
              this.dialog = false
              this.$emit('metatypeKeyEdited')
            }
          })
          .catch(e => this.errorMessage = this.$t('editMetatypeRelationshipKey.errorUpdatingAPI') as string + e)
    }
  }
}
</script>
