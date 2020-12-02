<template>
    <v-dialog v-model="dialog" @click:outside="reset">
        <template v-slot:activator="{ on }">
            <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("typeTransformation.newTransformationButton")}}</v-btn>
        </template>
        <v-card>
            <v-card-title>
                <span class="headline">{{$t("typeTransformation.formTitle")}}</span>
            </v-card-title>

            <error-banner :message="errorMessage"></error-banner>
            <v-card-text>
              <v-row>
                <v-col :cols="6" >
                  <h2>Create New Transformation</h2>
                  <v-divider></v-divider>
                  <h3 style="padding-top: 10px">Conditions <info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip></h3>
                  <v-data-table
                      :single-expand="true"
                      :expanded.sync="expanded"
                      :headers="conditionsHeader"
                      :items="conditions"
                      item-key="value"
                      show-expand
                      :hide-default-footer="true">
                     <template v-slot:item.actions="{item}" >
                       <v-icon
                           small
                           @click="deleteCondition(item)"
                       >
                         mdi-delete
                       </v-icon>
                     </template>
                     <template v-slot:expanded-item="{headers, item}">
                       <td :colspan="headers.length">
                         <h3>Subexpressions</h3>
                          <v-data-table
                              :headers="subexpressionHeader"
                              :items="item.subexpressions"
                              :hide-default-footer="true"
                          >
                            <template v-slot:item.actions="{item: subexpression}" >
                              <v-icon
                                  small
                                  @click="deleteSubexpression(item, subexpression)"
                              >
                                mdi-delete
                              </v-icon>
                            </template>
                          </v-data-table>
                         <v-form ref="subexpressionForm" v-model="subexpressionFormValid">
                           <v-row>
                             <v-col :cols="3">
                               <v-select
                                   :items="expressions"
                                   :rules="[v => !!v || 'Select one']"
                                   v-model="subexpressionExpression"
                                   label="Expression"
                                   required
                               >

                                 <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                               </v-select>
                             </v-col>
                             <v-col :cols="3">
                               <v-select
                                   :items="payloadKeys"
                                   :rules="[v => !!v || 'Select one']"
                                   v-model="subexpressionKey"
                                   label="Key"
                                   required
                               >

                                 <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                               </v-select>
                             </v-col>
                             <v-col :cols="3">
                               <v-select
                                   :items="operators"
                                   :rules="[v => !!v || 'Select one']"
                                   v-model="subexpressionOperator"
                                   :return-object="true"
                                   label="Operator"
                                   required
                               >

                                 <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                               </v-select>
                             </v-col>
                             <v-col :cols="3">
                               <v-text-field
                                   v-model="subexpressionValue"
                                   :disabled="subexpressionOperator && !subexpressionOperator.requiresValue"
                                   label="Value">

                               </v-text-field>
                               <v-btn :disabled="!subexpressionFormValid" @click="addSubexpression(item)">Add</v-btn>
                             </v-col>
                           </v-row>
                         </v-form>

                       </td>
                     </template>

                  </v-data-table>
                  <v-form ref="conditionForm" v-model="conditionFormValid">
                    <v-row>
                      <v-col :cols="4">
                        <v-select
                            :items="payloadKeys"
                            v-model="conditionKey"
                            :rules="[v => !!v || 'Select one']"
                            label="Key"
                            required
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                        </v-select>
                      </v-col>
                      <v-col :cols="4">
                        <v-select
                            :items="operators"
                            v-model="conditionOperator"
                            :return-object="true"
                            :rules="[v => !!v || 'Select one']"
                            label="Operator"
                            required
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                        </v-select>
                      </v-col>
                      <v-col :cols="4">
                        <v-text-field
                          v-model="conditionValue"
                          :disabled="conditionOperator && !conditionOperator.requiresValue"
                          label="Value">

                        </v-text-field>
                        <v-btn :disabled="!conditionFormValid" @click="addCondition">Add Condition</v-btn>
                      </v-col>
                    </v-row>

                  </v-form>

                  <v-form
                      ref="mainForm"
                      v-model="mainFormValid"
                  >
                    <v-row>
                      <v-col>
                        <v-select
                            :items="payloadKeys"
                            v-model="uniqueIdentifierKey"
                        >
                          <template v-slot:label>{{$t('dataMapping.uniqueIdentifierKey')}} <small>optional</small></template>

                        </v-select>
                      </v-col>
                      <v-col>
                        <v-select
                            :items="onConflictOptions"
                            v-model="onConflict"
                            :label="$t('dataMapping.onConflict')"
                            :disabled="!uniqueIdentifierKey"
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.originDestinationKeyHelp')"></info-tooltip> </template>
                        </v-select>
                      </v-col>
                    </v-row>
                    <v-select
                        :items="payloadTypes()"
                        v-model="payloadType"
                        item-text="name"
                        :rules="[v => !!v || 'Item is required']"
                        :label="$t('dataMapping.dataType')"
                        required
                    ></v-select>
                    <div v-if="payloadType === 'metatype'">
                      <v-autocomplete
                          :items="metatypes"
                          v-model="selectedMetatype"
                          :search-input.sync="search"
                          color="white"
                          :single-line="false"
                          item-text="name"
                          :label="$t('dataMapping.chooseMetatype')"
                          :placeholder="$t('dataMapping.typeToSearch')"
                          :rules="[v => !!v || 'Item is required']"
                          required
                          return-object
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('dataMapping.metatypeSearchHelp')"></info-tooltip> </template>
                      </v-autocomplete>

                      <div v-if="selectedMetatype !== null">
                        <br>
                        <h4 v-if="selectedMetatypeKeys.length > 0">{{$t('dataMapping.metatypePropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                        <div v-for="key in selectedMetatypeKeys" :key="key.id">
                          <div v-if="key.required">
                            <v-select
                                :items="payloadKeys"
                                @input="selectPropertyKey($event, key)"
                                :rules="[v => !!v || 'Item is required']"
                                :required="key.required"
                            >

                              <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                              <template v-slot:label>{{key.name}} <small style="color:red">required</small></template>
                            </v-select>
                          </div>
                          <div v-else>
                            <v-select
                                :items="payloadKeys"
                                :label="key.name"
                                @input="selectPropertyKey($event, key)"
                            >

                              <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                            </v-select>
                          </div>

                        </div>
                      </div>


                    </div>

                    <!-- RELATIONSHIP -->
                    <div v-if="payloadType === 'metatype-relationship'">

                      <v-autocomplete
                          :items="relationshipPairs"
                          v-model="selectedRelationshipPair"
                          :search-input.sync="relationshipPairSearch"
                          color="white"
                          :single-line="false"
                          item-text="name"
                          :label="$t('dataMapping.chooseRelationship')"
                          :placeholder="$t('dataMapping.typeToSearch')"
                          return-object
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('dataMapping.relationshipPairSearchHelp')"></info-tooltip></template>

                        <template slot="item" slot-scope="data">
                          {{data.item.origin_metatype_name}} - {{data.item.relationship_pair_name}} - {{data.item.destination_metatype_name}}
                        </template>

                      </v-autocomplete>


                      <v-row>
                        <v-col>
                          <v-select
                              :items="payloadKeys"
                              v-model="origin_key"
                              :rules="[v => !!v || 'Item is required']"
                              :label="$t('dataMapping.originKey')"
                              required
                          >

                            <template slot="append-outer">AND</template>
                          </v-select>
                        </v-col>
                        <v-col>
                          <v-select
                              :items="payloadKeys"
                              v-model="destination_key"
                              :rules="[v => !!v || 'Item is required']"
                              :label="$t('dataMapping.destinationKey')"
                              required
                          >

                            <template slot="append-outer"><info-tooltip :message="$t('dataMapping.originDestinationKeyHelp')"></info-tooltip> </template>
                          </v-select>
                        </v-col>
                      </v-row>


                      <br>
                      <h4 v-if="selectedMetatypeRelationshipPairKeys.length > 0">{{$t('dataMapping.metatypeRelationshipPropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                      <div v-for="key in selectedMetatypeRelationshipPairKeys" :key="key.id">
                          <div v-if="key.required">
                            <v-select
                                :items="payloadKeys"
                                @input="selectRelationshipPropertyKey($event, key)"
                                :rules="[v => !!v || 'Item is required']"
                                :required="key.required"
                            >

                              <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                              <template v-slot:label>{{key.name}} <small style="color:red">required</small></template>
                            </v-select>
                          </div>
                          <div v-else>
                            <v-select
                                :items="payloadKeys"
                                :label="key.name"
                                @input="selectRelationshipPropertyKey($event, key)"
                            >

                              <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                            </v-select>
                          </div>

                          <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                      </div>


                    </div>

                    <v-btn
                        @click="createTransformation()"
                        color="success"
                        class="mr-4"
                        :disabled="isMainFormValid()"
                    >
                      <v-progress-circular
                          indeterminate
                          v-if="loading"
                      ></v-progress-circular>
                      <span v-if="!loading">Create</span>
                    </v-btn>

                    <v-btn
                        @click="reset()"
                        color="error"
                        class="mr-4"
                        v-if="!loading"
                    >
                      Reset
                    </v-btn>

                  </v-form>
                </v-col>

                <v-col :cols="6">
                  <h4>{{$t('typeTransformation.currentDataSet')}}<info-tooltip :message="$t('dataMapping.samplePayloadHelp')"></info-tooltip> </h4>
                  <v-textarea
                      filled
                      name="input-7-4"
                      :value="unmapped.data | pretty"
                      :rows="50"
                  ></v-textarea>
                </v-col>
              </v-row>

            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
 import InfoTooltip from "@/components/infoTooltip.vue";
import {
  ImportDataT,
  MetatypeKeyT,
  MetatypeRelationshipKeyT,
  MetatypeRelationshipPairT,
  MetatypeT,
  TypeMappingTransformationCondition, TypeMappingTransformationPayloadT, TypeMappingTransformationSubexpression
} from "@/api/types";

  @Component({
    filters: {
      pretty: function(value: any) {
        return JSON.stringify(value, null, 2)
      }
    },
    components: {
      InfoTooltip
    }})
  export default class NewTransformationDialog extends Vue {
    @Prop({required: true})
    readonly unmapped!: ImportDataT | null

    @Prop({required: true})
    readonly dataSourceID!: string;

    @Prop({required: true})
    readonly containerID!: string

    @Prop({required: true})
    readonly typeMappingID!: string

    errorMessage = ""
    search = ""
    expanded = []
    loading = false
    dialog = false
    payloadType = ""
    conditionFormValid = false
    subexpressionFormValid = false
    mainFormValid = false

    metatypes: MetatypeT[] = []

    conditionKey = ""
    conditionOperator: {text: string; value: any; requiresValue: boolean} | null = null
    conditionValue = ""
    conditions: TypeMappingTransformationCondition[] = []

    subexpressionExpression = ""
    subexpressionKey = ""
    subexpressionOperator: {text: string; value: any; requiresValue: boolean} | null = null
    subexpressionValue = ""

    payloadKeys: any = null

    operators = [
      {text: "eq", value: "eq", requiresValue: true},
      {text: "neq", value: "neq", requiresValue: true},
      {text: "in", value: "in", requiresValue: true},
      {text: "like", value: "like", requiresValue: true},
      {text: "exists", value: "exists", requiresValue: false},
    ]
    expressions = ["AND", "OR"]
    onConflictOptions = ["create", "update", "ignore"]

    relationshipPairSearch = ""
    relationshipPairs: MetatypeRelationshipPairT[] = []
    selectedRelationshipPair: MetatypeRelationshipPairT | null = null
    selectedMetatypeRelationshipPairKeys: MetatypeRelationshipKeyT[] = []
    selectedMetatype: MetatypeT | null = null
    selectedMetatypeKeys: MetatypeKeyT[] = []

    origin_key: any = null
    destination_key: any = null
    uniqueIdentifierKey: any = null
    onConflict: any = null
    propertyMapping: {[key: string]: any}[] = []

    conditionsHeader = [{
      text: "Key",
      value: "key"
    },{
      text: "Operator",
      value: "operator",
    },{
      text: "Value",
      value: "value"
    },
    {text: "Actions", value: "actions", sortable: false}
    ]

    subexpressionHeader = [
    {
     text: "Expression",
     value: "expression"
    },{
      text: "Key",
      value: "key"
    },{
      text: "Operator",
      value: "operator",
    },{
      text: "Value",
      value: "value"
    },
      {text: "Actions", value: "actions", sortable: false}
    ]

    reset() {
      const mainForm: any = this.$refs.mainForm
      const conditionForm: any = this.$refs.conditionForm

      mainForm.reset()
      conditionForm.reset()

      this.conditions = []
      this.relationshipPairSearch = ""
      this.relationshipPairs = []
      this.selectedRelationshipPair = null
      this.selectedMetatypeRelationshipPairKeys = []
      this.selectedMetatype = null
      this.selectedMetatypeKeys = []
    }


    @Watch('search', {immediate: true})
    onSearchChange(newVal: string) {
      this.$client.listMetatypes(this.containerID, {name: newVal})
          .then((metatypes: MetatypeT[]) => {
            this.metatypes = metatypes
          })
          .catch((e: any) => this.errorMessage = e)
    }

    @Watch('relationshipPairSearch', {immediate: true})
    onRelationshipSearchChange(newVal: string) {
      this.$client.listMetatypeRelationshipPairs(this.containerID, {
        name: newVal,
        limit: 1000,
        offset: 0,
        originID: undefined,
        destinationID: undefined,
        metatypeID: (this.selectedMetatype) ? this.selectedMetatype?.id! : undefined
      })
          .then(pairs => {
            this.relationshipPairs = pairs
          })
          .catch(e => this.errorMessage = e)
    }

    @Watch('selectedMetatype', {immediate: true})
    onMetatypeChange(newMetatype: MetatypeT) {
      this.selectedMetatypeKeys = []

      this.$client.listMetatypeRelationshipPairs(this.containerID, {
        name: undefined,
        limit: 1000,
        offset: 0,
        originID: undefined,
        destinationID: undefined,
        metatypeID: this.selectedMetatype?.id!
      })
          .then(pairs => {
            this.relationshipPairs = pairs
          })
          .catch(e => this.errorMessage = e)

      this.$client.listMetatypeKeys(this.containerID, newMetatype.id)
          .then(keys => this.selectedMetatypeKeys = keys)
          .catch(e => this.errorMessage = e)
    }

    @Watch('selectedRelationshipPair', {immediate: true})
    onMetatypeRelationshipChange(newPair: MetatypeRelationshipPairT) {
      if(!newPair) return;

      this.$client.listMetatypeRelationshipKeys(this.containerID, newPair.relationship_id)
          .then(keys => this.selectedMetatypeRelationshipPairKeys = keys)
          .catch(e => this.errorMessage = e)
    }

    mounted() {
      this.payloadKeys = []

      this.payloadKeys = Object.keys(this.flatten(this.unmapped!.data))
    }

    createTransformation() {
      this.loading = true
      const payload: {[key: string]: any} = {}

      // include either the metatype or metatype relationship pair id, not both
      if(this.selectedMetatype) {
        payload.metatype_id = this.selectedMetatype.id
      } else if(this.selectedRelationshipPair) {
        payload.metatype_relationship_pair_id = this.selectedRelationshipPair.id
        payload.origin_id_key = this.origin_key
        payload.destination_id_key = this.destination_key
      }

      payload.conditions = this.conditions
      payload.keys = this.propertyMapping
      if(this.uniqueIdentifierKey) payload.unique_identifier_key = this.uniqueIdentifierKey
      if(this.onConflict) payload.on_conflict = this.onConflict

      this.$client.createTypeMappingTransformation(this.containerID, this.dataSourceID, this.typeMappingID, payload as TypeMappingTransformationPayloadT)
      .then(() => {
        this.loading = false
        this.reset()
        this.dialog = false
      })
      .catch((e) => this.errorMessage = e)
    }

    payloadTypes() {
      return [{
        name: this.$t("dataMapping.metatype"),
        value: 'metatype'
      },{
        name: this.$t("dataMapping.metatypeRelationship"),
        value: 'metatype-relationship'
      }]
    }

    selectPropertyKey(key: string, metatypeKey: MetatypeKeyT) {
      if(this.propertyMapping.length <= 0) {
        this.propertyMapping.push({
          key: key,
          metatype_key_id: metatypeKey.id
        })

        return
      }

      this.propertyMapping = this.propertyMapping.filter(prop => {return prop.metatype_key_id !== metatypeKey.id})

      this.propertyMapping.push({
        key:key,
        metatype_key_id: metatypeKey.id
      })
    }

    selectRelationshipPropertyKey(key: string, metatypeRelationshipKey: MetatypeRelationshipKeyT) {
      if(this.propertyMapping.length <= 0) {
        this.propertyMapping.push({
          key: key,
          metatype_relationship_key_id: metatypeRelationshipKey.id
        })

        return
      }

      this.propertyMapping = this.propertyMapping.filter(prop => {return prop.metatype_relationship_key_id !== metatypeRelationshipKey.id})

      this.propertyMapping.push({
        key:key,
        metatype_relationship_key_id: metatypeRelationshipKey.id
      })
    }

    addCondition() {
      const duplicate = this.conditions.find(c => c.key === this.conditionKey && c.operator === this.conditionOperator?.value && c.value === this.conditionValue)

      if(!duplicate) {
        this.conditions.push({
          key: this.conditionKey,
          operator: this.conditionOperator?.value,
          value: this.conditionValue,
          subexpressions: []
        } as TypeMappingTransformationCondition)
      }

    }

    deleteCondition(condition: TypeMappingTransformationCondition) {
      this.conditions = this.conditions.filter(c => condition !== c)
    }

    addSubexpression(condition: TypeMappingTransformationCondition) {
      const duplicate = condition.subexpressions.find(c => c.expression === this.subexpressionExpression && c.key === this.subexpressionKey && c.operator === this.subexpressionOperator?.value && c.value === this.subexpressionValue)

      if(!duplicate) {
        condition.subexpressions.push({
          expression: this.subexpressionExpression as "AND" | "OR",
          key: this.subexpressionKey,
          operator: this.subexpressionOperator?.value,
          value: this.subexpressionValue
        })
      }

      this.subexpressionExpression = ""
      this.subexpressionKey = ""
      this.subexpressionValue = ""
      this.subexpressionOperator = null
    }

    deleteSubexpression(condition: TypeMappingTransformationCondition, subexpression: TypeMappingTransformationSubexpression){
      console.log(condition)
      console.log(subexpression)
      condition.subexpressions = condition.subexpressions.filter(s => s !== subexpression)
    }

    isMainFormValid() {
     if(!this.uniqueIdentifierKey) {
       return !this.mainFormValid
      }

     return !(this.uniqueIdentifierKey && this.onConflict && this.mainFormValid)
    }

    // we need all the keys in a given data payload, this
    // handles retrieving the nested keys and will go as deep
    // as the object does. The type mapping system in Deep Lynx
    // will be able to handle nested keys on anything EXCEPT the
    // type, origin, destination, and full ID keys.
    flatten(data: any): any {
      const result: any = {};
      function recurse (cur: any, prop: any): any {
        if (Object(cur) !== cur) {
          result[prop] = cur;
        } else if (Array.isArray(cur)) {
          const l = 0
          for(let i=0, l=cur.length; i<l; i++)
            recurse(cur[i], prop + "[" + i + "]");
          if (l == 0)
            result[prop] = [];
        } else {
          let isEmpty = true;
          for (const p in cur) {
            isEmpty = false;
            recurse(cur[p], prop ? prop+"."+p : p);
          }
          if (isEmpty && prop)
            result[prop] = {};
        }
      }
      recurse(data, "");
      return result;
    }
  }
</script>
