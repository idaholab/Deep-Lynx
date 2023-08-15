<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="90%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on" style="margin-top: 0px !important;" >{{$t("classes.edit")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2" v-if="selectedMetatype">
      <error-banner :message="errorMessage"></error-banner>
      <v-card-title>
        <span class="headline text-h3">{{$t('general.edit')}} {{selectedMetatype.name}}</span>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col :cols="6" v-if="comparisonMetatype">
            <v-form
                ref="form"
            >
              <v-text-field
                  :value="comparisonMetatype.name"
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>
              <v-textarea
                  :value="comparisonMetatype.description"
                  required
                  disabled
                  class="disabled"
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:red" >*</small></template>
              </v-textarea>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>


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
                  <v-toolbar-title>{{$t("properties.properties")}}</v-toolbar-title>
                  <v-divider
                      class="mx-4"
                      inset
                      vertical
                  ></v-divider>
                  <v-spacer></v-spacer>
                </v-toolbar>
              </template>
              <template v-slot:[`item.actions`]="{ item }">
                <ViewMetatypeKeyDialog :metatypeKey="item" :metatype="metatype" :icon="true" @metatypeKeyEdited="loadKeys()"></ViewMetatypeKeyDialog>
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
                  :rules="[validationRule]"
                  required
                  :class="(comparisonMetatype && selectedMetatype.name !== comparisonMetatype.name) ? 'edited-field' : ''"
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>
              <v-textarea
                  v-model="selectedMetatype.description"
                  :rules="[validationRule]"
                  required
                  :class="(comparisonMetatype && selectedMetatype.description !== comparisonMetatype.description) ? 'edited-field' : ''"
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:red" >*</small></template>
              </v-textarea>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>

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
                  <v-toolbar-title>{{$t("properties.properties")}}</v-toolbar-title>
                  <v-divider
                      class="mx-4"
                      inset
                      vertical
                  ></v-divider>
                  <v-spacer></v-spacer>
                  <CreateMetatypeKeyDialog :metatype="metatype" @metatypeKeyCreated="loadKeys()"></CreateMetatypeKeyDialog>
                </v-toolbar>
              </template>
              <template v-slot:[`item.actions`]="{ item }">
                <!-- only allow edits on owned keys -->
                <div v-if="item.metatype_id === selectedMetatype.id">
                  <div v-if="($store.getters.isEditMode && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled">
                    <EditMetatypeKeyDialog
                        :metatypeKey="item"
                        :metatype="metatype"
                        :icon="true"
                        :comparison-metatype-key="(comparisonMetatype) ? comparisonMetatype.keys.find(k => k.name === item.name) : undefined"
                        @metatypeKeyEdited="loadKeys()"></EditMetatypeKeyDialog>
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
                </div>
                <!-- otherwise show link to parent -->
                <div v-else>
                  {{$t('classes.inheritedProperty')}} {{item.metatype_id}}
                </div>
              </template>
            </v-data-table>
            <v-row v-if="$store.getters.isEditMode" style="margin-top: 15px">
              <v-col :cols="3"><div class="box created mr-2"></div><p>{{$t('general.created')}}</p></v-col>
              <v-col :cols="3"><div class="box edited mr-2"></div><p>{{$t('general.edited')}}</p></v-col>
              <v-col :cols="3"><div class="box removed mr-2"></div><p>{{$t('general.removed')}}</p></v-col>
            </v-row>
            <v-row>
              <v-col>
                <CreateMetatypeDialog :containerID="selectedMetatype.container_id" :parentID="selectedMetatype.id"></CreateMetatypeDialog>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <MetatypeParentSelect :containerID="selectedMetatype.container_id" :parentID="selectedMetatype.parent_id" @parentUpdate="parentUpdate"></MetatypeParentSelect>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="editMetatype()">{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'

  import {MetatypeKeyT, MetatypeT} from "../../../api/types";
  import EditMetatypeKeyDialog from "@/components/ontology/metatypes/EditMetatypeKeyDialog.vue";
  import CreateMetatypeKeyDialog from "@/components/ontology/metatypes/CreateMetatypeKeyDialog.vue"
  import ViewMetatypeKeyDialog from "@/components/ontology/metatypes/ViewMetatypeKeyDialog.vue";
  import CreateMetatypeDialog from "@/components/ontology/metatypes/CreateMetatypeDialog.vue";
  import MetatypeParentSelect from "@/components/ontology/metatypes/MetatypeParentSelect.vue";
  const diff = require('deep-diff').diff;

  interface EditMetatypeDialogModel {
    errorMessage: string
    keysLoading: boolean
    dialog: boolean
    selectedMetatype: MetatypeT | null
    valid: boolean
  }

  export default Vue.extend ({
    name: 'EditMetatypeDialog',

    components: {CreateMetatypeDialog, EditMetatypeKeyDialog, CreateMetatypeKeyDialog, ViewMetatypeKeyDialog, MetatypeParentSelect },

    props: {
      metatype: {
        type: Object as PropType<MetatypeT>,
        required: true
      },
      icon: {
        type: Boolean,
        required: false
      },
      comparisonMetatype: {
        type: Object as PropType<MetatypeT | undefined>,
        required: false,
        default: undefined
      },
    },

    data: (): EditMetatypeDialogModel => ({
      errorMessage: "",
      keysLoading: false,
      dialog: false,
      selectedMetatype: null,
      valid: false
    }),

    watch: {
      metatype: {
        immediate: true,
        handler(newVal: MetatypeT | null) {
          if (newVal !== null) {
            // Clone the new value to selectedMetatype whenever metatype changes
            this.selectedMetatype = Object.assign({}, newVal);
          }
        },
      },
      dialog: {
        immediate: true,
        handler(newDialog) {
          if(newDialog) {
            this.$nextTick(() => {
              this.loadKeys();
            });
          }
        }
      },
    },

    methods: {
      headers(): { text: string; value: string }[] {
        return  [
          { text: this.$t('general.name'), value: 'name' },
          { text: this.$t('general.description'), value: 'description'},
          { text: this.$t('general.dataType'), value: 'data_type'},
          { text: this.$t('general.actions'), value: 'actions' }
        ]
      },

      editMetatype() {
        this.$client.updateMetatype(this.selectedMetatype?.container_id!, this.selectedMetatype?.id!,
            {
              "name": this.selectedMetatype?.name,
              "description": this.selectedMetatype?.description,
              "parent_id": this.selectedMetatype?.parent_id,
            })
            .then(result => {
              if(!result) {
                this.errorMessage = this.$t('errors.errorCommunicating') as string
              } else {
                this.dialog = false
                this.$emit('metatypeEdited')
              }
            })
            .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      },

      loadKeys() {
        if(this.selectedMetatype) {
          this.keysLoading = true
          this.$client.listMetatypeKeys(this.selectedMetatype.container_id, this.selectedMetatype.id!, this.$store.getters.isEditMode)
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
      },

      deleteKey(key: MetatypeKeyT) {
        this.$client.deleteMetatypeKey(this.selectedMetatype?.container_id!, this.selectedMetatype?.id!, key.id!, {permanent: !this.$store.getters.isEditMode})
        .then(result => {
          if(!result) this.errorMessage = this.$t('errors.errorCommunicating') as string

          this.loadKeys()
        })
        .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      },

      undeleteKey(key: MetatypeKeyT) {
        this.$client.deleteMetatypeKey(this.selectedMetatype?.container_id!, this.selectedMetatype?.id!, key.id!, {reverse: true})
            .then(result => {
              if(!result) this.errorMessage = this.$t('errors.errorCommunicating') as string

              this.loadKeys()
            })
            .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
      },

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
      },

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
      },

      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      },

      parentUpdate(newParent: MetatypeT) {
        if (this.selectedMetatype && newParent) {
          this.selectedMetatype.parent_id = newParent.id
        } else if (this.selectedMetatype && !newParent) {
          this.selectedMetatype.parent_id = undefined
        }
      },
    },
  })
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
      background: $warning;
      color: white !important;
      box-shadow: -5px 0 0 $warning;
    }

    textarea {
      background: $warning;
      color: white !important;
      box-shadow: -5px 0 0 $warning;
    }
  }

    .edited-item {
      background: $warning;
      color: white;

      &:hover {
        background: lighten($warning, 5%) !important;
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
      background: $success;
      color: white;

      &:hover {
        background: lighten($success, 5%) !important;
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
      background: $error;
      color: white;

      &:hover {
        background: lighten($error, 5%) !important;
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
      background-color: $success;
    }

    .edited {
      background-color: $warning;
    }

    .removed {
      background-color: $error;
    }
</style>