<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editMetatypeRelationship.editMetatypeRelationship")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatypeRelationship">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{ $t('editMetatypeRelationship.edit') }} {{ selectedMetatypeRelationship.name }}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedMetatypeRelationship.name"
                    :rules="[v => !!v || $t('editMetatypeRelationship.nameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeRelationship.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="selectedMetatypeRelationship.description"
                    :rules="[v => !!v || $t('editMetatypeRelationship.descriptionRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatypeRelationship.description')}} <small style="color:red" >*</small></template>
                </v-textarea>

              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatypeRelationship.requiredField')}}</p>
            </v-col>

            <v-col :cols="12" v-if="keysLoading">
              <v-progress-linear indeterminate></v-progress-linear>
            </v-col>
            <v-col :cols="12">
              <v-data-table
                  :headers="headers()"
                  :items="selectedMetatypeRelationship.properties"
                  :items-per-page="100"
                  :footer-props="{
                     'items-per-page-options': [25, 50, 100]
                  }"
                  class="elevation-1"
              >

                <template v-slot:top>
                  <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t("editMetatypeRelationship.keys")}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                    <create-metatype-relationship-key-dialog :metatypeRelationship="metatypeRelationship" @metatypeRelationshipKeyCreated="loadKeys()"></create-metatype-relationship-key-dialog>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.actions`]="{ item }">
                 <edit-metatype-relationship-key-dialog :metatypeRelationshipKey="item" :metatypeRelationship="metatypeRelationship" :icon="true" @metatypeKeyEdited="loadKeys()"></edit-metatype-relationship-key-dialog>
                  <v-icon
                      small
                      @click="deleteKey(item)"
                  >
                    mdi-delete
                  </v-icon>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editMetatypeRelationship.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="editMetatypeRelationship()">{{$t("editMetatypeRelationship.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../api/types";
import EditMetatypeRelationshipKeyDialog from "@/components/editMetatypeRelationshipKeyDialog.vue";
import CreateMetatypeRelationshipKeyDialog from "@/components/createMetatypeRelationshipKeyDialog.vue";

@Component({components: {
    EditMetatypeRelationshipKeyDialog,
    CreateMetatypeRelationshipKeyDialog
  }})
export default class EditMetatypeRelationshipDialog extends Vue {
  @Prop({required: true})
  metatypeRelationship!: MetatypeRelationshipT;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  keysLoading = false
  dialog = false
  selectedMetatypeRelationship: MetatypeRelationshipT | null  = null
  valid = false

  // this way we only load the keys when the edit dialog is open, so we don't
  // overload someone using this in a list
  @Watch('dialog', {immediate: true})
  isDialogOpen() {
    if(this.dialog) {
      this.loadKeys()
    }
  }

  headers() {
    return  [
      { text: this.$t('editMetatypeRelationship.keyName'), value: 'name' },
      { text: this.$t('editMetatypeRelationship.keyDescription'), value: 'description'},
      { text: this.$t('editMetatypeRelationship.keyType'), value: 'data_type'},
      { text: this.$t('editMetatypeRelationship.actions'), value: 'actions', sortable: false }
    ]
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedMetatypeRelationship = JSON.parse(JSON.stringify(this.metatypeRelationship))
  }

  editMetatypeRelationship() {
    this.$client.updateMetatypeRelationship(this.selectedMetatypeRelationship?.container_id!, this.selectedMetatypeRelationship?.id!,
        {"name": this.selectedMetatypeRelationship?.name, "description": this.selectedMetatypeRelationship?.description})
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('editMetatypeRelationship.errorUpdatingAPI') as string
          } else {
            this.dialog = false
            this.$emit('metatypeRelationshipEdited')
          }
        })
        .catch(e => this.errorMessage = this.$t('editMetatypeRelationship.errorUpdatingAPI') as string + e)
  }

  loadKeys() {
    if(this.selectedMetatypeRelationship) {
      this.keysLoading = true
      this.$client.listMetatypeRelationshipKeys(this.selectedMetatypeRelationship.container_id, this.selectedMetatypeRelationship.id)
          .then(keys => {
            if(this.selectedMetatypeRelationship) {
              this.selectedMetatypeRelationship.properties = keys
              this.keysLoading = false
              this.$forceUpdate()
            }
          })
          .catch(e => {
            this.errorMessage = e
            this.keysLoading = false
          })
    }
  }

  deleteKey(key: MetatypeRelationshipKeyT) {
    this.$client.deleteMetatypeRelationshipKey(this.selectedMetatypeRelationship?.container_id!, this.selectedMetatypeRelationship?.id!, key.id, {permanent: !this.$store.getters.isEditMode})
    .then(result => {
      if(!result) this.errorMessage = this.$t('editMetatypeRelationship.errorUpdatingAPI') as string

      this.loadKeys()
    })
    .catch(e => this.errorMessage = this.$t('editMetatypeRelationship.errorUpdatingAPI') as string + e)
  }
}

</script>
