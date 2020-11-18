<template>
    <v-card>
        <error-banner :message="errorMessage"></error-banner>
        <v-row no-gutters style="padding: 10px 10px 10px 10px">

            <v-col :cols="6" style="padding-right: 10px">
                <v-form
                        ref="form"
                        lazy-validation
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
                                color="white"
                                :single-line="false"
                                item-text="name"
                                :label="$t('dataMapping.chooseMetatype')"
                                :placeholder="$t('dataMapping.typeToSearch')"
                                return-object
                        >
                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.metatypeSearchHelp')"></info-tooltip> </template>
                        </v-autocomplete>

                      <div v-if="selectedMetatype !== null">
                        <v-select
                            :items="topLevelPayloadKeys"
                            :rules="[v => !!v || 'Item is required']"
                            :label="$t('dataMapping.metatypeTypeKey')"
                            @input="selectTypeKey"
                            v-model="typeKey"
                            required
                        >
                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.typeKeyHelp')"></info-tooltip> </template>
                        </v-select>
                        <v-select
                            :items="topLevelPayloadKeys"
                            v-model="uniqueIdentifierKey"
                            :rules="[v => !!v || 'Item is required']"
                            :label="$t('dataMapping.metatypeUniqueIdentifierKey')"
                            @input="selectUniqueIdentifierKey"
                            required
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                        </v-select>

                        <br>
                        <h4>{{$t('dataMapping.metatypePropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                        <div v-for="key in selectedMetatypeKeys" :key="key.id">
                          <v-select
                              :items="payloadKeys"
                              :rules="[v => !!v || 'Item is required']"
                              :label="key.name"
                              @input="selectPropertyKey($event, key)"
                              required
                          >

                            <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                          </v-select>
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

                        <v-select
                            :items="topLevelPayloadKeys"
                            :rules="[v => !!v || 'Item is required']"
                            :label="$t('dataMapping.metatypeTypeKey')"
                            @input="selectTypeKey"
                            v-model="typeKey"
                            required
                        >
                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.typeKeyHelp')"></info-tooltip> </template>
                        </v-select>
                        <v-select
                            :items="topLevelPayloadKeys"
                            v-model="uniqueIdentifierKey"
                            :rules="[v => !!v || 'Item is required']"
                            :label="$t('dataMapping.metatypeUniqueIdentifierKey')"
                            @input="selectUniqueIdentifierKey"
                            required
                        >

                          <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                        </v-select>

                        <v-row>
                          <v-col>
                            <v-select
                                :items="topLevelPayloadKeys"
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
                                :items="topLevelPayloadKeys"
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
                          <v-select
                              :items="payloadKeys"
                              :rules="[v => !!v || 'Item is required']"
                              :label="key.name"
                              @input="selectRelationshipPropertyKey($event, key)"
                              required
                          >

                            <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                          </v-select>
                        </div>


                      </div>

                  <!-- MIX -->
                    <div v-if="payloadType === 'mix'">
                      <v-autocomplete
                          :items="metatypes"
                          v-model="selectedMetatype"
                          :search-input.sync="search"
                          color="white"
                          :single-line="false"
                          item-text="name"
                          :label="$t('dataMapping.chooseMetatype')"
                          :placeholder="$t('dataMapping.typeToSearch')"
                          return-object
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('dataMapping.metatypeSearchHelp')"></info-tooltip> </template>
                      </v-autocomplete>

                      <div v-if="selectedMetatype !== null">
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

                      <v-select
                          :items="topLevelPayloadKeys"
                          :rules="[v => !!v || 'Item is required']"
                          :label="$t('dataMapping.metatypeTypeKey')"
                          @input="selectTypeKey"
                          v-model="typeKey"
                          required
                      >
                        <template slot="append-outer"><info-tooltip :message="$t('dataMapping.typeKeyHelp')"></info-tooltip> </template>
                      </v-select>
                      <v-select
                          :items="topLevelPayloadKeys"
                          v-model="uniqueIdentifierKey"
                          :rules="[v => !!v || 'Item is required']"
                          :label="$t('dataMapping.metatypeUniqueIdentifierKey')"
                          @input="selectUniqueIdentifierKey"
                          required
                      >

                        <template slot="append-outer"><info-tooltip :message="$t('dataMapping.uniqueKeyHelp')"></info-tooltip> </template>
                      </v-select>

                        <v-row>
                          <v-col>
                            <v-select
                                :items="topLevelPayloadKeys"
                                v-model="origin_key"
                                :rules="[v => !!v || 'Item is required']"
                                :label="$t('dataMapping.originKey')"
                                required
                            >

                              <template slot="append-outer">OR</template>
                            </v-select>
                          </v-col>
                         <v-col>
                           <v-select
                               :items="topLevelPayloadKeys"
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
                      <h4>{{$t('dataMapping.metatypePropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                      <div v-for="key in selectedMetatypeKeys" :key="key.id">
                        <v-select
                            :items="payloadKeys"
                            :rules="[v => !!v || 'Item is required']"
                            :label="key.name"
                            @input="selectPropertyKey($event, key)"
                            required
                        >

                          <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                        </v-select>
                      </div>

                        <h4 v-if="selectedMetatypeRelationshipPairKeys.length > 0">{{$t('dataMapping.metatypeRelationshipPropertyMapping')}}<info-tooltip :message="$t('dataMapping.PropertyMappingHelp')"></info-tooltip> </h4>
                        <div v-for="key in selectedMetatypeRelationshipPairKeys" :key="key.id">
                          <v-select
                              :items="payloadKeys"
                              :rules="[v => !!v || 'Item is required']"
                              :label="key.name"
                              @input="selectRelationshipPropertyKey($event, key)"
                              required
                          >

                            <template v-if="key.description !== ''" slot="append-outer"><info-tooltip :message="key.description"></info-tooltip> </template>
                          </v-select>
                        </div>


                    </div>
                    </div>
                    <v-btn
                            @click="submitTypeMapping()"
                            color="success"
                            class="mr-4"
                    >
                      <v-progress-circular
                          indeterminate
                          v-if="loading"
                      ></v-progress-circular>
                      <span v-if="!loading">Save & Continue</span>
                    </v-btn>

                    <v-btn
                            @click="resetButton()"
                            color="error"
                            class="mr-4"
                            v-if="!loading"
                    >
                        Reset
                    </v-btn>

                </v-form>
            </v-col>

            <v-col :cols="6">
                <h4>{{$t('dataMapping.samplePayload')}}<info-tooltip :message="$t('dataMapping.samplePayloadHelp')"></info-tooltip> </h4>
                <v-textarea
                        filled
                        name="input-7-4"
                        :value="unmapped.data | pretty"
                        :rows="50"
                ></v-textarea>


            </v-col>
        </v-row>
    </v-card>
</template>

<script lang="ts">
    import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
    import {
      ImportDataT,
      MetatypeKeyT, MetatypeRelationshipKeyT,
      MetatypeRelationshipPairT,
      MetatypeT,
      TypeMappingPayloadT
    } from "../api/types";
    import InfoTooltip from "@/components/infoTooltip.vue";

    @Component({
        filters: {
            pretty: function(value: any) {
                return JSON.stringify(value, null, 2)
            }
        },
        components: {InfoTooltip}
    })
    export default class DataTypeMapping extends Vue {

        @Prop({required: true})
        readonly dataSourceID!: string;

        @Prop({required: true})
        readonly containerID!: string

        @Prop({required: false})
        readonly payload!: ImportDataT | null

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
           if(!newMetatype) return;
           this.reset()

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

        loading = false
        errorMessage = ""
        search =  ""
        metatypes: MetatypeT[] = []

        relationshipPairSearch = ""
        relationshipPairs: MetatypeRelationshipPairT[] = []
        selectedRelationshipPair: MetatypeRelationshipPairT | null = null
        selectedMetatypeRelationshipPairKeys: MetatypeRelationshipKeyT[] = []

        payloadType = null
        typeKey: any = null
        typeKeyValue = ""
        uniqueIdentifierKeyValue = ""
        uniqueIdentifierKey: any = null
        origin_key: any = null
        destination_key: any = null
        propertyMapping: {[key: string]: any}[] = []

        topLevelPayloadKeys: any = null
        payloadKeys: any = null

        unmapped: {[key: string]: any} = {}
        unmappedData: {[key: string]: any} = {}

        selectedMetatype: MetatypeT | null = null
        selectedMetatypeKeys: MetatypeKeyT[] = []

        reset() {
          this.typeKey = null
          this.typeKeyValue = ""
          this.uniqueIdentifierKeyValue = ""
          this.uniqueIdentifierKey= null
          this.propertyMapping = []
          this.origin_key = null
          this.destination_key = null

          this.topLevelPayloadKeys = null
          this.payloadKeys = null
          this.getUnmapped()
        }

        resetButton() {
          this.selectedMetatype = null
          this.selectedMetatypeKeys = []
          this.selectedRelationshipPair = null
          this.selectedMetatypeRelationshipPairKeys = []

          this.payloadType = null

          this.reset()
        }

        payloadTypes() {
            return [{
                name: this.$t("dataMapping.metatype"),
                value: 'metatype'
            },{
                name: this.$t("dataMapping.metatypeRelationship"),
                value: 'metatype-relationship'
            },{
                name: this.$t("dataMapping.mix"),
                value: 'mix'
            }]
        }


        mounted() {
          if(!this.payload) {
              this.getUnmapped()
              return;
          }

          this.unmapped = this.payload
          this.unmappedData = this.payload.data
          this.payloadKeys = []

          this.payloadKeys = Object.keys(this.flatten(this.unmapped.data))
          this.topLevelPayloadKeys = Object.keys(this.unmapped.data)
        }

        getUnmapped() {
            if(this.dataSourceID) {
                this.$client.getUnmappedData(this.containerID, this.dataSourceID)
                    .then((unmapped) => {
                        this.unmapped = unmapped[0]
                        this.unmappedData = unmapped[0].data

                        this.payloadKeys = []

                        this.payloadKeys = Object.keys(this.flatten(this.unmapped.data))
                        this.topLevelPayloadKeys = Object.keys(this.unmapped.data)
                    })
                    .catch(e => this.errorMessage = e)
            }

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

        selectTypeKey(key: string) {
          this.typeKeyValue = this.unmappedData[key]
        }

        selectUniqueIdentifierKey(key: string) {
          this.uniqueIdentifierKeyValue = this.unmappedData[key]
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

        submitTypeMapping() {
          this.loading = true

          const payload: TypeMappingPayloadT = {
            type_key: this.typeKey,
            type_value: this.typeKeyValue,
            unique_identifier_key: this.uniqueIdentifierKey,
            keys: this.propertyMapping,
            ignored_keys: [],
            example_payload: this.unmappedData
          }

          if(this.selectedMetatype) payload.metatype_id = this.selectedMetatype.id!
          if(this.selectedRelationshipPair) payload.metatype_relationship_pair_id = this.selectedRelationshipPair.id
          if(this.destination_key)  payload.destination_key = this.destination_key
          if(this.origin_key) payload.origin_key = this.origin_key

              this.$client.createTypeMapping(this.containerID, this.dataSourceID, payload)
              .then(mapping => {
                setTimeout(() => {
                  this.loading = false
                  this.resetButton()
                  this.$emit("mappingCreated", mapping)
                }, 5000)
              })
              .catch(e => this.errorMessage = e)
        }


    }
</script>
