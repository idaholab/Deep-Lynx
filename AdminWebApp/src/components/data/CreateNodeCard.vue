<template>
  <v-card class="pt-1 pb-3 px-2">
    <v-card-title>
    <span class="headline text-h3">{{$t("nodes.create")}}</span>
    </v-card-title>
    <v-card-text>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-row>
      <v-col :cols="12">
      <v-form
        ref="form"
        v-model="valid"
      >
        <SearchMetatypes
          :key="searchKey"
          :disabled="false"
          :containerID="containerID"
          :multiple="false"
          @selected="setMetatype"
        ></SearchMetatypes>
        
        <div v-if="metatype && Object.keys(metatype).length !== 0">
          <v-col :cols="12">
            <v-checkbox
              v-model="optional"
              :label="$t('general.showOptional')"
            ></v-checkbox>
            <v-col :cols="12" v-if="optional === true">
              <v-data-table
                :items="metatype.keys"
                :disable-pagination="true"
                :hide-default-footer="true"
                v-if="optional === true"
              >
                <template v-slot:[`item`]="{ item }">
                  <div v-if="item['data_type'] === 'enumeration'">
                    <v-combobox
                      v-model="item['default_value']"
                      :label="item['name']"
                      :items="item['options']"
                    ></v-combobox>
                  </div>

                  <div v-if="item['data_type'] === 'boolean'">
                    <v-select
                      v-model="item['default_value']"
                      :label="item['name']"
                      :items="booleanOptions"
                    ></v-select>
                  </div>

                  <div v-if="item['data_type'] !== 'enumeration' && item['data_type'] !== 'boolean'">
                    <v-text-field
                      v-if="item['data_type'] === 'number'||item['data_type'] === 'float'"
                      v-model="item['default_value']"
                      type="number"
                      :label="item['name']"
                    ></v-text-field>
                    <v-text-field
                      v-else
                      v-model="item['default_value']"
                      :label="item['name']"
                      :disabled="item['data_type'] === 'file'"
                    ></v-text-field>
                  </div>
                </template>
              </v-data-table>
            </v-col>
          </v-col>
          <v-col :cols="12">
            <v-checkbox
              v-model="alterCreatedAt"
              :label="$t('general.alterCreatedAt')"
              v-observe-visibility="loadDatePickr"
            ></v-checkbox>
            <div  v-show="alterCreatedAt">
              <div class="d-block">
                <label for="createdAtDate" style="padding-right: 4px">{{$t('general.createdAt')}}: </label>
                <input type="text" :placeholder="$t('timeseries.selectDate')" id="createdAtDate" />
              </div>
            </div>
          </v-col>
        </div>
      </v-form>
      <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
      </v-col>
    </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" text @click="close()" >{{$t("general.cancel")}}</v-btn>
      <v-btn color="primary" text :disabled="!valid" @click="newNode()">{{$t("general.save")}}</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {MetatypeT, NodeT, MetatypeKeyT} from "@/api/types";
  import flatpickr from "flatpickr";
  import SearchMetatypes from '../ontology/metatypes/SearchMetatypes.vue';

  interface CreateNodeCardModel {
    errorMessage: string;
    metatypesLoading: boolean;
    valid: boolean;
    optional: boolean;
    originSearch: string;
    metatype: MetatypeT | {[key: string]: any};
    booleanOptions: boolean[];
    properties: {[key: string]: any};
    originMetatypes: MetatypeT[];
    alterCreatedAt: boolean;
    createdAtDate: string;
    searchKey: number;
  }

  export default Vue.extend ({
    name: 'CreateNodeCard',

    components: {
      SearchMetatypes
    },

    props: {
      containerID: {type: String, required: true},
      dataSourceID: {type: String, required: true},
    },

    data: (): CreateNodeCardModel => ({
      errorMessage: '',
      metatypesLoading: false,
      valid: false,
      optional: false,
      originSearch: '',
      metatype: {},
      booleanOptions: [true, false],
      properties: [],
      originMetatypes: [],
      alterCreatedAt: false,
      createdAtDate: new Date().toISOString(),
      searchKey: 0,
    }),

    methods: {
      setMetatype(metatype: MetatypeT) {
        this.metatype = metatype;
        this.$client.listMetatypeKeys(this.containerID, this.metatype.id)
          .then((keys) => {
            this.metatype.keys = keys;
          });
      },
      loadDatePickr() {
        const createdAtPickr = flatpickr('#createdAtDate', {
          altInput: true,
          altFormat: 'F j, y h:i:S K',
          dateFormat: 'Z',
          enableTime: true,
          enableSeconds: true,
          allowInput: true,
        }) as flatpickr.Instance;

        (createdAtPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => {
          this.createdAtDate = dateStr;
        });
        (createdAtPickr as flatpickr.Instance).setDate(this.createdAtDate);
      },
      newNode() {
        if (this.metatype.id !== undefined && this.metatype.id !== null){
          this.setProperties()
          const node: any = {
            "container_id": this.containerID,
            "data_source_id": this.dataSourceID,
            "metatype_id": this.metatype.id,
            "properties": this.properties,
          }
          if (this.alterCreatedAt) node.created_at = this.createdAtDate

          this.$client.createOrUpdateNode(this.containerID, node)
              .then((results: NodeT[]) => {
                const node = results[0]
                node.metatype_name = this.metatype.name

                this.$emit('nodeCreated', node)
                this.close()
              })
              .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
        }
      },
      setProperties() {
        const properties: {[key: string]: any} = {}
        this.metatype.keys.forEach((key: MetatypeKeyT) => {
          let default_value = key.default_value;

          if(String(default_value).toLowerCase() === 'true') {
            default_value = true;
          } else if (String(default_value).toLowerCase() === 'false') {
            default_value = false;
          } else if (String(default_value) === "" || String(default_value) === "null"){
            default_value = undefined;
          }
          
          if (key.data_type === "number") default_value = parseInt(default_value as string, 10);

          if (key.data_type === "float") default_value = parseInt(default_value as string);

          properties[key.property_name] = default_value
        });
        this.properties = properties
      },
      reset() {
        this.metatype = {}
        this.searchKey += 1;
      },
      close() {
        this.reset()
        this.$emit('closed')
      },
      validateRequired(value: any) {
        return !!value || this.$t('validation.required');
      },
    }
  });
</script>