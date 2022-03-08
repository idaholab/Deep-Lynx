<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="90%">
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
            <v-col v-if="comparisonMetatypeRelationship" :cols="6">
              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="comparisonMetatypeRelationship.name"
                    :rules="[v => !!v || $t('editMetatypeRelationship.nameRequired')]"
                    required
                    disabled
                    class="disabled"
                >
                  <template v-slot:label>{{$t('editMetatypeRelationship.name')}}</template>
                </v-text-field>
                <v-textarea
                    v-model="comparisonMetatypeRelationship.description"
                    :rules="[v => !!v || $t('editMetatypeRelationship.descriptionRequired')]"
                    required
                    disabled
                    class="disabled"
                >
                  <template v-slot:label>{{$t('editMetatypeRelationship.description')}}</template>
                </v-textarea>

              </v-form>
              <p><span style="color:white">*</span></p>

              <v-progress-linear indeterminate v-if="keysLoading"></v-progress-linear>
              <v-data-table
                  :headers="headers()"
                  :items="comparisonMetatypeRelationship.keys"
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
                    <v-toolbar-title>{{$t("editMetatypeRelationship.keys")}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.actions`]="{ item }">
                    <view-metatype-relationship-key-dialog
                        :metatypeRelationshipKey="item"
                        :metatypeRelationship="comparisonMetatypeRelationship"
                        :icon="true"
                        ></view-metatype-relationship-key-dialog>
                </template>
              </v-data-table>
            </v-col>


            <v-col :cols="(comparisonMetatypeRelationship) ? 6 : 12">
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

              <v-progress-linear indeterminate v-if="keysLoading"></v-progress-linear>
              <v-data-table
                  :headers="headers()"
                  :items="selectedMetatypeRelationship.keys"
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
                  <div v-if="($store.getters.isEditMode && !item.deleted_at) || !$store.getters.ontologyVersioningEnabled">
                    <edit-metatype-relationship-key-dialog
                        :metatypeRelationshipKey="item"
                        :metatypeRelationship="metatypeRelationship"
                        :comparison-relationship-key="(comparisonMetatypeRelationship) ? comparisonMetatypeRelationship.keys.find(k => k.name === item.name) : undefined"
                        :icon="true"
                        @metatypeKeyEdited="loadKeys()"></edit-metatype-relationship-key-dialog>
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
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editMetatypeRelationship.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="editMetatypeRelationship()">{{$t("editMetatypeRelationship.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipKeyT, MetatypeRelationshipT} from "../../../api/types";
import EditMetatypeRelationshipKeyDialog from "@/components/ontology/metatypeRelationships/editMetatypeRelationshipKeyDialog.vue";
import CreateMetatypeRelationshipKeyDialog from "@/components/ontology/metatypeRelationships/createMetatypeRelationshipKeyDialog.vue";
import ViewMetatypeRelationshipKeyDialog
  from "@/components/ontology/metatypeRelationships/viewMetatypeRelationshipKeyDialog.vue";
const diff = require('deep-diff').diff;

@Component({components: {
    EditMetatypeRelationshipKeyDialog,
    CreateMetatypeRelationshipKeyDialog,
    ViewMetatypeRelationshipKeyDialog
  }})
export default class EditMetatypeRelationshipDialog extends Vue {
  @Prop({required: true})
  metatypeRelationship!: MetatypeRelationshipT;

  @Prop({required: false, default: undefined})
  comparisonMetatypeRelationship!: MetatypeRelationshipT | undefined;

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
              this.selectedMetatypeRelationship.keys = keys
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

  undeleteKey(key: MetatypeRelationshipKeyT) {
    this.$client.deleteMetatypeRelationshipKey(this.selectedMetatypeRelationship?.container_id!, this.selectedMetatypeRelationship?.id!, key.id, {reverse: true})
        .then(result => {
          if(!result) this.errorMessage = this.$t('editMetatypeRelationship.errorUpdatingAPI') as string

          this.loadKeys()
        })
        .catch(e => this.errorMessage = this.$t('editMetatypeRelationship.errorUpdatingAPI') as string + e)
  }

  keyItemRowBackground(item: any) {
    if(this.$store.getters.isEditMode) {
      const matchedKey =  this.comparisonMetatypeRelationship?.keys.find(k => k.name === item.name)!

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
  compareKeys(original: MetatypeRelationshipKeyT, target: MetatypeRelationshipKeyT): boolean {
    if(typeof this.comparisonMetatypeRelationship === 'undefined' || typeof this.selectedMetatypeRelationship === 'undefined') return false

    const o: {[key: string]: any} = {}
    const t: {[key: string]: any} = {}
    Object.assign(o, original)
    Object.assign(t, target)

    // remove the keys we don't want to use to compare
    function cleanKey(p: MetatypeRelationshipKeyT) {
      if(p.created_at) delete p.created_at
      if(p.created_by) delete p.created_by
      if(p.modified_at) delete p.modified_at
      if(p.modified_by) delete p.modified_by
      if(p.id) delete p.id
      if(p.metatype_relationship_id) delete p.metatype_relationship_id
      if(p.ontology_version) delete  p.ontology_version
    }

    cleanKey(o as MetatypeRelationshipKeyT)
    cleanKey(t as MetatypeRelationshipKeyT)

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
