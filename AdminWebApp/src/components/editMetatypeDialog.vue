<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="90%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editMetatype.editMetatype")}}</v-btn>
    </template>

    <v-card v-if="selectedMetatype">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('editMetatype.edit')}} {{selectedMetatype.name}}</span>
          <v-row>
            <v-col :cols="6" v-if="comparisonMetatype">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedMetatype.name"
                    :rules="[v => !!v || $t('editMetatype.nameRequired')]"
                    required
                    :disabled="true"
                    style="color: black"
                >
                  <template v-slot:label>{{$t('editMetatype.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="selectedMetatype.description"
                    :rules="[v => !!v || $t('editMetatype.descriptionRequired')]"
                    required
                    :disabled="true"
                    style="color: black"
                >
                  <template v-slot:label>{{$t('editMetatype.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatype.requiredField')}}</p>

              <v-progress-linear v-if="keysLoading" indeterminate></v-progress-linear>
              <v-data-table
                  :headers="headers()"
                  :items="selectedMetatype.keys"
                  :items-per-page="100"
                  :footer-props="{
                     'items-per-page-options': [25, 50, 100]
                  }"
                  class="elevation-1"
                  sort-by="name"
              >

                <template v-slot:top>
                  <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t("editMetatype.keys")}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.actions`]="{ item }">
                  <view-metatype-key-dialog :metatypeKey="item" :metatype="metatype" :icon="true" @metatypeKeyEdited="loadKeys()"></view-metatype-key-dialog>
                </template>
              </v-data-table>
            </v-col>


            <v-col :cols="(comparisonMetatype) ? 6 : 12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedMetatype.name"
                    :rules="[v => !!v || $t('editMetatype.nameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatype.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="selectedMetatype.description"
                    :rules="[v => !!v || $t('editMetatype.descriptionRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editMetatype.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatype.requiredField')}}</p>

              <v-progress-linear v-if="keysLoading" indeterminate></v-progress-linear>
              <v-data-table
                  :headers="headers()"
                  :items="selectedMetatype.keys"
                  :items-per-page="100"
                  :footer-props="{
                     'items-per-page-options': [25, 50, 100]
                  }"
                  class="elevation-1"

                  sort-by="name"
              >

                <template v-slot:top>
                  <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t("editMetatype.keys")}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                    <create-metatype-key-dialog :metatype="metatype" @metatypeKeyCreated="loadKeys()"></create-metatype-key-dialog>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.actions`]="{ item }">
                 <edit-metatype-key-dialog :metatypeKey="item" :metatype="metatype" :icon="true" @metatypeKeyEdited="loadKeys()"></edit-metatype-key-dialog>
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
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editMetatype.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="editMetatype()">{{$t("editMetatype.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeKeyT, MetatypeT} from "../api/types";
import EditMetatypeKeyDialog from "@/components/editMetatypeKeyDialog.vue";
import CreateMetatypeKeyDialog from "@/components/createMetatypeKeyDialog.vue";
import ViewMetatypeKeyDialog from "@/components/viewMetatypeKeyDialog.vue";

@Component({components: {
    EditMetatypeKeyDialog,
    CreateMetatypeKeyDialog,
    ViewMetatypeKeyDialog
  }})
export default class EditMetatypeDialog extends Vue {
  @Prop({required: true})
  metatype!: MetatypeT;

  @Prop({required: false})
  readonly icon!: boolean

  @Prop({required: false, default: undefined})
  comparisonMetatype: MetatypeT | undefined

  errorMessage = ""
  keysLoading = false
  dialog = false
  selectedMetatype: MetatypeT | null  = null
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
      { text: this.$t('editMetatype.keyName'), value: 'name' },
      { text: this.$t('editMetatype.keyDescription'), value: 'description'},
      { text: this.$t('editMetatype.keyType'), value: 'data_type'},
      { text: this.$t('editMetatype.actions'), value: 'actions', sortable: false }
    ]
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedMetatype = JSON.parse(JSON.stringify(this.metatype))
  }

  editMetatype() {
    this.$client.updateMetatype(this.selectedMetatype?.container_id!, this.selectedMetatype?.id!,
        {"name": this.selectedMetatype?.name, "description": this.selectedMetatype?.description})
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('editMetatype.errorUpdatingAPI') as string
          } else {
            this.dialog = false
            this.$emit('metatypeEdited')
          }
        })
        .catch(e => this.errorMessage = this.$t('editMetatype.errorUpdatingAPI') as string + e)
  }

  loadKeys() {
    if(this.selectedMetatype) {
      this.keysLoading = true
      this.$client.listMetatypeKeys(this.selectedMetatype.container_id, this.selectedMetatype.id)
          .then(keys => {
            this.keysLoading = false

            if(this.selectedMetatype) {
              this.selectedMetatype.keys = keys
              this.$forceUpdate()
            }
          })
          .catch(e => {
            this.errorMessage = e
            this.keysLoading = false
          })
    }
  }

  deleteKey(key: MetatypeKeyT) {
    this.$client.deleteMetatypeKey(this.selectedMetatype?.container_id!, this.selectedMetatype?.id!, key.id, {permanent: !this.$store.getters.isEditMode})
    .then(result => {
      if(!result) this.errorMessage = this.$t('editMetatype.errorUpdatingAPI') as string

      this.loadKeys()
    })
    .catch(e => this.errorMessage = this.$t('editMetatype.errorUpdatingAPI') as string + e)
  }
}

</script>
