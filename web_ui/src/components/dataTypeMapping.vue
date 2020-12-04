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
                {{item.metatype_name}}
                {{item.metatype_relationship_pair_name}}
              </template>
              <template v-slot:item.conditionals="{ item }">
                <v-checkbox
                    :value="isApplicable(item)"
                    readonly
                    disabled
                ></v-checkbox>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-icon
                    small
                    class="mr-2"
                    @click="viewItem(item)"
                >
                  mdi-eye
                </v-icon>
                <v-icon
                    small
                    @click="deleteTransformation(item)"
                >
                  mdi-delete
                </v-icon>
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
            <h2>Current Data Set</h2>
            <v-textarea
                filled
                name="input-7-4"
                :value="unmappedData | pretty"
                :rows="15"
            ></v-textarea>
          </v-col>


        </v-row>
    </v-card>
</template>

<script lang="ts">
    // TODO SET ACTIVE/INACTIVE TYPE MAPPING
    import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
    import {
      ImportDataT,
      TypeMappingT, TypeMappingTransformationT
    } from "../api/types";
    import InfoTooltip from "@/components/infoTooltip.vue";
    import TransformationDialog from "@/components/transformationDialog.vue";

    @Component({
        filters: {
            pretty: function(value: any) {
                return JSON.stringify(value, null, 2)
            }
        },
        components: {TransformationDialog, InfoTooltip}
    })
    export default class DataTypeMapping extends Vue {

        @Prop({required: true})
        readonly dataSourceID!: string;

        @Prop({required: true})
        readonly containerID!: string

        @Prop({required: true})
        readonly typeMappingID!: string

        @Prop({required: false})
        readonly payload!: ImportDataT | null

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
           text: this.$t("dataMapping.applicableToCurrentData"),
           value: 'conditions'
         }, {
           text: this.$t("dataMapping.actions"),
           value: "actions"
         }]
        }

        unmappedData: {[key: string]: any} = {}

        // returns whether or not the current transformation is applicable to
        // to the payload
        isApplicable(transformation: TypeMappingTransformationT) {
           return false
        }

        beforeMount() {
          this.$client.retrieveTypeMapping(this.containerID, this.dataSourceID, this.typeMappingID)
          .then((typeMapping) =>{
            this.typeMapping = typeMapping

            if(this.payload) {
              if(this.payload!.data) {
                this.unmappedData = this.payload!.data
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
          this.$client.deleteTransformation(this.containerID, this.dataSourceID, this.typeMappingID, transformation.id)
          .then(() => this.refreshTransformations())
          .catch(e => this.errorMessage = e)
        }
    }
</script>
