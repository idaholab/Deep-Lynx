<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-row>
      <v-col :cols="12" class="pt-9 px-9">
        <p>{{$t('dataMapping.typeMappingHelp')}}</p>
        <v-checkbox
          v-if="typeMapping"
          v-model="typeMapping.active"
          @click="updateTypeMapping"
          :label="$t('dataMapping.active')"
          class="ml-n1"
        ></v-checkbox>
      </v-col>
    </v-row>
    <v-divider></v-divider>
    <v-row no-gutters>
      <v-col :cols="8" class="pt-2">
        <div class="d-flex flex-row">
          <h3 class="text-h3 px-6">{{$t('dataMapping.transformationsTableTitle')}}</h3>
          <v-spacer></v-spacer>
          <div class="mr-3">
            <transformation-dialog
              :payload="unmappedData"
              :typeMappingID="(typeMappingID) ? typeMappingID: typeMapping.id"
              :containerID="containerID"
              :dataSourceID="dataSourceID"
              @transformationCreated="refreshTransformations()"
            />
          </div>
        </div>
        <v-data-table
          :headers="headers()"
          :items="transformations"
        >
          <template v-slot:item.names="{ item }">
            <span v-if="item.archived" class="text--disabled">
              {{item.metatype_name}}
              {{item.metatype_relationship_pair_name}}
              {{item.name}}
            </span>
            <span v-else>
              {{item.metatype_name}}
              {{item.metatype_relationship_pair_name}}
              {{item.name}}
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
        <h3 class="text-h3 pr-6">{{$t('dataMapping.currentDataSet')}}</h3>
        <v-card
          max-height="360"
          style="overflow-y: scroll" flat
        >
          <json-view
            :data="unmappedData"
            :maxDepth="1"
          />
        </v-card>
      </v-col>
    </v-row>
    <v-divider />
  </div>
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

  @Prop({required: false})
  readonly typeMappingID!: string

  @Prop({required: false})
  readonly shapeHash!: string


  @Prop({required: false})
  readonly import!: ImportDataT | null

  errorMessage = ""
  typeMapping: TypeMappingT | null = null

  transformations: TypeMappingTransformationT[] = []

  updateTypeMapping() {
    this.$client.updateTypeMapping(this.containerID, this.dataSourceID, this.typeMapping?.id!, this.typeMapping!)
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
    if(this.typeMappingID && this.typeMappingID !== '') {
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

    if(this.shapeHash && this.shapeHash !== '') {
      this.$client.retrieveTypeMappingByShapeHash(this.containerID, this.dataSourceID, this.shapeHash)
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
  }

  refreshTransformations(){
    this.$client.retrieveTransformations(this.containerID, this.dataSourceID, this.typeMapping?.id!)
        .then((transformations) => {
          this.transformations = transformations
        })
        .catch(e => this.errorMessage = e)
  }

  deleteTransformation(transformation: TypeMappingTransformationT) {
    this.$client.deleteTransformation(this.containerID, this.dataSourceID, this.typeMapping?.id!, transformation.id, {})
        .then(() => this.refreshTransformations())
        .catch(e => this.errorMessage = e)
  }
}
</script>
