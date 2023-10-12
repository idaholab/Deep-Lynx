<template>
  <v-dialog
    v-model="dialog"
    @click:outside="reset"
    width="90%"
    scrollable
  >
    <template v-slot:activator="{ on }">
      <v-icon v-if="icon"
        small
        class="mr-2"
        v-on="on"
        @click="editReset()"
      >mdi-eye</v-icon>
      <v-btn v-if="!transformation && !icon" color="primary" dark class="mt-2" v-on="on">
        {{ $t("transformations.createNew") }}
      </v-btn>
    </template>

    <v-card style="max-height: 90vh;">
      <v-card-title class="grey lighten-2">
        <h3 v-if="!transformation" class="headline text-h3">
          {{ $t("transformations.createNew") }}
        </h3>
        <h3 v-if="transformation && !transformation.archived" class="headline text-h3">
          {{ $t("transformations.edit") }}
        </h3>
        <h3 v-if="transformation && transformation.archived" class="headline text-h3">
          {{ $t("transofrmations.viewArchived") }}
        </h3>
      </v-card-title>

      <v-card-text class="d-flex flex-column pb-0" style="overflow-y: hidden;">
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row class="d-flex flex-grow-0">
          <v-col :cols="12" style="position: sticky; top: 0px; z-index: 99; background: white">
            <div>
              <div class="d-flex">
                <h4 class="headline text-h4 d-inline-block">{{ $t('transformations.currentDataSet') }}</h4>
                <info-tooltip class="d-inline-block ml-2" :message="$t('help.samplePayload')"/>
              </div>

              <v-card style="overflow-y: scroll; max-height: 20vh;" id="dataCol">
                <json-viewer
                  :value="payload"
                  copyable
                  :maxDepth=4
                />
              </v-card>
            </div>
            <v-divider class="mt-5 mx-n6" style="max-width: unset"></v-divider>
          </v-col>
        </v-row>

        <v-row class="mb-1 d-flex flex-grow-0">
          <v-col class="pt-0 pb-0" style="position: sticky; top: 0px; z-index: 99; background: white">
            <h4 class="headline text-h4" v-if="transformation">
              {{ $t('transformations.transformation') }}: {{ transformation.id }}</h4>
            <h4 class="headline text-h4" v-else>{{ $t('transformations.newOptions') }}</h4>
          </v-col>
        </v-row>

        <div class="content-div mx-n4 px-4 d-flex flex-grow-0 flex-column" style="overflow-y: scroll;">
          <v-row>
            <v-col :cols="12" class="pt-0">
              <div id="mappingCol">
                <v-row v-if="payloadArrayKeys.length > 0">
                  <v-col cols="12" lg="6">
                    <v-text-field v-model="name" :rules="[validName(name)]">
                      <template v-slot:label>{{ $t('general.name') }}
                        <small>{{ $t('general.optional') }}</small>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>
              </div>
            </v-col>
          </v-row>

          <v-expansion-panels class="mb-6" v-model="openPanels" multiple>
            <v-expansion-panel>
              <v-expansion-panel-header>
                <h4 class="text-h4">{{ $t("typeMappings.mapping") }}
                  <info-tooltip :message="$t('help.mapping')"/>
                </h4>
              </v-expansion-panel-header>
              <v-expansion-panel-content eager style="max-height: 100% !important;">
                <v-form ref="mainForm" v-model="mainFormValid">
                  <v-row>
                    <v-col cols="12" md="6" lg="4">
                      <v-select
                        :items="payloadArrayKeys"
                        v-model="rootArray"
                        clearable
                      >
                        <template v-slot:label>{{ $t('transformations.rootArray') }}
                          <small>{{ $t('general.optional') }}</small>
                        </template>
                        <template slot="append-outer">
                          <info-tooltip :message="$t('help.rootArray')"/>
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="12" md="6" lg="4">
                      <v-select
                        :items="payloadTypes"
                        v-model="payloadType"
                        item-text="name"
                        :rules="[validateRequired]"
                        :label="$t('transformations.resulting')"
                        required
                      ></v-select>
                    </v-col>

                    <template v-if="payloadType === 'node'">
                      <v-col cols="12" md="6" lg="4">
                        <v-autocomplete
                          :items="metatypes"
                          v-model="selectedMetatype"
                          :search-input.sync="search"
                          :single-line="false"
                          item-text="name"
                          :label="$t('classes.select')"
                          :placeholder="$t('classes.search')"
                          :rules="[validateRequired]"
                          required
                          return-object
                          clearable
                        >
                          <template slot="append-outer">
                            <info-tooltip :message="$t('help.classSearch')"/>
                          </template>
                        </v-autocomplete>
                      </v-col>

                      <template v-if="selectedMetatype !== null">
                        <v-col cols="12" md="6" lg="4">
                          <v-combobox
                              v-if="!rootArray"
                              :items="payloadKeys"
                              v-model="uniqueIdentifierKey"
                              clearable
                          >

                            <template v-slot:label>{{ $t('transformations.uniqueID') }}</template>
                            <template slot="append-outer">
                              <info-tooltip :message="$t('help.uniqueID')"/>
                            </template>
                          </v-combobox>
                          <v-combobox
                              v-if="rootArray"
                              :items="payloadKeys"
                              v-model="uniqueIdentifierKey"
                              :rules="[validateIDRequired]"
                              clearable
                          >
                            <template v-slot:label>{{ $t('transformations.uniqueID') }}</template>
                            <template slot="append-outer">
                              <info-tooltip :message="$t('help.uniqueID')"/>
                            </template>
                          </v-combobox>
                        </v-col>

                        <!-- created at -->
                        <v-col cols="12" md="6" lg="4">
                          <v-autocomplete
                              :items="payloadKeys"
                              v-model="createdAt"
                              item-text="name"
                              clearable
                          >
                            <template v-slot:label>{{ $t('general.createdAt') }}
                              <small>{{ $t('general.optional') }}</small></template>
                            <template slot="append-outer">
                              <info-tooltip :message="$t('help.createdAtMapping')"/>
                            </template>
                          </v-autocomplete>
                        </v-col>

                        <v-col cols="12" md="6" lg="4" v-if="createdAt">
                          <v-text-field
                              :label="$t('general.createdAtFormatString')"
                              v-model="createdAtFormatString"
                              :rules="[validatePostgresDate]"
                          >
                            <template slot="append-outer">
                              <a :href=dateString target="_blank">
                                {{$t('help.dateFormatStringSmall')}}
                              </a>
                            </template>
                          </v-text-field>
                        </v-col>

                        <!-- tags -->
                        <v-col cols="12" md="6" lg="4">
                          <v-autocomplete
                              :items="tags"
                              v-model="selectedTags"
                              item-text="tag_name"
                              clearable
                              return-object
                              multiple
                          >
                            <template v-slot:label>{{ $t('tags.tags') }}
                              <small>{{ $t('general.optional') }}</small></template>
                            <template slot="append-outer">
                              <info-tooltip :message="$t('help.tagMapping')"/>
                            </template>
                          </v-autocomplete>
                        </v-col>

                        <!-- merge flag -->
                        <v-col cols="12" md="6" lg="4">
                          <v-checkbox
                              v-model="merge"
                          >
                            <template v-slot:label>{{$t('transformations.merge')}}</template>
                            <template slot="prepend">
                              <info-tooltip :message="$t('help.mergeHelp')"/>
                            </template>
                          </v-checkbox>
                        </v-col>

                        <v-col cols="12" md="6" lg="4" v-if="keysLoading">
                          <v-progress-linear
                              indeterminate
                              color="warning"
                          ></v-progress-linear>
                        </v-col>
                      </template>
                    </template>

                    <template v-if="payloadType === 'edge'">
                      <v-col cols="12" md="6" lg="4">
                        <v-autocomplete
                          :items="relationshipPairs"
                          v-model="selectedRelationshipPair"
                          :search-input.sync="relationshipPairSearch"
                          :single-line="false"
                          item-text="name"
                          clearable
                          :label="$t('relationships.choose')"
                          :placeholder="$t('relationships.search')"
                          return-object
                        >
                          <template slot="append-outer">
                            <info-tooltip :message="$t('help.relationshipSearch')"/>
                          </template>
                        </v-autocomplete>
                      </v-col>

                      <template v-if="selectedRelationshipPair">
                        <v-col cols="12" md="6" lg="4">
                          <v-autocomplete
                            :items="payloadKeys"
                            v-model="createdAt"
                            item-text="name"
                            :label="$t('general.createdAt')"
                            clearable
                          >
                            <template slot="append-outer">
                              <info-tooltip :message="$t('help.createdAtMapping')"/>
                            </template>
                          </v-autocomplete>
                        </v-col>

                        <v-col cols="12" md="6" lg="4" v-if="createdAt">
                          <v-text-field
                            :label="$t('general.createdAtFormatString')"
                            v-model="createdAtFormatString"
                            :rules="[validatePostgresDate]"
                          >
                            <template slot="append-outer">
                              <a :href=dateString target="_blank">
                                {{$t('help.dateFormatStringSmall')}}
                              </a>
                            </template>
                          </v-text-field>
                        </v-col>

                        <v-col cols="12" md="6" lg="4">
                          <v-autocomplete
                            :items="tags"
                            v-model="selectedTags"
                            item-text="tag_name"
                            clearable
                            return-object
                            multiple
                          >
                            <template v-slot:label>{{ $t('tags.tags') }}
                              <small>{{ $t('general.optional') }}</small>
                            </template>
                            <template slot="append-outer">
                              <info-tooltip :message="$t('help.tagMapping')"/>
                            </template>
                          </v-autocomplete>
                        </v-col>

                        <template v-if="hasOldEdgeParams">
                          <v-col :cols="12">
                            <h5 class="text-h5">{{ $t('transformations.parentInfo') }} -
                              <small>{{ $t('typeMappings.deprecatedParams') }}</small>
                            </h5>

                            <v-row>
                              <v-col cols="12" md="6" lg="4">
                                <v-select
                                  :items="payloadKeys"
                                  v-model="origin_key"
                                  :rules="[validateRequired]"
                                  required
                                >
                                  <template v-slot:label>{{ $t('transformations.parentID') }}
                                    <small style="color:red">{{ $t('validation.required') }}</small>
                                  </template>
                                </v-select>
                              </v-col>

                              <v-col cols="12" md="6" lg="4">
                                <SelectDataSource
                                    @selected="setParentDataSource"
                                    :tooltipHelp="$t('help.dataSourceEdgeParam')"
                                    :dataSourceID="originDataSourceID"
                                    :containerID="containerID">
                                </SelectDataSource>
                              </v-col>

                              <v-col cols="12" md="6" lg="4">
                                <SearchMetatypes
                                    @selected="setParentMetatype"
                                    :tooltipHelp="$t('help.classEdgeParam')"
                                    :metatypeID="originMetatypeID"
                                    :containerID="containerID">
                                </SearchMetatypes>
                              </v-col>
                            </v-row>

                            <v-row>
                              <v-col cols="12">
                                <h5 class="text-h5">{{ $t('transformations.childInfo') }} -
                                  <small>{{ $t('typeMappings.deprecatedParams') }}</small>
                                </h5>

                                <v-row>
                                  <v-col cols="12" md="6" lg="4">
                                    <v-select
                                      :items="payloadKeys"
                                      v-model="destination_key"
                                      :rules="[validateRequired]"
                                      required
                                    >
                                      <template v-slot:label>{{ $t('transformations.childID') }}
                                        <small style="color:red">{{ $t('validation.required') }}</small>
                                      </template>
                                      <template slot="append-outer">
                                        <info-tooltip :message="$t('help.parentChildKeys')"/>
                                      </template>
                                    </v-select>
                                  </v-col>

                                  <v-col cols="12" md="6" lg="4">
                                    <SelectDataSource
                                      :tooltip="true"
                                      @selected="setChildDataSource"
                                      :tooltipHelp="$t('help.dataSourceEdgeParam')"
                                      :dataSourceID="destinationDataSourceID"
                                      :containerID="containerID">
                                    </SelectDataSource>
                                  </v-col>

                                  <v-col cols="12" md="6" lg="4">
                                    <SearchMetatypes
                                      :tooltip="true"
                                      @selected="setChildMetatype"
                                      :tooltipHelp="$t('help.classEdgeParam')"
                                      :metatypeID="destinationMetatypeID"
                                      :containerID="containerID">
                                    </SearchMetatypes>
                                  </v-col>
                                </v-row>
                              </v-col>
                            </v-row>
                            <v-btn @click="convertToParameters">{{ $t('transformations.convertParams') }}</v-btn>
                          </v-col>
                        </template>

                        <template v-else>
                          <v-col cols="12">
                            <v-card>
                              <v-card-title>
                                {{ $t('transformations.parentParams') }}
                              </v-card-title>

                              <v-card-text>
                                <v-data-table
                                  :headers="edgeConfigHeader"
                                  :items="originConfigKeys"
                                  :items-per-page="-1"
                                  mobile-breakpoint="960"
                                  item-key="id"
                                  flat
                                  tile
                                  disable-pagination
                                  disable-sort
                                  hide-default-footer
                                >
                                  <template v-slot:[`item.type`]="{ item }">
                                    <v-select v-if="item.type === 'metatype_id' || item.type === 'metatype_uuid'"
                                      :label="$t('query.filterType')"
                                      :items=limitedConfigFilterTypes
                                      v-model="item.type"
                                      disabled
                                      :rules="[validateRequired]"
                                    />

                                    <v-select v-else
                                      :label="$t('query.filterType')"
                                      :items=configFilterTypes
                                      v-model="item.type"
                                      :rules="[validateRequired]"
                                    />

                                    <template v-if="item.type === 'property'">
                                      <MetatypeKeysSelect
                                        :containerID="containerID"
                                        :metatypeID="selectedRelationshipPair.origin_metatype_id"
                                        :multiple="false"
                                        :propertyName="item.property"
                                        @selected="setFilterPropertyKey(item, $event)"
                                      >
                                      </MetatypeKeysSelect>
                                    </template>
                                  </template>

                                  <template v-slot:[`item.operator`]="{ item }">
                                    <v-select
                                      :label="$t('operators.operator')"
                                      :items=paramOperators
                                      v-model="item.operator"
                                      :disabled="item.type === 'metatype_id' || item.type ==='metatype_uuid'"
                                      :rules="[validateRequired]"
                                    />
                                  </template>

                                  <template v-slot:[`item.value`]="{ item }">
                                    <v-row>
                                      <v-col :cols="12" v-if="item.type === 'metatype_id'">
                                        <SearchMetatypes
                                          :label="$t('transformations.typeSelectKey')"
                                          @selected="setFilterMetatypeID(item, $event)"
                                          :metatypeID="item.value"
                                          disabled
                                          :containerID="containerID"
                                          v-model="item.value"
                                        />
                                      </v-col>

                                      <v-col :cols="12" v-else-if="item.type === 'data_source'">
                                        <SelectDataSource
                                          @selected="setFilterMetatypeID(item, $event)"
                                          :dataSourceID="item.value"
                                          :containerID="containerID"
                                        />
                                      </v-col>

                                      <template v-else>
                                        <v-col :cols="12" lg="7">
                                          <v-select
                                            :label="$t('transformations.typeSelectKey')"
                                            :items="payloadKeys"
                                            v-model="item.key"
                                            clearable
                                            :disabled="item.value !== null"
                                          >
                                            <template v-slot:append-outer>{{ $t('general.or') }}</template>
                                            <template v-slot:label>{{ $t('transformations.typeSelectKey') }}</template>
                                          </v-select>
                                        </v-col>

                                        <v-col :cols="12" lg="4">
                                          <v-text-field
                                            :label="$t('general.constant')"
                                            clearable
                                            v-model="item.value"
                                            :disabled="item.key !== null"
                                          />
                                        </v-col>
                                      </template>
                                    </v-row>
                                  </template>

                                  <template v-slot:[`item.actions`]="{ item, index }">
                                    <template v-if="index !== 0 && (item.type !== 'metatype_id' ||  item.type !== 'metatype_uuid')">
                                      <v-icon @click="removeEdgeConfig(item.id, 'origin')">mdi-close</v-icon>
                                    </template>
                                  </template>
                                </v-data-table>

                                <v-row>
                                  <v-col :cols="12" style="padding:25px" align="center" justify="center">
                                    <v-btn @click="addEdgeConfig('origin')">
                                      {{ $t('general.addColumn') }}
                                    </v-btn>
                                  </v-col>
                                </v-row>
                              </v-card-text>
                            </v-card>
                          </v-col>

                          <v-col cols="12">
                            <v-card>
                              <v-card-title>
                                {{ $t('transformations.childParams') }}
                              </v-card-title>

                              <v-card-text>
                                <v-data-table
                                  :headers="edgeConfigHeader"
                                  :items="destinationConfigKeys"
                                  :items-per-page="-1"
                                  mobile-breakpoint="960"
                                  item-key="id"
                                  flat
                                  tile
                                  disable-pagination
                                  disable-sort
                                  hide-default-footer
                                >
                                  <template v-slot:[`item.type`]="{ item }">
                                    <v-select v-if="item.type === 'metatype_id' || item.type === 'metatype_uuid'"
                                      :label="$t('query.filterType')"
                                      :items=limitedConfigFilterTypes
                                      v-model="item.type"
                                      disabled
                                      :rules="[validateRequired]"
                                    />

                                    <v-select v-else
                                      :label="$t('query.filterType')"
                                      :items=configFilterTypes
                                      v-model="item.type"
                                      :rules="[validateRequired]"
                                    />

                                    <template v-if="item.type === 'property'">
                                      <MetatypeKeysSelect
                                        :containerID="containerID"
                                        :metatypeID="selectedRelationshipPair.destination_metatype_id"
                                        :multiple="false"
                                        :propertyName="item.property"
                                        @selected="setFilterPropertyKey(item, $event)"
                                      />
                                    </template>
                                  </template>

                                  <template v-slot:[`item.operator`]="{ item }">
                                    <v-select
                                      :label="$t('operators.operator')"
                                      :items=paramOperators
                                      v-model="item.operator"
                                      :disabled="item.type === 'metatype_id' || item.type ==='metatype_uuid'"
                                      :rules="[validateRequired]"
                                    />
                                  </template>

                                  <template v-slot:[`item.value`]="{ item }">
                                    <v-row>
                                      <v-col :cols="12" v-if="item.type === 'metatype_id'">
                                        <SearchMetatypes
                                          :label="$t('transformations.typeSelectKey')"
                                          @selected="setFilterMetatypeID(item, $event)"
                                          :metatypeID="item.value"
                                          disabled
                                          :containerID="containerID"
                                          v-model="item.value"
                                        />
                                      </v-col>

                                      <v-col :cols="12" v-else-if="item.type === 'data_source'">
                                        <SelectDataSource
                                          @selected="setFilterMetatypeID(item, $event)"
                                          :dataSourceID="item.value"
                                          :containerID="containerID"
                                        />
                                      </v-col>

                                      <template v-else>
                                        <v-col :cols="12" lg="7">
                                          <v-select
                                            :label="$t('transformations.typeSelectKey')"
                                            :items="payloadKeys"
                                            v-model="item.key"
                                            clearable
                                            :disabled="item.value !== null"
                                          >
                                            <template v-slot:append-outer>{{ $t('general.or') }}</template>
                                            <template v-slot:label>{{ $t('transformations.typeSelectKey') }}</template>
                                          </v-select>
                                        </v-col>
                                        <v-col :cols="12" lg="4">
                                          <v-text-field
                                            :label="$t('general.constant')"
                                            clearable
                                            v-model="item.value"
                                            :disabled="item.key !== null"
                                          />
                                        </v-col>
                                      </template>
                                    </v-row>
                                  </template>

                                  <template v-slot:[`item.actions`]="{ item, index }">
                                    <template v-if="index !== 0 && (item.type !== 'metatype_id' ||  item.type !== 'metatype_uuid')">
                                      <v-icon @click="removeEdgeConfig(item.id, 'destination')">mdi-close</v-icon>
                                    </template>
                                  </template>
                                </v-data-table>

                                <v-row>
                                  <v-col :cols="12" style="padding:25px" align="center" justify="center">
                                    <v-btn @click="addEdgeConfig('destination')">
                                      {{ $t('general.addColumn') }}
                                    </v-btn>
                                  </v-col>
                                </v-row>
                              </v-card-text>
                            </v-card>
                          </v-col>
                        </template>
                      </template>
                    </template>
                  </v-row>
                </v-form>
              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel v-if="selectedMetatypeKeys.length > 0 || selectedMetatypeRelationshipPairKeys.length > 0">
              <v-expansion-panel-header>
                <template v-if="payloadType === 'node'">
                  <h4 class="text-h4">{{ $t('properties.mapping') }}
                    <small class="mx-2">
                      <span v-if="!rootArray">
                        {{ propertyMapping.filter(k => (k.metatype_key_id || k.metatype_relationship_key_id)).length }} / {{ payloadKeys.length }} {{$t('properties.selected')}}
                      </span>
                      <span v-if="rootArray">
                        {{ propertyMapping.filter(k => (k.metatype_key_id || k.metatype_relationship_key_id)).length }} / {{ payloadKeys.length }} {{$t('properties.selected')}} ({{ payloadSelectedArrayKeys.length }} {{$t('transformations.arrayAvailable')}})
                      </span>
                    </small>
                    <info-tooltip :message="$t('help.propertyMapping')"/>
                  </h4>
                  <v-spacer></v-spacer>
                  <v-btn
                    @click.native.stop="autoPopulateMetatypeKeys()"
                    class="ml-auto mr-4"
                    style="flex: 0 1 auto;"
                  >
                    {{ $t("transformations.autopopulate") }}
                  </v-btn>
                </template>

                <template v-if="payloadType === 'edge'">
                  <h4 class="text-h4">{{ $t('properties.mapping') }}
                    <info-tooltip :message="$t('help.propertyMapping')"/>
                  </h4>

                  <v-btn
                    @click.native.stop="autoPopulateRelationshipKeys()"
                    class="mr-4"
                    style="flex: 0 1 auto;"
                  >
                    {{ $t("transformations.autopopulate") }}
                  </v-btn>
                </template>
              </v-expansion-panel-header>
              <v-expansion-panel-content>
                <error-banner :message="validationErrorMessage" @closeAlert="validationErrorMessage = ''"></error-banner>

                <template v-if="payloadType === 'node'">
                  <v-simple-table>
                    <template v-slot:default>
                      <thead>
                        <tr>
                          <th class="text-left">{{$t('general.name')}}</th>
                          <th class="text-left">{{$t('general.type')}}</th>
                          <th class="text-left">{{$t('general.keys')}}</th>
                          <th class="text-left" width="30%">{{$t('general.dateFormat')}}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="key in selectedMetatypeKeys" :key="key.id">
                          <td>{{ key.name }}</td>
                          <td>{{ key.data_type }}</td>
                          <td>
                            <v-row>
                              <v-col cols="12" lg="6">
                                <v-combobox
                                  :items="payloadKeys"
                                  :label="$t('transformations.mapPayloadKey')"
                                  @input="selectPropertyKey($event, key)"
                                  clearable
                                  eager
                                  :disabled="isValueMapped(key)"
                                  :value="propertyKey(key)"
                              >
                                <template v-slot:append-outer>{{ $t("general.or") }}</template>
                                <template v-slot:label>{{ $t('transformations.typeSelectKey') }}
                                  <small style="color:red" v-if="key.required">{{ $t('validation.required') }}</small>
                                </template>
                                <template v-slot:item="data">
                                  <!-- Display alternate formatting and key use count if key has been selected -->
                                  <span v-if="propertyMapping.find(prop => prop.key === data.item)">
                                      <v-alert dense text type="success">
                                        {{data.item}} ({{(propertyMapping.reduce((n, prop) => n + (prop.key === data.item ? 1 : 0), 0))}})
                                      </v-alert>
                                    </span>
                                  <!-- Otherwise simply display the key name -->
                                  <span v-else>{{ data.item }}</span>
                                </template>
                                </v-combobox>
                              </v-col>

                              <v-col cols="12" lg="6">
                                <v-text-field v-if="key.data_type !== 'boolean'"
                                  :label="$t('general.constant')"
                                  @input="selectPropertyKey($event, key, true)"
                                  :disabled="isKeyMapped(key)"
                                  :value="propertyKeyValue(key)"
                                />
                                <v-select v-if="key.data_type == 'boolean'"
                                  :label="$t('general.constant')"
                                  :items="['true', 'false']"
                                  @input="selectPropertyKey($event, key, true)"
                                  :disabled="isKeyMapped(key)"
                                  :value="propertyKeyValue(key)"
                                />
                              </v-col>
                            </v-row>
                          </td>
                          <td>
                            <v-text-field v-if="key.data_type === 'date'"
                              :label="$t('general.dateFormatString')"
                              @input="setDateConversionFormatStringRecord($event, key)"
                              :value="propertyKeyFormatString(key)"
                            >
                              <template slot="append-outer">
                                <a :href="dateString" target="_blank">
                                  {{ $t('help.dateFormatString') }}
                                </a>
                              </template>
                            </v-text-field>
                          </td>
                        </tr>
                      </tbody>
                    </template>
                  </v-simple-table>
                </template>

                <template v-if="payloadType === 'edge'">
                  <v-simple-table>
                    <template v-slot:default>
                      <thead>
                        <tr>
                          <th class="text-left">{{$t('general.name')}}</th>
                          <th class="text-left">{{$t('general.type')}}</th>
                          <th class="text-left">{{$t('general.keys')}}</th>
                          <th class="text-left" width="30%">{{$t('general.dateFormat')}}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="key in selectedMetatypeRelationshipPairKeys" :key="key.id">
                          <td>{{ key.name }}</td>
                          <td>{{ key.data_type }}</td>
                          <td>
                            <v-row>
                              <v-col cols="12" lg="6">
                                <v-combobox
                                  :items="payloadKeys"
                                  @input="selectRelationshipPropertyKey($event, key)"
                                  :disabled="isRelationshipValueMapped(key)"
                                  :value="relationshipPropertyKey(key)"
                                >
                                  <template v-slot:append-outer>{{ $t('general.or') }}</template>
                                  <template v-slot:label>{{ $t("transformations.typeSelectKey") }}
                                    <small style="color:red" v-if="key.required">
                                      {{ $t('validation.required') }}
                                    </small>
                                  </template>
                                </v-combobox>
                              </v-col>

                              <v-col cols="12" lg="6">
                                <v-text-field v-if="key.data_type !== 'boolean'"
                                  :label="$t('general.constant')"
                                  @input="selectRelationshipPropertyKey($event, key, true)"
                                  :disabled="isRelationshipKeyMapped(key)"
                                  :value="relationshipPropertyKeyValue(key)"
                                  clearable
                                />

                                <v-select v-if="key.data_type == 'boolean'"
                                  :label="$t('general.constant')"
                                  :items="['true', 'false']"
                                  clearable
                                  @input="selectRelationshipPropertyKey($event, key, true)"
                                  :disabled="isRelationshipKeyMapped(key)"
                                  :value="relationshipPropertyKeyValue(key)"
                                />
                              </v-col>
                            </v-row>
                          </td>
                          <td>
                            <v-text-field v-if="key.data_type === 'date'"
                              :label="$t('general.dateFormatString')"
                              @input="setDateConversionFormatStringRelationship($event, key)"
                            >
                              <template slot="append-outer">
                                <a :href="dateString" target="_blank">{{ $t('help.dateFormatString') }}</a>
                              </template>
                            </v-text-field>
                          </td>
                        </tr>
                      </tbody>
                    </template>
                  </v-simple-table>
                </template>
              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>
                <h4 class="text-h4">{{$t('transformations.metadata')}}
                  <small class="mx-2">
                    <span v-if="!rootArray">
                      {{ metadataKeys.length }} / {{ payloadKeys.length }} {{$t('properties.selected')}}
                    </span>
                    <span v-if="rootArray">
                      {{ metadataKeys.length }} / {{ payloadKeys.length }} {{$t('properties.selected')}} ({{ payloadSelectedArrayKeys.length }} {{$t('transformations.arrayAvailable')}})
                    </span>
                  </small>
                </h4>
                <v-spacer></v-spacer>
              </v-expansion-panel-header>
              <v-expansion-panel-content>
                <p>{{ $t('help.metadataMapping') }}</p>
                <v-combobox
                  :items="payloadKeys"
                  multiple
                  :label="$t('transformations.metadataHint')"
                  v-model="metadataKeys"
                />
              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>
                <h4 v-if="transformation && transformation.conditions && transformation.conditions.length > 0" class="text-h4">
                  {{ transformation.conditions.length }} {{ $t("transformations.conditions") }}
                  <small>{{ $t("general.optional") }}</small>
                  <info-tooltip :message="$t('help.conditions')"/>
                </h4>
                <h4 v-else class="text-h4">
                  0 {{ $t("transformations.conditions") }}
                  <small>{{ $t("general.optional") }}</small>
                  <info-tooltip :message="$t('help.conditions')"/>
                </h4>
              </v-expansion-panel-header>

              <v-expansion-panel-content eager>
                <v-data-table
                  :expanded.sync="expanded"
                  :headers="conditionsHeader"
                  :items="conditions"
                  item-key="key"
                  show-expand
                  :hide-default-footer="true"
                >
                  <template v-slot:item.actions="{item}">
                    <v-icon small @click="deleteCondition(item)">mdi-delete</v-icon>
                  </template>

                  <template v-slot:expanded-item="{headers, item}">
                    <td :colspan="headers.length" class="pt-3 px-5 pb-5 grey lighten-4">
                      <h5 class="text-h5 mb-1">{{ $t("transformations.subexpressions") }}
                        <small>{{ $t("general.optional") }}</small>
                        <info-tooltip :message="$t('help.subexpressions')"/>
                      </h5>

                      <v-data-table
                        :headers="subexpressionHeader"
                        :items="item.subexpressions"
                        :hide-default-footer="true"
                      >
                        <template v-slot:item.actions="{item: subexpression}">
                          <v-icon small @click="deleteSubexpression(item, subexpression)">
                            mdi-delete
                          </v-icon>
                        </template>
                      </v-data-table>
                      <v-form ref="subexpressionForm" v-model="subexpressionFormValid">
                        <v-row class="mt-4">
                          <v-col cols="12" lg="3">
                            <v-select
                              :items="expressions"
                              :rules="[validateSelectOne]"
                              v-model="subexpressionExpression"
                              :label="$t('transformations.expression')"
                              required
                            >
                              <template slot="append-outer">
                                <info-tooltip :message="$t('help.conditions')"/>
                              </template>
                            </v-select>
                          </v-col>

                          <v-col cols="12" lg="3">
                            <v-select
                              :items="payloadKeys"
                              :rules="[validateSelectOne]"
                              v-model="subexpressionKey"
                              :label="$t('general.key')"
                              required
                            >
                              <template slot="append-outer">
                                <info-tooltip :message="$t('help.mapKey')"/>
                              </template>
                            </v-select>
                          </v-col>

                          <v-col cols="12" lg="3">
                            <v-select
                              :items="operators"
                              :rules="[validateSelectOne]"
                              v-model="subexpressionOperator"
                              :return-object="true"
                              :label="$t('operators.operator')"
                              required
                            >
                              <template slot="append-outer">
                                <info-tooltip :message="$t('help.operator')"/>
                              </template>
                            </v-select>
                          </v-col>

                          <v-col cols="12" lg="3">
                            <v-text-field
                              v-model="subexpressionValue"
                              :disabled="subexpressionOperator && !subexpressionOperator.requiresValue"
                              :label="$t('general.value')"
                            />
                          </v-col>
                        </v-row>

                        <v-row class="mt-0">
                          <v-col class="d-flex">
                            <v-spacer></v-spacer>
                            <v-btn color="primary" :disabled="!subexpressionFormValid" @click="addSubexpression(item)">
                              {{$t('general.add')}}
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-form>
                    </td>
                  </template>
                </v-data-table>

                <v-form ref="conditionForm" v-model="conditionFormValid">
                  <v-row class="mt-4">
                    <v-col cols="12" md="6" lg="4">
                      <v-select
                        :items="payloadKeys"
                        v-model="conditionKey"
                        :rules="[validateSelectOne]"
                        :label="$t('general.key')"
                        required
                      >
                        <template slot="append-outer">
                          <info-tooltip :message="$t('help.mapKey')"/>
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="12" md="6" lg="4">
                      <v-select
                        :items="operators"
                        v-model="conditionOperator"
                        :return-object="true"
                        :rules="[validateSelectOne]"
                        :label="$t('operators.operator')"
                        required
                      >
                        <template slot="append-outer">
                          <info-tooltip :message="$t('help.operator')"/>
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="12" md="6" lg="4">
                      <v-text-field
                        v-model="conditionValue"
                        :disabled="conditionOperator && !conditionOperator.requiresValue"
                        :label="$t('general.value')"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-0">
                    <v-col class="d-flex">
                      <v-spacer></v-spacer>
                      <v-btn color="primary" :disabled="!conditionFormValid" @click="addCondition">
                        {{ $t("transformations.saveCondition") }}
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-form>
              </v-expansion-panel-content>
            </v-expansion-panel>

            <v-expansion-panel>
              <v-expansion-panel-header>
                <h4 class="text-h4" style="">{{ $t("general.config") }}
                  <small>{{ $t('general.optional') }}</small>
                  <info-tooltip :message="$t('help.transformationConfig')"/>
                </h4>
              </v-expansion-panel-header>

              <v-expansion-panel-content>
                <v-row>
                  <v-col cols="12" md="6" lg="4">
                    <v-form>
                      <v-select :items="actionErrors" v-model="onConversionError">
                        <template v-slot:label>{{ $t('errors.onConversion') }}</template>
                      </v-select>
                    </v-form>
                  </v-col>

                  <v-col cols="12" md="6" lg="4">
                    <v-form>
                      <v-select :items="actionErrors" v-model="onKeyExtractionError">
                        <template v-slot:label>{{ $t('errors.onExtraction') }}</template>
                      </v-select>
                    </v-form>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>

      <v-card-actions class="pl-6 grey lighten-4">
        <p class="ma-0"><span style="color:red">*</span> = {{ $t('validation.required') }}</p>
        <v-spacer/>
        <div>
          <v-btn v-if="!transformation" @click="createTransformation()" color="primary" text>
            <v-progress-circular indeterminate v-if="loading"/>
            <span v-if="!loading">{{ $t("general.create") }}</span>
          </v-btn>

          <v-btn v-if="transformation"
            @click="editTransformation()"
            color="primary"
            text
            :disabled="transformation.archived"
          >
            <v-progress-circular indeterminate v-if="loading"/>
            <span v-if="!loading">{{ $t("general.save") }}</span>
          </v-btn>

          <v-btn v-if="!loading && !transformation" @click="reset()" color="error" text>
            {{ $t("general.reset") }}
          </v-btn>

          <v-btn v-if="!loading && transformation"
            @click="editReset()"
            color="error"
            text
            :disabled="transformation.archived"
          >
            {{ $t("general.reset") }}
          </v-btn>

          <v-btn @click="dialog = false" color="error" text>
            {{ $t("general.cancel") }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import {
  DataSourceT,
  MetatypeKeyT, EdgeConfigKeyT,
  MetatypeRelationshipKeyT,
  MetatypeRelationshipPairT,
  MetatypeT, TransformationErrorAction,
  TypeMappingTransformationCondition,
  TypeMappingTransformationPayloadT,
  TypeMappingTransformationSubexpression,
  TypeMappingTransformationT, TagT
} from "@/api/types";
import SelectDataSource from "../dataSources/SelectDataSource.vue";
import SearchMetatypes from "../ontology/metatypes/SearchMetatypes.vue";
import {v4 as uuidv4} from 'uuid';
import MetatypeKeysSelect from "../ontology/metatypes/MetatypeKeysSelect.vue";

interface TransformationDialogModel {
  errorMessage: string;
  validationErrorMessage: string;
  search: string;
  openPanels: number[];
  expanded: any[];
  loading: boolean;
  keysLoading: boolean;
  dialog: boolean;
  payloadType: string;
  conditionFormValid: boolean;
  subexpressionFormValid: boolean;
  mainFormValid: boolean;
  requiredKeysMapped: boolean;
  name: string;
  createdAt: string | null;
  createdAtFormatString: string;
  metatypes: MetatypeT[];
  conditionKey: string;
  conditionOperator: {
    text: string;
    value: any;
    requiresValue: boolean;
  } | null;
  conditionValue: string;
  conditions: TypeMappingTransformationCondition[];
  onConversionError: TransformationErrorAction | undefined;
  onKeyExtractionError: TransformationErrorAction | undefined;
  subexpressionExpression: string;
  subexpressionKey: string;
  subexpressionOperator: {
    text: string;
    value: any;
    requiresValue: boolean;
  } | null;
  subexpressionValue: string;
  payloadKeys: any[];
  payloadSelectedArrayKeys: any[];
  payloadArrayKeys: any[];
  rootArray: string | undefined | null;
  metadataKeys: string[];
  relationshipPairSearch: string;
  relationshipPairs: MetatypeRelationshipPairT[];
  selectedRelationshipPair: MetatypeRelationshipPairT | null;
  selectedMetatypeRelationshipPairKeys: MetatypeRelationshipKeyT[];
  selectedMetatype: MetatypeT | null;
  selectedMetatypeKeys: MetatypeKeyT[];
  origin_key: string | undefined | null;
  origin_data_source_id: string | undefined | null;
  origin_metatype_id: string | undefined | null;
  originConfigKeys: EdgeConfigKeyT[];
  destination_key: string | undefined | null;
  destination_data_source_id: string | undefined | null;
  destination_metatype_id: string | undefined | null;
  destinationConfigKeys: EdgeConfigKeyT[];
  uniqueIdentifierKey: string | undefined | null;
  propertyMapping: {[key: string]: any}[];
  tags: TagT[];
  selectedTags: TagT[];
  merge: boolean;
}

export default Vue.extend ({
  name: 'TransformationDialog',

  components: {
    SelectDataSource,
    SearchMetatypes,
    MetatypeKeysSelect
  },

  props: {
    payload: {type: Object as PropType<any>, required: true},
    dataSourceID: {type: String, required: true},
    containerID: {type: String, required: true},
    typeMappingID: {type: String, required: true},
    transformation: {
      type: Object as PropType<TypeMappingTransformationT | null>,
      required: false,
      default: null
    },
    icon: {type: Boolean, required: false},
  },

  computed: {
    operators() {
      return [
        {text: this.$t('operators.equals'), value: "==", requiresValue: true},
        {text: this.$t('operators.notEquals'), value: "!=", requiresValue: true},
        {text: this.$t('operators.in'), value: "in", requiresValue: true},
        {text: this.$t('operators.contains'), value: "contains", requiresValue: true},
        {text: this.$t('operators.exists'), value: "exists", requiresValue: false},
        {text: this.$t('operators.lessThan'), value: "<", requiresValue: true},
        {text: this.$t('operators.lte'), value: "<=", requiresValue: true},
        {text: this.$t('operators.greaterThan'), value: ">", requiresValue: true},
        {text: this.$t('operators.gte'), value: ">=", requiresValue: true},
      ];
    },
    expressions() {
      return ["AND", "OR"];
    },
    dataTypes() {
      return ['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean'];
    },
    paramOperators() {
      return [
        {text: this.$t('operators.equals'), value: "==", requiresValue: true},
        {text: this.$t('operators.notEquals'), value: "!=", requiresValue: true},
        {text: this.$t('operators.like'), value: "%", requiresValue: true},
        {text: this.$t('operators.lessThan'), value: "<", requiresValue: true},
        {text: this.$t('operators.lte'), value: "<=", requiresValue: true},
        {text: this.$t('operators.greaterThan'), value: ">", requiresValue: true},
        {text: this.$t('operators.gte'), value: ">=", requiresValue: true},
      ];
    },
    configFilterTypes() {
      return [
        {text: 'Data Source ID', value: 'data_source'},
        {text: this.$t('general.originalID'), value: 'original_id'},
        {text: this.$t('properties.property'), value: 'property'},
        {text: this.$t('nodes.id'), value: 'id'},
      ];
    },
    limitedConfigFilterTypes() {
      return [{text: this.$t('classes.class'), value: 'metatype_id'}];
    },
    conditionsHeader() {
      return [
        {text: this.$t('general.key'), value: "key"},
        {text: this.$t('operators.operator'), value: "operator"},
        {text: this.$t('general.value'), value: "value"},
        {text: this.$t('general.actions'), value: "actions", sortable: false}
      ];
    },
    subexpressionHeader() {
      return [
        {text: this.$t('transformations.expression'), value: "expression"},
        {text: this.$t('general.key'), value: "key"},
        {text: this.$t('operators.operator'), value: "operator"},
        {text: this.$t('general.value'), value: "value"},
        {text: this.$t('general.actions'), value: "actions", sortable: false}
      ];
    },
    edgeConfigHeader() {
      return [
        {text: this.$t('query.filterType'), value: "type"},
        {text: this.$t('operators.operator'), value: "operator"},
        {text: this.$t('typeMappings.keyOrValue'), value: "value"},
        {text: this.$t('general.actions'), value: "actions", sortable: false}
      ];
    },
    actionErrors() {
      return [
        {text: this.$t('validation.failOnRequired'), value: 'fail on required'},
        {text: this.$t('validation.fail'), value: 'fail'},
        {text: this.$t('validation.ignore'), value: 'ignore'}
      ];
    },
    dateString() {
      return this.$t('links.jsTime');
    },
    payloadTypes() {
      return [
        {name: this.$t("nodes.node"), value: 'node'},
        {name: this.$t("edges.edge"), value: 'edge'}
      ];
    },
    hasOldEdgeParams() {
      return (this.origin_key && this.origin_key !== '') || (this.destination_key && this.destination_key !== '');
    },
    originDataSourceID() {
      if (this.transformation) {
        return this.transformation.origin_data_source_id
      } else {
        return this.dataSourceID
      }
    },
    destinationDataSourceID() {
      if (this.transformation) {
        return this.transformation.destination_data_source_id
      } else {
        return this.dataSourceID
      }
    },
    originMetatypeID() {
      if (this.transformation) {
        return this.transformation.origin_metatype_id
      } else if (this.selectedRelationshipPair) {
        return this.selectedRelationshipPair.origin_metatype_id
      } else {
        return null
      }
    },
    destinationMetatypeID() {
      if (this.transformation) {
        return this.transformation.destination_metatype_id
      } else if (this.selectedRelationshipPair) {
        return this.selectedRelationshipPair.destination_metatype_id
      } else {
        return null
      }
    }
  },

  data: (): TransformationDialogModel => ({
    errorMessage: '',
    validationErrorMessage: '',
    search: '',
    openPanels: [0],
    expanded: [],
    loading: false,
    keysLoading: false,
    dialog: false,
    payloadType: '',
    conditionFormValid: false,
    subexpressionFormValid: false,
    mainFormValid: false,
    requiredKeysMapped: true,
    name: '',
    createdAt: null,
    createdAtFormatString: 'yyyy-MM-dd HH:mm:ss.SSS',
    metatypes: [],
    conditionKey: '',
    conditionOperator: null,
    conditionValue: '',
    conditions: [],
    onConversionError: 'fail on required',
    onKeyExtractionError: 'fail on required',
    subexpressionExpression: '',
    subexpressionKey: '',
    subexpressionOperator: null,
    subexpressionValue: '',
    payloadKeys: [],
    payloadSelectedArrayKeys: [],
    payloadArrayKeys: [],
    rootArray: null,
    metadataKeys: [],
    relationshipPairSearch: '',
    relationshipPairs: [],
    selectedRelationshipPair: null,
    selectedMetatypeRelationshipPairKeys: [],
    selectedMetatype: null,
    selectedMetatypeKeys: [],
    origin_key: null,
    origin_data_source_id: null,
    origin_metatype_id: null,
    originConfigKeys: [],
    destination_key: null,
    destination_data_source_id: null,
    destination_metatype_id: null,
    destinationConfigKeys: [],
    uniqueIdentifierKey: null,
    propertyMapping: [],
    tags: [],
    selectedTags: [],
    merge: false,
  }),

  watch: {
    propertyMapping: {handler: 'areRequiredKeysMapped', immediate: true},
    search: {
      handler(newVal) {
        this.onSearchChange(newVal);
      },
      immediate: true
    },
    selectedMetatype: {
      handler(newMetatype) {
        this.onMetatypeChange(newMetatype);
      },
      immediate: true,
    },
    selectedRelationshipPair: {
      handler(newPair) {
        this.onMetatypeRelationshipChange(newPair);
      },
      immediate: false,
    },
    rootArray: {handler: 'onRootArrayChange', immediate: true},
    payload: {handler: 'onPayloadChange', immediate: true},
  },

  methods: {
    validateRequired(value: any) {
      return !!value || this.$t('validation.required');
    },
    validateSelectOne(value: any) {
      return !!value || this.$t('validation.selectOne')
    },
    validatePostgresDate(value: string) {
      return !value.includes('%') || this.$t('help.postgresDate');
    },
    validateIDRequired(value: any) {
      // original data id is required for merging node data from a transformation
      if (this.merge) return !!value || this.$t('validation.required')
      return true;
    },
    reset() {
      const mainForm: any = this.$refs.mainForm
      const conditionForm: any = this.$refs.conditionForm

      mainForm.reset()
      conditionForm.reset()

      this.conditions = []
      this.relationshipPairSearch = ""
      this.selectedRelationshipPair = null
      this.selectedMetatypeRelationshipPairKeys = []
      this.selectedMetatype = null
      this.selectedMetatypeKeys = []
      this.propertyMapping = []
      this.metadataKeys = []
    },
    editReset() {
      if (this.transformation?.type === 'node') {
        this.$client.retrieveMetatype(this.containerID, this.transformation?.metatype_id!)
          .then((metatype) => {
            this.rootArray = this.transformation?.root_array
            if (Array.isArray(this.transformation?.conditions)) this.conditions = this.transformation?.conditions as Array<TypeMappingTransformationCondition>
            this.payloadType = 'node'
            this.selectedMetatype = metatype
            this.uniqueIdentifierKey = this.transformation?.unique_identifier_key

            if (Array.isArray(this.transformation?.keys)) this.propertyMapping = this.transformation?.keys as Array<{ [key: string]: any }>
            if(this.propertyMapping) {
              this.metadataKeys = this.propertyMapping.filter(k => k.is_metadata_key === true).map(k => k.key) as Array<string>
            }
          })
          .catch(e => this.errorMessage = e);
      }

      if (this.transformation?.type === 'edge') {
        if (this.transformation.selected_relationship_pair_name) {
          this.selectedRelationshipPair = this.relationshipPairs.filter((p: MetatypeRelationshipPairT) => {
            return p.name === this.transformation?.selected_relationship_pair_name!;
          })[0];
        } else {
          //Leaving this as a fallback for transformations that may not have gotten a selected_relationship_pair_name set to maintain
          //identical function for all tranformations no matter when they were created.
          this.$client.retrieveMetatypeRelationshipPair(this.containerID, this.transformation?.metatype_relationship_pair_id!)
            .then((pair) => {
              this.selectedRelationshipPair = pair
            })
            .catch(e => this.errorMessage = e)
        }

        this.rootArray = this.transformation?.root_array
        if (Array.isArray(this.transformation?.conditions)) this.conditions = this.transformation?.conditions as Array<TypeMappingTransformationCondition>
        this.payloadType = 'edge'


        this.uniqueIdentifierKey = this.transformation?.unique_identifier_key
        this.origin_key = this.transformation?.origin_id_key
        this.destination_key = this.transformation?.destination_id_key

        if (this.transformation?.origin_parameters) this.originConfigKeys = JSON.parse(JSON.stringify(this.transformation.origin_parameters));
        if (this.transformation?.destination_parameters) this.destinationConfigKeys = JSON.parse(JSON.stringify(this.transformation.destination_parameters));


        if (Array.isArray(this.transformation?.keys)) this.propertyMapping = this.transformation?.keys as Array<{ [key: string]: any }>
        if(this.propertyMapping) {
          this.metadataKeys = this.propertyMapping.filter(k => k.is_metadata_key === true).map(k => k.key) as Array<string>;
        }
      }

      if (this.transformation?.created_at_key) {
        this.createdAt = this.transformation.created_at_key;
        this.createdAtFormatString = this.transformation.created_at_format_string || '';
      }

      if (this.transformation?.tags) {
        this.selectedTags = this.transformation.tags;
      }

      if (this.transformation?.merge) {
        this.merge = this.transformation?.merge
      }

      this.name = this.transformation?.name!;
      this.onConversionError = this.transformation?.config.on_conversion_error as TransformationErrorAction;
      this.onKeyExtractionError = this.transformation?.config.on_key_extraction_error as TransformationErrorAction;
    },
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
    },
    areRequiredKeysMapped() {
      if (this.selectedMetatype) {
        let unmappedKeys = 0
        for (const key of this.selectedMetatypeKeys) {
          if (key.required) {
            if (!this.propertyMapping.find(prop => prop.metatype_key_id === key.id)) {
              unmappedKeys++
            }
          }
        }
        this.requiredKeysMapped = unmappedKeys === 0
        return
      }

      if (this.selectedRelationshipPair) {
        let unmappedKeys = 0
        for (const key of this.selectedMetatypeRelationshipPairKeys) {
          if (key.required) {
            if (!this.propertyMapping.find(prop => prop.metatype_relationship_key_id === key.id)) {
              unmappedKeys++
            }
          }
        }
        this.requiredKeysMapped = unmappedKeys === 0
        return
      }
    },
    onSearchChange(newVal: string) {
      this.$client.listMetatypes(this.containerID, {
        name: newVal,
        loadKeys: false,
        ontologyVersion: this.$store.getters.currentOntologyVersionID
      })
          .then((metatypes) => {
            this.metatypes = metatypes as MetatypeT[]
          })
          .catch((e: any) => this.errorMessage = e)
    },
    onMetatypeChange(newMetatype: MetatypeT) {
      if (!newMetatype) {
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
        ontologyVersion: this.$store.getters.currentOntologyVersionID,
        metatypeID: this.selectedMetatype?.id!,
        loadRelationships: false,
      })
          .then(pairs => {
            this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
          })
          .catch(e => this.errorMessage = e)

      this.$client.listMetatypeKeys(this.containerID, newMetatype.id!)
          .then(keys => {
            this.selectedMetatypeKeys = keys
            this.keysLoading = false
            this.areRequiredKeysMapped()
          })
          .catch(e => this.errorMessage = e)
    },
    onMetatypeRelationshipChange(newPair: MetatypeRelationshipPairT) {
      if (!newPair) {
        this.selectedRelationshipPair = null
        return
      }

      this.keysLoading = true
      // we need to wipe the filters on change if not a saved transformation, and load the initial, un-deletable filter
        this.originConfigKeys[0] = {
          id: uuidv4(),
          type: 'metatype_id',
          operator: "==",
          value: this.selectedRelationshipPair?.origin_metatype_id // yes it needs to be the uuid, but the search box will auto handle this
        } as EdgeConfigKeyT

        this.destinationConfigKeys[0] = {
          id: uuidv4(),
          type: 'metatype_id',
          operator: "==",
          value: this.selectedRelationshipPair?.destination_metatype_id // yes it needs to be the uuid, but the search box will auto handle this
        } as EdgeConfigKeyT

      this.$client.listMetatypeRelationshipKeys(this.containerID, newPair.relationship_id!)
          .then(keys => {
            this.selectedMetatypeRelationshipPairKeys = keys
            this.areRequiredKeysMapped()
            this.keysLoading = false
          })
          .catch(e => this.errorMessage = e)
    },
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

      if (this.rootArray) {
        // now let's split the root array key-name so that we can get each
        // key-name for each potential layer
        const parts = this.rootArray.split('[]')
        let prevBracketCount = 0
        for (let i = 0; i < parts.length; i++) {
          const key = parts.slice(0, i + 1).join('[]')
          const cleanKey = (key.charAt(key.length - 1) === ".") ? key.substr(0, key.length - 1) : key
          // now that we have a clean key, fetch the first value in that array payload
          // if it's an object, push its keys into the resulting payload keys
          const value = this.$utils.getNestedValue(cleanKey, this.payload, new Array(i + 1).fill(0))

          if (Array.isArray(value)) {
            const keys = Object.keys(value[0])

            keys.map(k => {
              this.payloadKeys.push(`${cleanKey}.[].${k}`)
              // remove keys for higher array objects so that
              // we are left with keys for the lowest array objects
              const bracketCount = (`${cleanKey}.[].${k}`.split("[]").length - 1)
              if (bracketCount > prevBracketCount) {
                // set prevBracketCount to the new highest number of brackets
                prevBracketCount = bracketCount
                // reset the array to remove all previously stored keys
                this.payloadSelectedArrayKeys = []
              }
              this.payloadSelectedArrayKeys.push(`${cleanKey}.[].${k}`)
            })
          }
        }
      }
    },
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
        if (Array.isArray(flattenedWithArrays[k]) && typeof flattenedWithArrays[k][0] === "object") {
          this.payloadArrayKeys.push(k)
        }
      })
    },
    autoPopulateMetatypeKeys() {
      if (this.selectedMetatype) {
        this.payloadKeys.forEach((payloadKey: string) => {
          // first, because payload keys are dot notated we need to strip it and find the root of each key
          const stripped = payloadKey.split('.')
          const rootKey = stripped[stripped.length - 1]

          const metatypeKey = this.selectedMetatypeKeys.find(metatypeKey => metatypeKey.property_name === rootKey)

          if (metatypeKey && !this.propertyMapping.some(m => (m.key === payloadKey && m.metatype_key_id === metatypeKey.id))) {
            this.propertyMapping.push({
              id: uuidv4(),
              key: payloadKey,
              metatype_key_id: metatypeKey.id
            })
          }
        })
      }
    },
    autoPopulateRelationshipKeys() {
      if (this.selectedRelationshipPair) {
        this.payloadKeys.forEach((payloadKey: string) => {
          // first, because payload keys are dot notated we need to strip it and find the root of each key
          const stripped = payloadKey.split('.')
          const rootKey = stripped[stripped.length - 1]

          const relationship = this.selectedMetatypeRelationshipPairKeys.find(relationshipKey => relationshipKey.property_name === rootKey)

          if (relationship && !this.propertyMapping.some(m => (m.key === payloadKey && m.metatype_relationship_key_id === relationship.id))) {
            this.propertyMapping.push({
              id: uuidv4(),
              key: payloadKey,
              metatype_relationship_key_id: relationship.id
            })
          }
        })
      }
    },
    createTransformation() {
      // @ts-ignore
      if (!this.$refs.mainForm!.validate()) return;

      this.setMetadataKeys()

      this.loading = true
      const payload: { [key: string]: any } = {}
      payload.config = {}
      payload.type = this.payloadType
      payload.name = this.name

      // include either the metatype or metatype relationship pair id, not both
      if (this.selectedMetatype) {
        payload.metatype_id = this.selectedMetatype.id
      } else if (this.selectedRelationshipPair) {
        payload.metatype_relationship_pair_id = this.selectedRelationshipPair.id
        payload.selected_relationship_pair_name = this.selectedRelationshipPair.name
        payload.origin_id_key = this.origin_key
        payload.origin_data_source_id = this.origin_data_source_id
        payload.origin_metatype_id = this.origin_metatype_id
        payload.destination_id_key = this.destination_key
        payload.destination_metatype_id = this.destination_metatype_id
        payload.destination_data_source_id = this.destination_data_source_id
        payload.destination_parameters = this.destinationConfigKeys
        payload.origin_parameters = this.originConfigKeys
      }

      if (this.createdAt) payload.created_at_key = this.createdAt
      if (this.createdAtFormatString) payload.created_at_format_string = this.createdAtFormatString

      if (this.selectedTags.length > 0) payload.tags = this.selectedTags

      payload.merge = this.merge
      payload.config.on_conversion_error = this.onConversionError
      payload.config.on_key_extraction_error = this.onKeyExtractionError
      payload.conditions = this.conditions
      payload.keys = this.propertyMapping
      if (this.uniqueIdentifierKey) payload.unique_identifier_key = this.uniqueIdentifierKey
      if (this.rootArray) payload.root_array = this.rootArray

      this.$client.createTypeMappingTransformation(this.containerID, this.dataSourceID, this.typeMappingID, payload as TypeMappingTransformationPayloadT)
        .then((transformation) => {
          this.loading = false
          this.reset()
          this.dialog = false
          this.$emit("transformationCreated", transformation)
        })
        .catch((e) => this.errorMessage = e)
    },
    editTransformation() {
      // @ts-ignore
      if (!this.$refs.mainForm!.validate()) return;

      this.loading = true
      const payload: { [key: string]: any } = {}
      payload.config = {}

      this.setMetadataKeys()

      // include either the metatype or metatype relationship pair id, not both
      payload.metatype_id = (this.selectedMetatype?.id) ? this.selectedMetatype.id : ""
      payload.metatype_relationship_pair_id = (this.selectedRelationshipPair?.id) ? this.selectedRelationshipPair.id : ""
      payload.selected_relationship_pair_name = (this.selectedRelationshipPair?.name) ? this.selectedRelationshipPair.name : ""
      payload.type = this.payloadType
      payload.name = this.name
      payload.origin_id_key = this.origin_key
      payload.origin_data_source_id = this.origin_data_source_id
      payload.origin_metatype_id = this.origin_metatype_id
      payload.destination_id_key = this.destination_key
      payload.destination_metatype_id = this.destination_metatype_id
      payload.destination_data_source_id = this.destination_data_source_id
      payload.destination_parameters = this.destinationConfigKeys
      payload.origin_parameters = this.originConfigKeys

      payload.config.on_conversion_error = this.onConversionError
      payload.config.on_key_extraction_error = this.onKeyExtractionError
      payload.conditions = this.conditions
      payload.keys = this.propertyMapping
      payload.type_mapping_id = this.typeMappingID
      payload.merge = this.merge
      if (this.uniqueIdentifierKey) payload.unique_identifier_key = this.uniqueIdentifierKey
      if (this.rootArray) payload.root_array = this.rootArray

      if (this.createdAt) payload.created_at_key = this.createdAt
      if (this.createdAtFormatString) payload.created_at_format_string = this.createdAtFormatString

      if (this.selectedTags.length > 0) payload.tags = this.selectedTags

      this.$client.updateTypeMappingTransformation(this.containerID, this.dataSourceID, this.typeMappingID, this.transformation?.id!, payload as TypeMappingTransformationPayloadT)
        .then((transformation) => {
          this.loading = false
          this.reset()
          this.dialog = false
          this.$emit("transformationUpdated", transformation)
        })
        .catch((e) => this.errorMessage = e)
    },
    isKeyMapped(key: MetatypeKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_key_id === key.id)
      if (!mapped) return false
      if (mapped.key) return true
      return false
    },
    isValueMapped(key: MetatypeKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_key_id === key.id)
      if (!mapped) return false
      if (mapped.value) return true
      return false
    },
    isRelationshipKeyMapped(key: MetatypeRelationshipKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_relationship_key_id === key.id)
      if (!mapped) return false
      if (mapped.key) return true
      return false
    },
    isRelationshipValueMapped(key: MetatypeRelationshipKeyT) {
      const mapped = this.propertyMapping.find(prop => prop.metatype_relationship_key_id === key.id)
      if (!mapped) return false
      if (mapped.value) return true
      return false
    },
    propertyKey(metatypeKey: MetatypeKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_key_id === metatypeKey.id)
      if (found) {
        return found.key
      }
      return null
    },
    propertyKeyValue(metatypeKey: MetatypeKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_key_id === metatypeKey.id)
      if (found) {
        return found.value
      }
      return null
    },
    propertyKeyFormatString(metatypeKey: MetatypeKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_key_id === metatypeKey.id)
      if (found) {
        return found.date_conversion_format_string
      }
      return null
    },
    relationshipPropertyKey(key: MetatypeRelationshipKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_relationship_key_id === key.id)
      if (found) {
        return found.key
      }
      return null
    },
    relationshipPropertyKeyValue(key: MetatypeRelationshipKeyT) {
      const found = this.propertyMapping.find(k => k.metatype_relationship_key_id === key.id)
      if (found) {
        return found.value
      }
      return null
    },
    selectPropertyKey(key: string, metatypeKey: MetatypeKeyT, value?: boolean) {
      if (!key) {
        this.propertyMapping = this.propertyMapping.filter(prop => {
          return prop.metatype_key_id !== metatypeKey.id
        })
        return
      }

      if (value) {
        if (this.propertyMapping.length <= 0) {
          this.propertyMapping.push({
            id: uuidv4(),
            value: key,
            value_type: metatypeKey.data_type,
            metatype_key_id: metatypeKey.id
          })
          return
        }

        this.propertyMapping = this.propertyMapping.filter(prop => {
          return prop.metatype_key_id !== metatypeKey.id
        })

        this.propertyMapping.push({
          id: uuidv4(),
          value: key,
          value_type: metatypeKey.data_type,
          metatype_key_id: metatypeKey.id
        })
        return
      }

      if (this.propertyMapping.length <= 0) {
        this.propertyMapping.push({
          id: uuidv4(),
          key: key,
          metatype_key_id: metatypeKey.id
        })
        return
      }

      this.propertyMapping = this.propertyMapping.filter(prop => {
        return prop.metatype_key_id !== metatypeKey.id
      })

      this.propertyMapping.push({
        id: uuidv4(),
        key: key,
        metatype_key_id: metatypeKey.id
      })
    },
    setMetadataKeys() {
      this.propertyMapping.forEach(k => {
        // set all metadata keys to false to ensure only selected keys are true
        k.is_metadata_key = false
        // if key already exists, set metadata key to true
        if(this.metadataKeys.includes(k.key)) {
          k.is_metadata_key = true
          this.metadataKeys = this.metadataKeys.filter(m => m !== k.key)
        }
      })
      // add any nonexistent keys
      this.metadataKeys.forEach(key => this.addMetadataKey(key))
      // remove superfluous keys from previous runs
      this.propertyMapping = this.propertyMapping.filter(k => !(k.is_metadata_key === false && !k.metatype_key_id && !k.metatype_relationship_key_id))
    },
    addMetadataKey(key: string) {
      this.propertyMapping.push({
        id: uuidv4(),
        key: key,
        is_metadata_key: true
      })
    },
    setDateConversionFormatStringRecord(formatString: string, metatypeKey: MetatypeKeyT) {
      const index = this.propertyMapping.findIndex(prop => prop.metatype_key_id === metatypeKey.id)
      if (index != -1) {
        this.propertyMapping[index].date_conversion_format_string = formatString
      }
    },
    setDateConversionFormatStringRelationship(formatString: string, metatypeRelationshipKey: MetatypeRelationshipKeyT) {
      const index = this.propertyMapping.findIndex(prop => prop.metatype_relationship_key_id === metatypeRelationshipKey.id)
      if (index != -1) {
        this.propertyMapping[index].date_conversion_format_string = formatString
      }
    },
    selectRelationshipPropertyKey(key: string, metatypeRelationshipKey: MetatypeRelationshipKeyT, value?: boolean) {
      if (!key) {
        this.propertyMapping = this.propertyMapping.filter(prop => {
          return prop.metatype_relationship_key_id !== metatypeRelationshipKey.id
        })
        return
      }

      if (value) {
        if (this.propertyMapping.length <= 0) {
          this.propertyMapping.push({
            id: uuidv4(),
            value: key,
            metatype_relationship_key_id: metatypeRelationshipKey.id
          })
          return
        }

        this.propertyMapping = this.propertyMapping.filter(prop => {
          return prop.metatype_relationship_key_id !== metatypeRelationshipKey.id
        })

        this.propertyMapping.push({
          id: uuidv4(),
          value: key,
          metatype_relationship_key_id: metatypeRelationshipKey.id
        })
        return
      }

      if (this.propertyMapping.length <= 0) {
        this.propertyMapping.push({
          id: uuidv4(),
          key: key,
          metatype_relationship_key_id: metatypeRelationshipKey.id
        })
        return
      }

      this.propertyMapping = this.propertyMapping.filter(prop => {
        return prop.metatype_relationship_key_id !== metatypeRelationshipKey.id
      })

      this.propertyMapping.push({
        id: uuidv4(),
        key: key,
        metatype_relationship_key_id: metatypeRelationshipKey.id
      })
    },
    addCondition() {
      const duplicate = this.conditions.find(c => c.key === this.conditionKey && c.operator === this.conditionOperator?.value && c.value === this.conditionValue)
      if (!duplicate) {
        this.conditions.push({
          key: this.conditionKey,
          operator: this.conditionOperator?.value,
          value: this.conditionValue,
          subexpressions: []
        } as TypeMappingTransformationCondition)
      }
    },
    deleteCondition(condition: TypeMappingTransformationCondition) {
      this.conditions = this.conditions.filter(c => condition !== c)
    },
    addSubexpression(condition: TypeMappingTransformationCondition) {
      const duplicate = condition.subexpressions.find(c => c.expression === this.subexpressionExpression && c.key === this.subexpressionKey && c.operator === this.subexpressionOperator?.value && c.value === this.subexpressionValue)

      if (!duplicate) {
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
    },
    validName(value: any) {
      if (!value) {
        return true
      }
      // this regex should match only if the name starts with an underscore or letter,
      // contains only alphanumerics and underscores with
      // no spaces and is between 1 and 30 characters in length
      const matches = /^[_a-zA-Z][a-zA-Z0-9_]{1,30}(?!\s)$/.exec(value)
      if (!matches || matches.length === 0) {
        return this.$t('help.nameRegex')
      }
      return true
    },
    deleteSubexpression(condition: TypeMappingTransformationCondition, subexpression: TypeMappingTransformationSubexpression) {
      condition.subexpressions = condition.subexpressions.filter(s => s !== subexpression)
    },
    setParentDataSource(ds: DataSourceT) {
      if (ds) {
        this.origin_data_source_id = ds.id as string
      }
    },
    setChildDataSource(ds: DataSourceT) {
      if (ds) {
        this.destination_data_source_id = ds.id as string
      }
    },
    setParentMetatype(m: MetatypeT) {
      if (m) {
        this.origin_metatype_id = m.id
      }
    },
    setChildMetatype(m: MetatypeT) {
      if (m) {
        this.destination_metatype_id = m.id
      }
    },
    flatten(data: any): any {
      const result: any = {};

      function recurse(cur: any, prop: any): any {
        if (Object(cur) !== cur) {
          result[prop] = cur;
        } else if (Array.isArray(cur)) {
          for (let i = 0, l = cur.length; i < l; i++)
            result[prop] = cur
          recurse(cur[0], prop + ".[]");
        } else {
          let isEmpty = true;
          for (const p in cur) {
            isEmpty = false;
            recurse(cur[p], prop ? prop + "." + p : p);
          }
          if (isEmpty && prop)
            result[prop] = {};
        }
      }

      recurse(data, "");
      return result;
    },
    flattenWithoutArray(data: any): any {
      const result: any = {};

      function recurse(cur: any, prop: any): any {
        if (Object(cur) !== cur) {
          result[prop] = cur;
        } else if (Array.isArray(cur)) {
          for (let i = 0, l = cur.length; i < l; i++)
            result[prop] = cur
        } else {
          let isEmpty = true;
          for (const p in cur) {
            isEmpty = false;
            recurse(cur[p], prop ? prop + "." + p : p);
          }
          if (isEmpty && prop)
            result[prop] = {};
        }
      }

      recurse(data, "");
      return result;
    },
    removeEdgeConfig(id: any, nodeType: 'origin' | 'destination') {
      if (nodeType === 'origin') {
        this.originConfigKeys = this.originConfigKeys.filter(k => k.id !== id)
      } else if (nodeType === 'destination') {
        this.destinationConfigKeys = this.destinationConfigKeys.filter(k => k.id !== id)
      }
    },
    addEdgeConfig(nodeType: 'origin' | 'destination') {
      if (nodeType === 'origin') {
        this.originConfigKeys.push({type: '', operator: '==', key: null, value: null, id: uuidv4()})
      } else if (nodeType === 'destination') {
        this.destinationConfigKeys.push({type: '', operator: '==', key: null, value: null, id: uuidv4()})
      }
    },
    setFilterMetatypeID(item: EdgeConfigKeyT, metatype: MetatypeT): void {
      item.value = metatype.id;
    },
    setFilterPropertyKey(item: EdgeConfigKeyT, key: MetatypeKeyT): void {
      item.property = key.property_name
    },
    convertToParameters(): void {
      if (this.transformation) {
        this.originConfigKeys = [
          {
            id: uuidv4(),
            type: 'metatype_id',
            operator: "==",
            value: this.transformation.origin_metatype_id // yes it needs to be the uuid, but the search box will auto handle this
          } as EdgeConfigKeyT,
          {
            id: uuidv4(),
            type: 'data_source',
            operator: "==",
            value: this.transformation.origin_data_source_id
          },
          {
            id: uuidv4(),
            type: 'original_id',
            operator: "==",
            key: this.transformation.origin_id_key,
            value: null,
          }
        ]

        this.destinationConfigKeys = [
          {
            id: uuidv4(),
            type: 'metatype_id',
            operator: "==",
            value: this.transformation.destination_metatype_id // yes it needs to be the uuid, but the search box will auto handle this
          } as EdgeConfigKeyT,
          {
            id: uuidv4(),
            type: 'data_source',
            operator: "==",
            value: this.transformation.destination_data_source_id
          },
          {
            id: uuidv4(),
            type: 'original_id',
            operator: "==",
            key: this.transformation.destination_id_key,
            value: null
          }
        ]

        this.origin_key = null
        this.destination_key = null
        this.origin_data_source_id = null
        this.destination_data_source_id = null
        this.origin_metatype_id = null
        this.destination_metatype_id = null
      }
    }
  },

  updated() {
    this.handleResize()
  },

  mounted() {
    this.$client.listMetatypeRelationshipPairs(this.containerID, {
      name: '',
      limit: 10000,
      offset: 0,
      originID: undefined,
      destinationID: undefined,
      ontologyVersion: this.$store.getters.currentOntologyVersionID,
      loadRelationships: false,
    })
      .then(pairs => {
        this.relationshipPairs = pairs as MetatypeRelationshipPairT[]
      })
      .catch(e => this.errorMessage = e)

    if (this.transformation) {
      if (this.transformation.origin_parameters) this.originConfigKeys = JSON.parse(JSON.stringify(this.transformation.origin_parameters));
      if (this.transformation.destination_parameters) this.destinationConfigKeys = JSON.parse(JSON.stringify(this.transformation.destination_parameters));
      this.$forceUpdate();
    }

    this.$client.listTagsForContainer(this.containerID)
      .then((tags) => {
        this.tags = tags.map((tag: TagT) => { return {id: tag.id, tag_name: tag.tag_name} });
      })
      .catch(e => this.errorMessage = e)
  }
});
</script>

<style scoped lang="scss">
.v-expansion-panel :deep(.v-expansion-panel-content) .v-expansion-panel-content__wrap {
  overflow-y: scroll;
}

.v-expansion-panel :deep(.v-expansion-panel-content) {
  max-height: 40vh;
}

.v-data-table :deep(tbody) > {
  & tr, & tr:hover {
    background-color: transparent !important;
  }
}
</style>