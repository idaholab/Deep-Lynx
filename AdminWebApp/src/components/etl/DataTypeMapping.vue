<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <div class="pa-6 pb-0">
      <p>{{$t('help.typeMapping')}}</p>
      <v-checkbox
        v-if="typeMapping"
        v-model="typeMapping.active"
        @click="updateTypeMapping"
        :label="$t('typeMappings.enable')"
        class="ml-n1"
      ></v-checkbox>
    </div>

    <v-divider></v-divider>
    <v-row no-gutters>
      <v-col :cols="8" class="pt-2">
        <div class="d-flex flex-row">
          <h3 class="text-h3 px-6">{{$t('transformations.transformations')}}</h3>
          <v-spacer></v-spacer>
          <div class="mr-3">
            <TransformationDialog v-if="typeMappingID || typeMapping"
              :payload="unmappedData"
              :typeMappingID="mappingID"
              :containerID="containerID"
              :dataSourceID="dataSourceID"
              @transformationCreated="refreshTransformations()"
            />
          </div>
        </div>
        <v-data-table
          :headers="headers"
          :items="transformations"
        >
          <template v-slot:item.names="{ item }">
            <span v-if="item.archived" class="text--disabled">
              {{ item.metatype_name }}
              <span v-if="item.selected_relationship_pair_name">
                {{ item.selected_relationship_pair_name }}</span>
              <span v-else>
                {{ item.metatype_relationship_pair_name }}</span>
              {{ item.name }}
            </span>
            <span v-else>
              {{ item.metatype_name }}
              <span v-if="item.selected_relationship_pair_name">
                {{ item.selected_relationship_pair_name }}</span>
              <span v-else>
                {{ item.metatype_relationship_pair_name }}</span>
              {{ item.name }}
            </span>            
          </template>
          <template v-slot:item.actions="{ item }">
            <TransformationDialog
                :payload="unmappedData"
                :typeMappingID="typeMappingID"
                :containerID="containerID"
                :dataSourceID="dataSourceID"
                :icon="true"
                :transformation="item"
                @transformationUpdated="refreshTransformations()"
            />
            <delete-type-transformation-dialog
                v-if="!item.archived"
                @transformationDeleted="refreshTransformations()"
                @transformationArchived="refreshTransformations()"
                :containerID="containerID"
                :dataSourceID="dataSourceID"
                :transformation="item"
                icon="both"
            />
            <delete-type-transformation-dialog
                v-else
                @transformationDeleted="refreshTransformations()"
                @transformationArchived="refreshTransformations()"
                :containerID="containerID"
                :dataSourceID="dataSourceID"
                :transformation="item"
                icon="trash"
            />
          </template>
        </v-data-table>
      </v-col>
      <v-divider vertical />
      <v-col :cols="4" class="pt-2 pl-6">
        <h3 class="text-h3 pr-6">{{$t('transformations.currentDataSet')}}</h3>
        <v-card
          max-height="460"
          style="overflow-y: scroll" flat
        >
          <json-viewer
            :value="unmappedData"
            copyable
            :maxDepth="4"
          />
        </v-card>
      </v-col>
    </v-row>
    <v-divider />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import {
  ImportDataT,
  TypeMappingT, TypeMappingTransformationT
} from "../../api/types";
import TransformationDialog from "../etl/TransformationDialog.vue";
import DeleteTypeTransformationDialog from "../etl/DeleteTypeTransformationDialog.vue";

interface DataTypeMappingModel {
  errorMessage: string;
  typeMapping: TypeMappingT | null;
  transformations: TypeMappingTransformationT[];
  unmappedData: {[key: string]: any};
}

export default Vue.extend({
  name: 'DataTypeMapping',

  components: { 
    TransformationDialog, 
    DeleteTypeTransformationDialog
  },

  props: {
    dataSourceID: {type: String, required: true},
    containerID: {type: String, required: true},
    typeMappingID: {type: String, required: false},
    shapeHash: {type: String, required: false},
    active: {type: Boolean, required: false},
    import: {
      type: Object as PropType<ImportDataT | null>,
      required: false
    },
  },

  data: (): DataTypeMappingModel => ({
    errorMessage: '',
    typeMapping: null,
    transformations: [],
    unmappedData: {},
  }),

  computed: {
    headers() {
      return [
        {text: this.$t("typeMappings.resultingName"), value: 'names'},
        {text: this.$t("general.actions"), value: "actions"}
      ];
    },
    mappingID() {
      if (this.typeMappingID) {
        return this.typeMappingID;
      } else {
        return this.typeMapping!.id!;
      }
    }
  },

  methods: {
    updateTypeMapping() {
      if (this.typeMapping) {
        this.$client.updateTypeMapping(this.containerID, this.dataSourceID, this.typeMapping.id, this.typeMapping)
            .then(() => {
              this.$emit("updated")
            })
            .catch((e: any) => this.errorMessage = e)
      } else {
        this.errorMessage = this.$t("typeMappings.notFound")
      }
    },
    refreshTransformations() {
      if (this.typeMapping) {
        this.$client.retrieveTransformations(this.containerID, this.dataSourceID, this.typeMapping.id)
            .then((transformations) => {
              this.transformations = transformations
              this.$emit("updated")
            })
            .catch(e => this.errorMessage = e)
      } else {
        this.errorMessage = this.$t("typeMappings.notFound")
      }
    },
    deleteTransformation(transformation: TypeMappingTransformationT) {
      this.$client.deleteTransformation(this.containerID, this.dataSourceID, this.typeMapping?.id!, transformation.id, {})
        .then(() => this.refreshTransformations())
        .catch(e => this.errorMessage = e)
    }
  },

  beforeMount() {
    if(this.typeMappingID && this.typeMappingID !== '') {
      this.$client.retrieveTypeMapping(this.containerID, this.dataSourceID, this.typeMappingID)
          .then((typeMapping) =>{
            this.typeMapping = typeMapping
            this.typeMapping.active = this.active!

            if(this.import) {
              if(this.import!.data) {
                this.unmappedData = this.import!.data
              }
            } else {
              this.unmappedData = this.typeMapping.sample_payload
            }

            this.refreshTransformations()
          })
          .catch(e => this.errorMessage = e)
    }

    if(this.shapeHash && this.shapeHash !== '') {
      this.$client.retrieveTypeMappingByShapeHash(this.containerID, this.dataSourceID, this.shapeHash)
          .then((typeMapping) =>{
            this.typeMapping = typeMapping
            this.typeMapping.active = this.active!

            if(this.import) {
              if(this.import!.data) {
                this.unmappedData = this.import!.data
              }
            } else {
              this.unmappedData = this.typeMapping.sample_payload
            }

            this.refreshTransformations()
          })
          .catch(e => this.errorMessage = e)
    }
  }
});
</script>
