<template>
    <v-dialog v-model="dialog" @click:outside="reset">
        <template v-slot:activator="{ on }">
          <v-icon
              v-if="icon"
              small
              class="mr-2"
              v-on="on"
              @click="editReset()"
          >mdi-eye</v-icon>
          <v-btn v-if="!transformation && !icon" color="primary" dark class="mb-2" v-on="on">{{$t("dataMapping.newTransformationButton")}}</v-btn>
        </template>
        <v-card>
            <error-banner :message="errorMessage"></error-banner>
            <v-card-text>
              <v-row>
                <v-col :cols="6" >
                  <h2 v-if="!transformation">{{$t("dataMapping.createNewTransformation")}}</h2>
                  <h2 v-if="transformation">{{$t("dataMapping.editTransformation")}}</h2>
                  <v-divider></v-divider>
                    <v-row v-if="payloadArrayKeys.length > 0">
                      <v-col :cols="6">
                        <v-select
                            :items="payloadArrayKeys"
                            v-model="rootArray"
                            clearable
                        >

                          <template v-slot:label>{{$t('dataMapping.rootArray')}} <small>{{$t('dataMapping.optional')}}</small></template>
                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.rootArrayHelp')"></info-tooltip> </template>
                        </v-select>
                      </v-col>
                    </v-row>
                  <h3 style="padding-top: 10px">{{$t("dataMapping.conditions")}} <small>{{$t("dataMapping.optional")}}</small> <info-tooltip :message="$t('dataMapping.conditionsHelp')"></info-tooltip></h3>
                  <v-data-table
                      :single-expand="true"
                      :expanded.sync="expanded"
                      :headers="conditionsHeader()"
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
                         <h3>{{$t("dataMapping.subexpressions")}} <small>{{$t("dataMapping.optional")}}</small> <info-tooltip :message="$t('dataMapping.subexpressionsHelp')"></info-tooltip></h3>
                          <v-data-table
                              :headers="subexpressionHeader()"
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
                                   :label="$t('dataMapping.expression')"
                                   required
                               >

                                 <template slot="append-outer"><info-tooltip :message="$t('dataMapping.expressionHelp')"></info-tooltip> </template>
                               </v-select>
                             </v-col>
                             <v-col :cols="3">
                               <v-select
                                   :items="payloadKeys"
                                   :rules="[v => !!v || 'Select one']"
                                   v-model="subexpressionKey"
                                   :label="$t('dataMapping.key')"
                                   required
                               >

                                 <template slot="append-outer"><info-tooltip :message="$t('dataMapping.keyHelp')"></info-tooltip> </template>
                               </v-select>
                             </v-col>
                             <v-col :cols="3">
                               <v-select
                                   :items="operators"
                                   :rules="[v => !!v || 'Select one']"
                                   v-model="subexpressionOperator"
                                   :return-object="true"
                                   :label="$t('dataMapping.operator')"
                                   required
                               >

                                 <template slot="append-outer"><info-tooltip :message="$t('dataMapping.operatorHelp')"></info-tooltip> </template>
                               </v-select>
                             </v-col>
                             <v-col :cols="3">
                               <v-text-field
                                   v-model="subexpressionValue"
                                   :disabled="subexpressionOperator && !subexpressionOperator.requiresValue"
                                   :label="$t('dataMapping.value')">

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
                            :label="$t('dataMapping.key')"
                            required
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.keyHelp')"></info-tooltip> </template>
                        </v-select>
                      </v-col>
                      <v-col :cols="4">
                        <v-select
                            :items="operators"
                            v-model="conditionOperator"
                            :return-object="true"
                            :rules="[v => !!v || 'Select one']"
                            :label="$t('dataMapping.operator')"
                            required
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.operatorHelp')"></info-tooltip> </template>
                        </v-select>
                      </v-col>
                      <v-col :cols="4">
                        <v-text-field
                          v-model="conditionValue"
                          :disabled="conditionOperator && !conditionOperator.requiresValue"
                          :label="$t('dataMapping.value')">

                        </v-text-field>
                        <v-btn :disabled="!conditionFormValid" @click="addCondition">{{$t("dataMapping.addCondition")}}</v-btn>
                      </v-col>
                    </v-row>

                  </v-form>

                  <v-form
                      ref="mainForm"
                      v-model="mainFormValid"
                  >

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
                        <v-row>
                          <v-col>
                            <v-select
                                v-if="!rootArray"
                                :items="payloadKeys"
                                v-model="uniqueIdentifierKey"
                                clearable
                            >

                              <template v-slot:label>{{$t('dataMapping.uniqueIdentifierKey')}} <small>{{$t('dataMapping.optional')}}</small></template>
                              <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueIdentifierHelp')"></info-tooltip> </template>
                            </v-select>
                            <v-select
                                v-if="rootArray"
                                :items="rootArrayKeys"
                                v-model="uniqueIdentifierKey"
                                clearable
                            >
                              <template v-slot:label>{{$t('dataMapping.rootArrayUniqueIdentifierKey')}} <small>{{$t('dataMapping.optional')}}</small></template>
                              <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueIdentifierHelp')"></info-tooltip> </template>
                            </v-select>
                          </v-col>
                        </v-row>
                        <br>

                        <v-row v-if="keysLoading">
                          <v-col :cols="12">
                            <v-progress-linear
                                indeterminate
                                color="orange"
                            ></v-progress-linear>
                          </v-col>
                        </v-row>

                        <h4 v-if="selectedMetatypeKeys.length > 0">{{$t('dataMapping.metatypePropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                        <div v-for="key in selectedMetatypeKeys" :key="key.id">
                          <v-row>
                            <v-col :cols="6">
                              <h4>{{key.name}} <info-tooltip :message="key.description"></info-tooltip></h4>
                              <v-select
                                  :items="payloadKeys"
                                  label="map payload key"
                                  @input="selectPropertyKey($event, key)"
                                  clearable
                                  eager
                                  :disabled="isValueMapped(key)"
                                  :value="propertyKey(key)"
                              >
                                <template v-slot:append-outer>{{$t("dataMapping.or")}}</template>
                                <template v-slot:label>{{$t('dataMapping.mapPayloadKey')}} <small style="color:red" v-if="key.required">{{$t("dataMapping.required")}}</small></template>
                              </v-select>
                            </v-col>
                            <v-col :cols="6">
                              <h4 style="color:white">{{key.name}} x</h4>
                                  <v-text-field
                                      v-if="key.data_type !== 'boolean'"
                                      :label="$t('dataMapping.constantValue')"
                                      @input="selectPropertyKey($event, key, true)"
                                      :disabled="isKeyMapped(key, true)"
                                      :value="propertyKeyValue(key)"
                                  />
                                  <v-select
                                      v-if="key.data_type == 'boolean'"
                                      :label="$t('dataMapping.constantValue')"
                                      :items="['true', 'false']"
                                      @input="selectPropertyKey($event, key, true)"
                                      :disabled="isKeyMapped(key, true)"
                                      :value="propertyKeyValue(key)"
                                    />
                            </v-col>
                          </v-row>
                        </div>
                      </div>


                    </div>

                    <!-- RELATIONSHIP -->
                    <div v-if="payloadType === 'metatype-relationship'">

                      <v-autocomplete
                          :items="relationshipPairs"
                          v-model="selectedRelationshipPair"
                          :search-input.sync="relationshipPairSearch"
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

                      <v-row v-if="this.selectedRelationshipPair">
                        <v-col>
                          <v-select
                              :items="payloadKeys"
                              v-model="origin_key"
                              :rules="[v => !!v || 'Item is required']"
                              required
                          >

                            <template v-slot:label>{{$t('dataMapping.originKey')}} <small style="color:red">{{$t('dataMapping.required')}}</small></template>
                            <template slot="append-outer">{{$t('dataMapping.and')}}</template>
                          </v-select>
                        </v-col>
                        <v-col>
                          <v-select
                              :items="payloadKeys"
                              v-model="destination_key"
                              :rules="[v => !!v || 'Item is required']"
                              required
                          >

                            <template v-slot:label>{{$t('dataMapping.destinationKey')}} <small style="color:red">{{$t('dataMapping.required')}}</small></template>
                            <template slot="append-outer"><info-tooltip :message="$t('dataMapping.originDestinationKeyHelp')"></info-tooltip> </template>
                          </v-select>
                        </v-col>
                      </v-row>

                      <br>
                      <h4 v-if="selectedMetatypeRelationshipPairKeys.length > 0">{{$t('dataMapping.metatypeRelationshipPropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                      <div v-for="key in selectedMetatypeRelationshipPairKeys" :key="key.id">
                        <v-row>
                          <v-col :cols="6">
                            <v-select
                                :items="payloadKeys"
                                @input="selectRelationshipPropertyKey($event, key)"
                                :disabled="isRelationshipValueMapped(key)"
                                :value="relationshipPropertyKey(key)"
                            >

                              <template v-slot:append-outer>{{$t('dataMapping.or')}}</template>
                              <template v-slot:label>{{$t("dataMapping.mapPayloadKey")}} <small style="color:red" v-if="key.required">{{$t('dataMapping.required')}}</small></template>
                            </v-select>
                          </v-col>
                          <v-col :cols="6">
                            <h4 style="color:white">{{key.name}} x</h4>
                            <v-text-field
                                v-if="key.data_type !== 'boolean'"
                                :label="$t('dataMapping.constantValue')"
                                @input="selectRelationshipPropertyKey($event, key, true)"
                                :disabled="isRelationshipKeyMapped(key, true)"
                                :value="relationshipPropertyKeyValue(key)"
                                clearable
                            />
                            <v-select
                                v-if="key.data_type == 'boolean'"
                                :label="$t('dataMapping.constantValue')"
                                :items="['true', 'false']"
                                clearable
                                @input="selectRelationshipPropertyKey($event, key, true)"
                                :disabled="isRelationshipKeyMapped(key)"
                                :value="relationshipPropertyKeyValue(key)"
                            />
                          </v-col>
                        </v-row>
                      </div>


                    </div>

                    <v-btn
                        v-if="!transformation"
                        @click="createTransformation()"
                        color="success"
                        class="mr-4"
                        :disabled="!isMainFormValid"
                    >
                      <v-progress-circular
                          indeterminate
                          v-if="loading"
                      ></v-progress-circular>
                      <span v-if="!loading">{{$t("dataMapping.create")}}</span>
                    </v-btn>

                    <v-btn
                        v-if="transformation"
                        @click="editTransformation()"
                        color="success"
                        class="mr-4"
                        :disabled="!isMainFormValid"
                    >
                      <v-progress-circular
                          indeterminate
                          v-if="loading"
                      ></v-progress-circular>
                      <span v-if="!loading">{{$t("dataMapping.edit")}}</span>
                    </v-btn>

                    <v-btn
                        @click="reset()"
                        color="error"
                        class="mr-4"
                        v-if="!loading && !transformation"
                    >
                      {{$t("dataMapping.reset")}}
                    </v-btn>

                    <v-btn
                        @click="editReset()"
                        color="error"
                        class="mr-4"
                        v-if="!loading && transformation"
                    >
                      {{$t("dataMapping.reset")}}
                    </v-btn>

                  </v-form>
                </v-col>

                <v-col :cols="6">
                  <h4>{{$t('typeTransformation.currentDataSet')}}<info-tooltip :message="$t('dataMapping.samplePayloadHelp')"></info-tooltip> </h4>
                  <v-textarea
                      filled
                      name="input-7-4"
                      :value="payload | pretty"
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
  MetatypeKeyT,
  MetatypeRelationshipKeyT,
  MetatypeRelationshipPairT,
  MetatypeT,
  TypeMappingTransformationCondition,
  TypeMappingTransformationPayloadT,
  TypeMappingTransformationSubexpression,
  TypeMappingTransformationT
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
  export default class TransformationDialog extends Vue {
    @Prop({required: true})
    readonly payload!: object;

    @Prop({required: true})
    readonly dataSourceID!: string;

    @Prop({required: true})
    readonly containerID!: string

    @Prop({required: true})
    readonly typeMappingID!: string

    @Prop({required: false})
    readonly transformation!: TypeMappingTransformationT | null

    @Prop({required: false})
    readonly icon!: boolean

    errorMessage = ""
    search = ""
    expanded = []
    loading = false
    keysLoading = false
    dialog = false
    payloadType = ""
    conditionFormValid = false
    subexpressionFormValid = false
    mainFormValid = false
    requiredKeysMapped = true

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
    payloadArrayKeys: any = []
    rootArray: any = null
    rootArrayKeys: any = null

    operators = [
      {text: "==", value: "==", requiresValue: true},
      {text: "!=", value: "!=", requiresValue: true},
      {text: "in", value: "in", requiresValue: true},
      {text: "contains", value: "contains", requiresValue: true},
      {text: "exists", value: "exists", requiresValue: false},
      {text: "<", value: "<", requiresValue: false},
      {text: "<=", value: "<=", requiresValue: false},
      {text: ">", value: ">", requiresValue: false},
      {text: ">=", value: ">=", requiresValue: false},
    ]
    expressions = ["AND", "OR"]

    relationshipPairSearch = ""
    relationshipPairs: MetatypeRelationshipPairT[] = []
    selectedRelationshipPair: MetatypeRelationshipPairT | null = null
    selectedMetatypeRelationshipPairKeys: MetatypeRelationshipKeyT[] = []
    selectedMetatype: MetatypeT | null = null
    selectedMetatypeKeys: MetatypeKeyT[] = []

    origin_key: any = null
    destination_key: any = null
    uniqueIdentifierKey: any = null
    propertyMapping: {[key: string]: any}[] = []

    conditionsHeader() {
     return  [{
       text: this.$t('dataMapping.key'),
       value: "key"
     },{
       text: this.$t('dataMapping.operator'),
       value: "operator",
     },{
       text: this.$t('dataMapping.value'),
       value: "value"
     },
       {text: this.$t('dataMapping.actions'), value: "actions", sortable: false}
     ]
    }

    subexpressionHeader() {
     return  [
       {
         text: this.$t('dataMapping.expression'),
         value: "expression"
       },{
         text: this.$t('dataMapping.key'),
         value: "key"
       },{
         text: this.$t('dataMapping.operator'),
         value: "operator",
       },{
         text: this.$t('dataMapping.value'),
         value: "value"
       },
       {text: this.$t('dataMapping.actions'), value: "actions", sortable: false}
     ]
    }

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

    editReset() {
      if(this.transformation?.metatype_id){
        this.$client.retrieveMetatype(this.containerID, this.transformation?.metatype_id!)
        .then((metatype) => {
          this.rootArray = this.transformation?.root_array
          if(Array.isArray(this.transformation?.conditions)) this.conditions = this.transformation?.conditions as Array<TypeMappingTransformationCondition>
          this.payloadType = 'metatype'
          this.selectedMetatype = metatype
          this.uniqueIdentifierKey = this.transformation?.unique_identifier_key

          if(Array.isArray(this.transformation?.keys)) this.propertyMapping = this.transformation?.keys as Array<{[key: string]: any}>
        })
        .catch(e => this.errorMessage = e)
      }

      if(this.transformation?.metatype_relationship_pair_id) {
        this.$client.retrieveMetatypeRelationshipPair(this.containerID, this.transformation?.metatype_relationship_pair_id!)
            .then((pair) => {
              this.rootArray = this.transformation?.root_array
              if(Array.isArray(this.transformation?.conditions)) this.conditions = this.transformation?.conditions as Array<TypeMappingTransformationCondition>
              this.payloadType = 'metatype-relationship'
              this.selectedRelationshipPair = pair

              this.uniqueIdentifierKey = this.transformation?.unique_identifier_key
              this.origin_key = this.transformation?.origin_id_key
              this.destination_key = this.transformation?.destination_id_key

              if(Array.isArray(this.transformation?.keys)) this.propertyMapping = this.transformation?.keys as Array<{[key: string]: any}>
            })
            .catch(e => this.errorMessage = e)
      }
    }

    // returns whether or not all required keys of the selected metatype or metatype relationship have been mapped
    @Watch('propertyMapping', {immediate: true})
    areRequiredKeysMapped() {
      if(this.selectedMetatype) {
        let unmappedKeys = 0

        for(const key of this.selectedMetatypeKeys) {
          if(key.required) {
           if(!this.propertyMapping.find(prop => prop.metatype_key_id === key.id)) {
              unmappedKeys++
           }
          }
        }

        this.requiredKeysMapped = unmappedKeys === 0
        return
      }

      if(this.selectedRelationshipPair) {
        let unmappedKeys = 0

        for(const key of this.selectedMetatypeRelationshipPairKeys) {
          if(key.required) {
            if(!this.propertyMapping.find(prop => prop.metatype_relationship_key_id === key.id)) {
              unmappedKeys++
            }
          }
        }

        this.requiredKeysMapped = unmappedKeys === 0
        return
      }
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
      if(newVal === "") return

      this.$client.listMetatypeRelationshipPairs(this.containerID, {
        name: newVal,
        limit: 1000,
        offset: 0,
        originID: undefined,
        destinationID: undefined,
      })
          .then(pairs => {
            this.relationshipPairs = pairs
          })
          .catch(e => this.errorMessage = e)
    }

    @Watch('selectedMetatype', {immediate: true})
    onMetatypeChange(newMetatype: MetatypeT) {
      if(!newMetatype) {
        this.selectedMetatype = null
        return
      }

      this.selectedRelationshipPair = null
      this.origin_key = ""
      this.destination_key = ""

      this.selectedMetatypeKeys = []
      this.keysLoading = true

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
          .then(keys => {
            this.selectedMetatypeKeys = keys
            this.keysLoading = false
            this.areRequiredKeysMapped()
          })
          .catch(e => this.errorMessage = e)
    }

    @Watch('selectedRelationshipPair', {immediate: true})
    onMetatypeRelationshipChange(newPair: MetatypeRelationshipPairT) {
      if(!newPair) {
        this.selectedRelationshipPair = null
        return
      }

      this.keysLoading = true

      this.$client.listMetatypeRelationshipKeys(this.containerID, newPair.relationship_id)
          .then(keys => {
            this.selectedMetatypeRelationshipPairKeys = keys
            this.areRequiredKeysMapped()
            this.keysLoading = false
          })
          .catch(e => this.errorMessage = e)
    }

    @Watch('rootArray', {immediate: true})
    onRootArrayChange() {
      const flattened = this.flattenWithoutArray(this.payload)
      this.payloadKeys = Object.keys(flattened)

      if(this.rootArray){
        const rootArrayKeys = Object.keys(flattened[this.rootArray][0])
        this.rootArrayKeys = []
        rootArrayKeys.map(k => {
          this.payloadKeys.push(`${this.rootArray}.[].${k}`)
          this.rootArrayKeys.push(`${this.rootArray}.[].${k}`)
        })
      }
    }

    @Watch('payload', {immediate: true})
    onPayloadChange() {
      this.payloadKeys = []
      this.payloadArrayKeys = []

      const flattened = this.flattenWithoutArray(this.payload)
      this.payloadKeys = Object.keys(flattened)

      Object.keys(flattened).map(k => {
        if(Array.isArray(flattened[k]) && typeof flattened[k][0] === "object") {
          this.payloadArrayKeys.push(k)
        }
      })
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
      if(this.rootArray) payload.root_array = this.rootArray

      this.$client.createTypeMappingTransformation(this.containerID, this.dataSourceID, this.typeMappingID, payload as TypeMappingTransformationPayloadT)
      .then((transformation) => {
        this.loading = false
        this.reset()
        this.dialog = false
        this.$emit("transformationCreated", transformation)
      })
      .catch((e) => this.errorMessage = e)
    }

    editTransformation() {
      this.loading = true
      const payload: {[key: string]: any} = {}

      // include either the metatype or metatype relationship pair id, not both
      payload.metatype_id = (this.selectedMetatype?.id) ? this.selectedMetatype.id : ""
      payload.metatype_relationship_pair_id = (this.selectedRelationshipPair?.id) ? this.selectedRelationshipPair.id : ""
      payload.origin_id_key = this.origin_key
      payload.destination_id_key = this.destination_key

      payload.conditions = this.conditions
      payload.keys = this.propertyMapping
      if(this.uniqueIdentifierKey) payload.unique_identifier_key = this.uniqueIdentifierKey
      if(this.rootArray) payload.root_array = this.rootArray

      this.$client.updateTypeMappingTransformation(this.containerID, this.dataSourceID, this.typeMappingID,this.transformation?.id!, payload as TypeMappingTransformationPayloadT)
          .then((transformation) => {
            this.loading = false
            this.reset()
            this.dialog = false
            this.$emit("transformationUpdated", transformation)
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

    isKeyMapped(key: MetatypeKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_key_id === key.id)
      if(!mapped) return false

      if(mapped.key) return true

      return false
    }

    isValueMapped(key: MetatypeKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_key_id === key.id)
      if(!mapped) return false

      if(mapped.value) return true

      return false
    }

    isRelationshipKeyMapped(key: MetatypeRelationshipKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_relationship_key_id === key.id)
      if(!mapped) return false

      if(mapped.key) return true

      return false
    }

    isRelationshipValueMapped(key: MetatypeRelationshipKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_relationship_key_id === key.id)
      if(!mapped) return false

      if(mapped.value) return true

      return false
    }

    propertyKey(metatypeKey: MetatypeKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_key_id === metatypeKey.id)

      if(found) {
        return found.key
      }

      return null
    }

    propertyKeyValue(metatypeKey: MetatypeKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_key_id === metatypeKey.id)

      if(found) {
        return found.value
      }

      return null
    }

    relationshipPropertyKey(key: MetatypeRelationshipKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_relationship_key_id === key.id)

      if(found) {
        return found.key
      }

      return null
    }

    relationshipPropertyKeyValue(key: MetatypeRelationshipKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_relationship_key_id === key.id)

      if(found) {
        return found.value
      }

      return null
    }

    selectPropertyKey(key: string, metatypeKey: MetatypeKeyT, value?: boolean) {
      if(!key) {
        this.propertyMapping = this.propertyMapping.filter(prop => {return prop.metatype_key_id !== metatypeKey.id})
        return
      }

      if(value) {
        if(this.propertyMapping.length <= 0) {
          this.propertyMapping.push({
            value: key,
            value_type: metatypeKey.data_type,
            metatype_key_id: metatypeKey.id
          })

          return
        }

        this.propertyMapping = this.propertyMapping.filter(prop => {return prop.metatype_key_id !== metatypeKey.id})

        this.propertyMapping.push({
          value:key,
          value_type: metatypeKey.data_type,
          metatype_key_id: metatypeKey.id
        })
        return
      }

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

    selectRelationshipPropertyKey(key: string, metatypeRelationshipKey: MetatypeRelationshipKeyT, value?: boolean) {
      if(!key) {
        this.propertyMapping = this.propertyMapping.filter(prop => {return prop.metatype_relationship_key_id !== metatypeRelationshipKey.id})
        return
      }

      if(value) {
        if(this.propertyMapping.length <= 0) {
          this.propertyMapping.push({
            value: key,
            metatype_relationship_key_id: metatypeRelationshipKey.id
          })

          return
        }

        this.propertyMapping = this.propertyMapping.filter(prop => {return prop.metatype_relationship_key_id !== metatypeRelationshipKey.id})

        this.propertyMapping.push({
          value:key,
          metatype_relationship_key_id: metatypeRelationshipKey.id
        })

        return
      }


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
      condition.subexpressions = condition.subexpressions.filter(s => s !== subexpression)
    }

    get isMainFormValid() {
      if(!this.requiredKeysMapped) {
        return false
      }

      if(!this.selectedMetatype && !this.selectedRelationshipPair) {
        return false
      }

      if(!this.uniqueIdentifierKey) {
       return this.mainFormValid
       }

      return (this.uniqueIdentifierKey && this.mainFormValid)
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
          for(let i=0, l=cur.length; i<l; i++)
          result[prop] = cur
          recurse(cur[0], prop+".[]");
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

    flattenWithoutArray(data: any): any {
      const result: any = {};
      function recurse (cur: any, prop: any): any {
        if (Object(cur) !== cur) {
          result[prop] = cur;
        } else if (Array.isArray(cur)) {
          for(let i=0, l=cur.length; i<l; i++)
            result[prop] = cur
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
