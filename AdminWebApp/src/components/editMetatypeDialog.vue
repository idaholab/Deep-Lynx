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
              >
                <v-text-field
                    v-model="comparisonMetatype.name"
                    required
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('editMetatype.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="comparisonMetatype.description"
                    required
                    :disabled="true"
                    class="disabled"
                >
                  <template v-slot:label>{{$t('editMetatype.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editMetatype.requiredField')}}</p>


              <v-progress-linear v-if="keysLoading" indeterminate></v-progress-linear>
              <v-data-table
                  :headers="headers()"
                  :items="comparisonMetatype.keys"
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
                    :class="(comparisonMetatype && selectedMetatype.name !== comparisonMetatype.name) ? 'edited-field' : ''"
                >
                  <template v-slot:label>{{$t('editMetatype.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="selectedMetatype.description"
                    :rules="[v => !!v || $t('editMetatype.descriptionRequired')]"
                    required
                    :class="(comparisonMetatype && selectedMetatype.description !== comparisonMetatype.description) ? 'edited-field' : ''"
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
                  :item-class="keyItemRowBackground"
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
                  <div v-if="($store.getters.isEditMode && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled">

                    <edit-metatype-key-dialog
                        :metatypeKey="item"
                        :metatype="metatype"
                        :icon="true"
                        :comparison-metatype-key="(comparisonMetatype) ? comparisonMetatype.keys.find(k => k.name === item.name) : undefined"
                        @metatypeKeyEdited="loadKeys()"></edit-metatype-key-dialog>
                    <v-icon
                        small
                        @click="deleteKey(item)"
                    >
                      mdi-delete
                    </v-icon>
                  </div>

                  <v-icon
                      v-if="$store.getters.isEditMode && item.deleted_at"
                      small
                      @click="undeleteKey(item)"
                  >
                    mdi-restore
                  </v-icon>
                </template>
              </v-data-table>
              <v-row v-if="$store.getters.isEditMode" style="margin-top: 15px">
                <v-col :cols="3"><div class="box created"></div><p> - {{$t('metatypes.created')}}</p></v-col>
                <v-col :cols="3"><div class="box edited"></div><p> - {{$t('metatypes.edited')}}</p></v-col>
                <v-col :cols="3"><div class="box removed"></div><p> - {{$t('metatypes.removed')}}</p></v-col>
              </v-row>
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
const diff = require('deep-diff').diff;

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

  // comparison metatype should always be coming in with its keys, so no need to fetch them
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

  undeleteKey(key: MetatypeKeyT) {
    this.$client.deleteMetatypeKey(this.selectedMetatype?.container_id!, this.selectedMetatype?.id!, key.id, {reverse: true})
        .then(result => {
          if(!result) this.errorMessage = this.$t('editMetatype.errorUpdatingAPI') as string

          this.loadKeys()
        })
        .catch(e => this.errorMessage = this.$t('editMetatype.errorUpdatingAPI') as string + e)
  }

  keyItemRowBackground(item: any) {
    if(this.$store.getters.isEditMode) {
      const matchedKey =  this.comparisonMetatype?.keys.find(k => k.name === item.name)!

      if(item.deleted_at) {
        return 'deleted-item'
      }

      if(!matchedKey) {
        return 'created-item'
      }

      if(this.compareKeys(matchedKey, item)) {
        return 'edited-item'
      }
    }
    return ''
  }

  // this function will indicate whether two keys are different
  compareKeys(original: MetatypeKeyT, target: MetatypeKeyT): boolean {
    if(typeof this.comparisonMetatype === 'undefined' || typeof this.selectedMetatype === 'undefined') return false

    const o: {[key: string]: any} = {}
    const t: {[key: string]: any} = {}
    Object.assign(o, original)
    Object.assign(t, target)

    // remove the keys we don't want to use to compare
    function cleanKey(p: MetatypeKeyT) {
      if(p.created_at) delete p.created_at
      if(p.created_by) delete p.created_by
      if(p.modified_at) delete p.modified_at
      if(p.modified_by) delete p.modified_by
      if(p.id) delete p.id
      if(p.metatype_id) delete p.metatype_id
      if(p.ontology_version) delete  p.ontology_version
    }

    cleanKey(o as MetatypeKeyT)
    cleanKey(t as MetatypeKeyT)

    return diff(o, t)
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

  .edited-field {
    input {
      background: #FB8C00;
      color: white !important;
      box-shadow: -5px 0 0 #FB8C00;
    }

    textarea {
      background: #FB8C00;
      color: white !important;
      box-shadow: -5px 0 0 #FB8C00;
    }
  }

    .edited-item {
      background: #FB8C00;
      color: white;

      &:hover {
        background: #FFA726 !important;
        color: black;
      }

      .v-icon__svg {
        color: white !important;
      }

      .v-icon {
        color: white !important;
      }
    }

    .created-item {
      background: #7CB342;
      color: white;

      &:hover {
        background: #9CCC65 !important;
        color: black;
      }

      .v-icon__svg {
        color: white !important;
      }

      .v-icon {
        color: white !important;
      }
    }

    .deleted-item {
      background: #E53935;
      color: white;

      &:hover {
        background: #EF5350 !important;
        color: black;
      }

      .v-icon__svg {
        color: white !important;
      }

      .v-icon {
        color: white !important;
      }
    }

    .box {
      float: left;
      height: 20px;
      width: 20px;
      margin-bottom: 15px;
      margin-left: 15px;
      clear: both;
    }

    .created {
      background-color: #7CB342;
    }

    .edited {
      background-color: #FB8C00;
    }

    .removed {
      background-color: #E53935;
    }
</style>
