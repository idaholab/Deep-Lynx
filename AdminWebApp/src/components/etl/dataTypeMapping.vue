<template>
  <v-card>
    <error-banner :message="errorMessage"></error-banner>
    <v-row no-gutters style="padding: 10px 10px 10px 10px">
      <v-col :cols="12" style="padding-right: 10px">
        <h1>{{$t('dataMapping.typeMapping')}}</h1>
        <p>{{$t('dataMapping.typeMappingHelp')}}</p>
        <v-checkbox
            v-if="typeMapping"
            v-model="typeMapping.active"
            @click="updateTypeMapping"
            :label="$t('dataMapping.active')"
        ></v-checkbox>
        <v-divider></v-divider>
      </v-col>
      <v-col :cols="8">
        <v-data-table
            :headers="headers()"
            :items="transformations"
            class="elevation-1"
        >
          <template v-slot:top>
            <h2>{{$t('dataMapping.transformationsTableTitle')}}</h2>
          </template>
          <template v-slot:item.names="{ item }">
                <span v-if="item.archived" class="text--disabled">
                {{item.metatype_name}}
                {{item.metatype_relationship_pair_name}}
                </span>
            <span v-else>
               {{item.metatype_name}}
              {{item.metatype_relationship_pair_name}}
               </span>
          </template>
          <template v-slot:item.actions="{ item }">
            <transformation-dialog
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
                icon="both"></delete-type-transformation-dialog>
            <delete-type-transformation-dialog
                v-else
                @transformationDeleted="refreshTransformations()"
                @transformationArchived="refreshTransformations()"
                :containerID="containerID"
                :dataSourceID="dataSourceID"
                :transformation="item"
                icon="trash"></delete-type-transformation-dialog>
          </template>
        </v-data-table>
        <v-col>
          <transformation-dialog
              :payload="unmappedData"
              :typeMappingID="typeMappingID"
              :containerID="containerID"
              :dataSourceID="dataSourceID"
              @transformationCreated="refreshTransformations()"
          />
        </v-col>
      </v-col>
      <v-col :cols="4">
        <h2>{{$t('dataMapping.currentDataSet')}}</h2>
        <v-card max-height="360" style="overflow-y: scroll" flat>
          <json-view
              :data="unmappedData"
              :maxDepth=1
          />
        </v-card>
      </v-col>


    </v-row>
  </v-card>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {
  ImportDataT,
  TypeMappingT, TypeMappingTransformationT
} from "../../api/types";
import TransformationDialog from "@/components/etl/transformationDialog.vue";
import DeleteTypeTransformationDialog from "@/components/etl/deleteTypeTransformationDialog.vue";

@Component({
  filters: {
    pretty: function(value: any) {
      return JSON.stringify(value, null, 2)
    }
  },
  components: {TransformationDialog, DeleteTypeTransformationDialog}
})
export default class DataTypeMapping extends Vue {

  @Prop({required: true})
  readonly dataSourceID!: string;

  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: true})
  readonly typeMappingID!: string

  @Prop({required: false})
  readonly import!: ImportDataT | null

  errorMessage = ""
  typeMapping: TypeMappingT | null = null

  transformations: TypeMappingTransformationT[] = []

  updateTypeMapping() {
    this.$client.updateTypeMapping(this.containerID, this.dataSourceID, this.typeMappingID, this.typeMapping!)
        .then(() => {
          this.$emit("updated")
        })
        .catch((e: any) => this.errorMessage = e)
  }

  headers() {
    return  [{
      text: this.$t("dataMapping.resultingTypeName"),
      value: 'names'
    }, {
      text: this.$t("dataMapping.actions"),
      value: "actions"
    }]
  }

  unmappedData: {[key: string]: any} = {}

  beforeMount() {
    this.$client.retrieveTypeMapping(this.containerID, this.dataSourceID, this.typeMappingID)
        .then((typeMapping) =>{
          this.typeMapping = typeMapping

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

  refreshTransformations(){
    this.$client.retrieveTransformations(this.containerID, this.dataSourceID, this.typeMappingID)
        .then((transformations) => {
          this.transformations = transformations
        })
        .catch(e => this.errorMessage = e)
  }

  deleteTransformation(transformation: TypeMappingTransformationT) {
    this.$client.deleteTransformation(this.containerID, this.dataSourceID, this.typeMappingID, transformation.id, {})
        .then(() => this.refreshTransformations())
        .catch(e => this.errorMessage = e)
  }
}
</script>
