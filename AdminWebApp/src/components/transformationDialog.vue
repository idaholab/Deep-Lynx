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
            <h2 v-if="transformation && !transformation.archived">{{$t("dataMapping.editTransformation")}}</h2>
            <h2 v-if="transformation && transformation.archived">{{$t("dataMapping.viewArchivedTransformation")}}</h2>
            <h4 v-if="transformation">{{transformation.id}}</h4>
            <v-divider></v-divider>
            <div id="mappingCol">
              <v-row v-if="payloadArrayKeys.length > 0">
                <v-col :cols="10">
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


              <h3 style="padding-top: 10px">{{$t("dataMapping.configuration")}} <info-tooltip :message="$t('dataMapping.configurationHelp')"></info-tooltip></h3>
              <v-row>
                <v-col :cols="6">
                  <v-form>
                    <v-select
                        :items="actionErrors()"
                        v-model="onConversionError"
                    >
                      <template v-slot:label>{{$t('dataMapping.onConversionError')}}</template>
                    </v-select>
                  </v-form>
                </v-col>
                <v-col :cols="6">
                  <v-form>
                    <v-select
                        :items="actionErrors()"
                        v-model="onKeyExtractionError"
                    >
                      <template v-slot:label>{{$t('dataMapping.onKeyExtractionError')}}</template>
                    </v-select>
                  </v-form>
                </v-col>
              </v-row>

              <v-form
                  ref="mainForm"
                  v-model="mainFormValid"
              >
                <h3 style="padding-top: 10px">{{$t("dataMapping.mapping")}} <info-tooltip :message="$t('dataMapping.mappingHelp')"></info-tooltip></h3>
                <v-select
                    :items="payloadTypes()"
                    v-model="payloadType"
                    item-text="name"
                    :rules="[v => !!v || 'Item is required']"
                    :label="$t('dataMapping.resultingDataType')"
                    required
                ></v-select>

                <!-- RECORD -->

                <div v-if="payloadType === 'record'">
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
                      clearable
                  >
                    <template slot="append-outer"><info-tooltip :message="$t('dataMapping.metatypeSearchHelp')"></info-tooltip> </template>
                  </v-autocomplete>

                  <div v-if="selectedMetatype !== null">
                    <v-row>
                      <v-col>
                        <v-combobox
                            v-if="!rootArray"
                            :items="payloadKeys"
                            v-model="uniqueIdentifierKey"
                            clearable
                        >

                          <template v-slot:label>{{$t('dataMapping.uniqueIdentifierKey')}} <small>{{$t('dataMapping.optional')}}</small></template>
                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueIdentifierHelp')"></info-tooltip> </template>
                        </v-combobox>
                        <v-combobox
                            v-if="rootArray"
                            :items="payloadKeys"
                            v-model="uniqueIdentifierKey"
                            clearable
                        >
                          <template v-slot:label>{{$t('dataMapping.uniqueIdentifierKey')}} <small>{{$t('dataMapping.optional')}}</small></template>
                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueIdentifierHelp')"></info-tooltip> </template>
                        </v-combobox>
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

                    <h4 v-if="selectedMetatypeKeys.length > 0">{{$t('dataMapping.metatypePropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip>  <v-btn
                        @click="autoPopulateMetatypeKeys()"
                        class="mr-4"
                    >
                      {{$t("dataMapping.autopopulate")}}
                    </v-btn></h4>

                    <div v-for="key in selectedMetatypeKeys" :key="key.id">
                      <v-row>
                        <v-col :cols="6">
                          <h4>{{key.name}} <info-tooltip v-if="key.description !== ''" :message="key.description"></info-tooltip></h4>
                          <v-combobox
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
                            <template v-slot:item="data">
                              <!-- Display alternate formatting and key use count if key has been selected -->
                              <span v-if="propertyMapping.find(prop => prop.key === data.item)">
                                <v-alert
                                  dense
                                  text
                                  type="success"
                                >
                                {{ data.item }} ({{ (propertyMapping.reduce((n, prop) => n + (prop.key === data.item), 0)) }})
                                </v-alert>
                              </span>
                              <!-- Otherwise simply display the key name -->
                              <span v-else>{{ data.item }}</span>
                            </template>
                          </v-combobox>
                        </v-col>
                        <v-col :cols="6">
                          <h4 style="color:white">{{key.name}}</h4>
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
                        <v-col :cols="12">
                          <v-text-field
                              v-if="key.data_type === 'date'"
                              :label="$t('dataMapping.dateFormatString')"
                              @input="setDateConversionFormatStringRecord($event, key)"
                          >

                            <template slot="append-outer"><a href="https://date-fns.org/v2.28.0/docs/parse" target="_blank">{{$t('dataMapping.dateFormatStringHelp')}}</a></template>
                          </v-text-field>
                        </v-col>
                      </v-row>
                    </div>
                  </div>


                </div>

                <!-- RELATIONSHIP -->
                <div v-if="payloadType === 'relationship'">

                  <v-autocomplete
                      :items="relationshipPairs"
                      v-model="selectedRelationshipPair"
                      :search-input.sync="relationshipPairSearch"
                      :single-line="false"
                      item-text="name"
                      clearable
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
                    <v-row>
                      <v-col>
                        <h3>{{$t('dataMapping.parentInformation')}}</h3>
                      </v-col>
                      <v-col>
                        <h3>{{$t('dataMapping.childInformation')}}</h3>
                      </v-col>
                    </v-row>

                    <!-- ID Keys -->
                    <v-row>
                      <v-col>
                        <v-select
                            :items="payloadKeys"
                            v-model="origin_key"
                            :rules="[v => !!v || 'Item is required']"
                            required
                        >

                          <template v-slot:label>{{$t('dataMapping.originKey')}} <small style="color:red">{{$t('dataMapping.required')}}</small></template>
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

                    <!-- Data Sources -->
                    <v-row>
                      <v-col style="padding: 0px">
                        <select-data-source
                            @selected="setParentDataSource"
                            :dataSourceID="originDataSourceID"
                            :containerID="containerID">
                        </select-data-source>
                      </v-col>
                      <v-col style="padding: 0px">
                        <select-data-source
                            :tooltip="true"
                            @selected="setChildDataSource"
                            :tooltipHelp="$t('dataMapping.dataSourceRelationshipHelp')"
                            :dataSourceID="destinationDataSourceID"
                            :containerID="containerID">
                        </select-data-source>
                      </v-col>
                    </v-row>


                    <!-- Metatypes -->
                    <v-row>
                      <v-col>
                        <search-metatypes
                            @selected="setParentMetatype"
                            :metatypeID="originMetatypeID"
                            :containerID="containerID">
                        </search-metatypes>
                      </v-col>
                      <v-col>
                        <search-metatypes
                            :tooltip="true"
                            @selected="setChildMetatype"
                            :tooltipHelp="$t('dataMapping.metatypeRelationshipHelp')"
                            :metatypeID="destinationMetatypeID"
                            :containerID="containerID">
                        </search-metatypes>
                      </v-col>
                    </v-row>
                  </v-row>

                  <br>
                  <h4 v-if="selectedMetatypeRelationshipPairKeys.length > 0">{{$t('dataMapping.metatypeRelationshipPropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip>
                    <v-btn
                        @click="autoPopulateRelationshipKeys()"
                        class="mr-4"
                    >
                      {{$t("dataMapping.autopopulate")}}
                    </v-btn>
                  </h4>
                  <div v-for="key in selectedMetatypeRelationshipPairKeys" :key="key.id">
                    <v-row>
                      <v-col :cols="6">
                        <v-combobox
                            :items="payloadKeys"
                            @input="selectRelationshipPropertyKey($event, key)"
                            :disabled="isRelationshipValueMapped(key)"
                            :value="relationshipPropertyKey(key)"
                        >

                          <template v-slot:append-outer>{{$t('dataMapping.or')}}</template>
                          <template v-slot:label>{{$t("dataMapping.mapPayloadKey")}} <small style="color:red" v-if="key.required">{{$t('dataMapping.required')}}</small></template>
                        </v-combobox>

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
                    <v-col :cols="12">
                      <v-text-field
                          v-if="key.data_type === 'date'"
                          :label="$t('dataMapping.dateFormatString')"
                          @input="setDateConversionFormatStringRelationship($event, key)"
                      >

                        <template slot="append-outer"><a href="https://date-fns.org/v2.28.0/docs/parse" target="_blank">{{$t('dataMapping.dateFormatStringHelp')}}</a></template>
                      </v-text-field>
                    </v-col>
                  </div>


                </div>

                <div>
                  <h4 style="padding-bottom: 20px;">
                    <span v-if="!rootArray">{{propertyMapping.length}} / {{payloadKeys.length}} properties selected</span>
                    <span v-if="rootArray">{{propertyMapping.length}} / {{payloadSelectedArrayKeys.length}} array properties selected ({{payloadKeys.length}} available)</span>
                  </h4>
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
                    :disabled="!isMainFormValid || transformation.archived"
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
                    :disabled="transformation.archived"
                >
                  {{$t("dataMapping.reset")}}
                </v-btn>

                <p><span style="color:red">*</span> = {{$t('dataMapping.requiredField')}}</p>
              </v-form>
            </div>
          </v-col>

          <v-col :cols="6">
            <div style="position: sticky; top: 0px;">
              <h4>{{$t('typeTransformation.currentDataSet')}}<info-tooltip :message="$t('dataMapping.samplePayloadHelp')"></info-tooltip> </h4>
              <v-card  style="overflow-y: scroll;" max-height="800px" id="dataCol">
                <json-view
                    :data="payload"
                    :maxDepth=1
                />
              </v-card>
            </div>
          </v-col>
        </v-row>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {
  DataSourceT,
  MetatypeKeyT,
  MetatypeRelationshipKeyT,
  MetatypeRelationshipPairT,
  MetatypeT, TransformationErrorAction,
  TypeMappingTransformationCondition,
  TypeMappingTransformationPayloadT,
  TypeMappingTransformationSubexpression,
  TypeMappingTransformationT
} from "@/api/types";
import {getNestedValue} from "@/utilities";
import SelectDataSource from "@/components/selectDataSource.vue";
import SearchMetatypes from "@/components/searchMetatypes.vue";

@Component({
  components: {SelectDataSource, SearchMetatypes},
  filters: {
    pretty: function(value: any) {
      return JSON.stringify(value, null, 2)
    }
  }
})
export default class TransformationDialog extends Vue {
  @Prop({required: true})
  readonly payload!: object;

  @Prop({required: true})
  readonly dataSourceID!: string;

  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: true})
  readonly typeMappingID!: string

  @Prop({required: false, default: null})
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
  onConversionError: TransformationErrorAction = 'fail on required'
  onKeyExtractionError: TransformationErrorAction = 'fail on required'


  subexpressionExpression = ""
  subexpressionKey = ""
  subexpressionOperator: {text: string; value: any; requiresValue: boolean} | null = null
  subexpressionValue = ""

  payloadKeys: any = []
  payloadSelectedArrayKeys: any = []
  payloadArrayKeys: any = []
  rootArray: any = null
  rootArrayKeys: any = []

  operators = [
    {text: "==", value: "==", requiresValue: true},
    {text: "!=", value: "!=", requiresValue: true},
    {text: "in", value: "in", requiresValue: true},
    {text: "contains", value: "contains", requiresValue: true},
    {text: "exists", value: "exists", requiresValue: false},
    {text: "<", value: "<", requiresValue: true},
    {text: "<=", value: "<=", requiresValue: true},
    {text: ">", value: ">", requiresValue: true},
    {text: ">=", value: ">=", requiresValue: true},
  ]
  expressions = ["AND", "OR"]

  relationshipPairSearch = ""
  relationshipPairs: MetatypeRelationshipPairT[] = []
  selectedRelationshipPair: MetatypeRelationshipPairT | null = null
  selectedMetatypeRelationshipPairKeys: MetatypeRelationshipKeyT[] = []
  selectedMetatype: MetatypeT | null = null
  selectedMetatypeKeys: MetatypeKeyT[] = []

  origin_key: any = null
  origin_data_source_id: any = null
  origin_metatype_id: any = null

  destination_key: any = null
  destination_data_source_id: any = null
  destination_metatype_id: any = null

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

  actionErrors() {
    return [{
      text: this.$t('dataMapping.failOnRequired'),
      value: 'fail on required'
    },{
      text: this.$t('dataMapping.fail'),
      value: 'fail'
    },{
      text: this.$t('dataMapping.ignore'),
      value: 'ignore'
    },
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
            this.payloadType = 'record'
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
            this.payloadType = 'relationship'
            this.selectedRelationshipPair = pair

            this.uniqueIdentifierKey = this.transformation?.unique_identifier_key
            this.origin_key = this.transformation?.origin_id_key
            this.destination_key = this.transformation?.destination_id_key

            if(Array.isArray(this.transformation?.keys)) this.propertyMapping = this.transformation?.keys as Array<{[key: string]: any}>
          })
          .catch(e => this.errorMessage = e)
    }
  }

  updated() {
    this.handleResize()
  }

  // retrieves the height of the type mapping column (on left) if present
  // and assigns that height to the data column (on right)
  handleResize() {
    const mappingCol = document.getElementById("mappingCol")
    let height = 0
    if (mappingCol) {
      height = mappingCol!.offsetHeight
    }

    // only assign values if they are reasonable and column is present
    if (document.getElementById("dataCol") && height > 600) {
      document.getElementById("dataCol")!.style.height = height + 'px'
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
        .then((metatypes) => {
          this.metatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('relationshipPairSearch', {immediate: true})
  onRelationshipSearchChange(newVal: string, limit = 1000, offset = 0) {
    if(newVal === "") return

    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      name: newVal,
      limit,
      offset,
      originID: undefined,
      destinationID: undefined,
    })
        .then(pairs => {
          this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
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
          this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
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
    this.payloadKeys = []

    // first fetch all keys that are not arrays and are the top level
    const flattened = this.flattenWithoutArray(this.payload)
    Object.keys(flattened).map(k => {
      // add key if it is not an array
      if (!Array.isArray(flattened[k])) this.payloadKeys.push(k)
      // also add key if it is an array of primitives
      else if (Array.isArray(flattened[k]) && typeof flattened[k][0] != "object") {
        this.payloadKeys.push(k)
      }
    })

    if(this.rootArray){
      // now let's split the root array key-name so that we can get each
      // key-name for each potential layer
      const parts = this.rootArray.split('[]')

      let prevBracketCount = 0
      for(let i = 0; i < parts.length; i++) {
        const key = parts.slice(0, i+1).join('[]')
        const cleanKey = (key.charAt(key.length -1) === ".") ? key.substr(0, key.length -1) : key

        // now that we have a clean key, fetch the first value in that array payload
        // if it's an object, push its keys into the resulting payload keys
        const value = getNestedValue(cleanKey, this.payload, new Array(i +1).fill(0))

        if(Array.isArray(value)) {
          const keys = Object.keys(value[0])

          keys.map(k => {
            if(!Array.isArray(value[0][k])) {
              this.payloadKeys.push(`${cleanKey}.[].${k}`)

              // remove keys for higher array objects so that
              // we are left with keys for the lowest array objects
              const bracketCount = (`${cleanKey}.[].${k}`.split("[]").length - 1)

              if(bracketCount > prevBracketCount) {
                // set prevBracketCount to the new highest number of brackets
                prevBracketCount = bracketCount

                // reset the array to remove all previously stored keys
                this.payloadSelectedArrayKeys = []
              }
              this.payloadSelectedArrayKeys.push(`${cleanKey}.[].${k}`)
            }
          })
        }

      }
    }
  }

  @Watch('payload', {immediate: true})
  onPayloadChange() {
    this.payloadKeys = []
    this.payloadArrayKeys = []

    const flattened = this.flattenWithoutArray(this.payload)
    Object.keys(flattened).map(k => {
      // add key if it is not an array
      if (!Array.isArray(flattened[k])) this.payloadKeys.push(k)
      // also add key if it is an array of primitives
      else if (Array.isArray(flattened[k]) && typeof flattened[k][0] != "object") {
        this.payloadKeys.push(k)
      }
    })

    const flattenedWithArrays = this.flatten(this.payload)

    Object.keys(flattenedWithArrays).map(k => {
      if(Array.isArray(flattenedWithArrays[k]) && typeof flattenedWithArrays[k][0] === "object") {
        this.payloadArrayKeys.push(k)
      }
    })
  }

  // autoPopulateMetatypeKeys attempts to match a selected metatype key's to payload
  // keys by property name
  autoPopulateMetatypeKeys() {
    if(this.selectedMetatype) {
      this.payloadKeys.forEach((payloadKey: string) =>  {
        // first, because payload keys are dot notated we need to strip it and find the root of each key
        const stripped = payloadKey.split('.')
        const rootKey = stripped[stripped.length-1]

        const metatypeKey = this.selectedMetatypeKeys.find(metatypeKey => metatypeKey.property_name === rootKey)

        if(metatypeKey) {
          this.propertyMapping.push({
            key: payloadKey,
            metatype_key_id: metatypeKey.id
          })
        }
      })
    }
  }

  autoPopulateRelationshipKeys() {
    if(this.selectedRelationshipPair) {
      this.payloadKeys.forEach((payloadKey: string) =>  {
        // first, because payload keys are dot notated we need to strip it and find the root of each key
        const stripped = payloadKey.split('.')
        const rootKey = stripped[stripped.length-1]

        const relationship = this.selectedMetatypeRelationshipPairKeys.find(relationshipKey => relationshipKey.property_name === rootKey)

        if(relationship) {
          this.propertyMapping.push({
            key: payloadKey,
            metatype_relationshipc_key_id: relationship.id
          })
        }
      })
    }
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
      payload.origin_data_source_id = this.origin_data_source_id
      payload.origin_metatype_id = this.origin_metatype_id
      payload.destination_id_key = this.destination_key
      payload.destination_metatype_id = this.destination_metatype_id
      payload.destination_data_source_id = this.destination_data_source_id
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
    payload.origin_data_source_id = this.origin_data_source_id
    payload.origin_metatype_id = this.origin_metatype_id
    payload.destination_id_key = this.destination_key
    payload.destination_metatype_id = this.destination_metatype_id
    payload.destination_data_source_id = this.destination_data_source_id

    payload.conditions = this.conditions
    payload.keys = this.propertyMapping
    payload.type_mapping_id = this.typeMappingID
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
      name: this.$t("dataMapping.record"),
      value: 'record'
    },{
      name: this.$t("dataMapping.relationship"),
      value: 'relationship'
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

  setDateConversionFormatStringRecord(formatString: string, metatypeKey: MetatypeKeyT) {
    const index = this.propertyMapping.findIndex(prop => prop.metatype_key_id === metatypeKey.id)

    if(index != -1) {
      this.propertyMapping[index].date_conversion_format_string = formatString
    }
  }

  setDateConversionFormatStringRelationship(formatString: string, metatypeRelationshipKey: MetatypeRelationshipKeyT) {
    const index = this.propertyMapping.findIndex(prop => prop.metatype_relationship_key_id === metatypeRelationshipKey.id)

    if(index != -1) {
      this.propertyMapping[index].date_conversion_format_string = formatString
    }
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

  setParentDataSource(ds: DataSourceT) {
    if(ds) {
      this.origin_data_source_id = ds.id as string
    }
  }

  setChildDataSource(ds: DataSourceT) {
    if(ds) {
      this.destination_data_source_id = ds.id as string
    }
  }

  setParentMetatype(m: MetatypeT) {
    if(m) {
      this.origin_metatype_id = m.id
    }
  }

  setChildMetatype(m: MetatypeT) {
    if(m) {
      this.destination_metatype_id = m.id
    }
  }

  get originDataSourceID() {
    if(this.transformation) {
      return this.transformation.origin_data_source_id
    } else {
      return this.dataSourceID
    }
  }

  get destinationDataSourceID() {
    if(this.transformation) {
      return this.transformation.destination_data_source_id
    } else {
      return this.dataSourceID
    }
  }

  get originMetatypeID() {
    if(this.transformation) {
      return this.transformation.origin_metatype_id
    } else if(this.selectedRelationshipPair) {
      return this.selectedRelationshipPair.origin_metatype_id
    } else {
      return null
    }
  }

  get destinationMetatypeID() {
    if(this.transformation) {
      return this.transformation.destination_metatype_id
    } else if(this.selectedRelationshipPair) {
      return this.selectedRelationshipPair.destination_metatype_id
    } else {
      return null
    }
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
