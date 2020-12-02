<template>
    <v-card>
        <error-banner :message="errorMessage"></error-banner>
        <v-row no-gutters style="padding: 10px 10px 10px 10px">
          <v-col :cols="12" style="padding-right: 10px">
            <h1>Type Mapping</h1>
            <p>{{$t('dataMapping.typeMappingHelp')}}</p>
            <v-checkbox
                v-model="typeMapping.active"
                :label="$t('dataMapping.active')"
            ></v-checkbox>
            <v-divider></v-divider>
          </v-col>
          <v-col :cols="8">
            <v-data-table
                :headers="headers"
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
                    @click="deleteItem(item)"
                >
                  mdi-delete
                </v-icon>
              </template>
            </v-data-table>
            <v-col>
              <new-transformation-dialog :unmapped="unmapped" :typeMappingID="unmapped.mapping_id" :containerID="containerID" :dataSourceID="dataSourceID"></new-transformation-dialog>
            </v-col>
          </v-col>
          <v-col :cols="4">
            <h2>Current Data Set</h2>
            <v-textarea
                filled
                name="input-7-4"
                :value="unmapped.data | pretty"
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
      MetatypeT,
      TypeMappingT, TypeMappingTransformationT
    } from "../api/types";
    import InfoTooltip from "@/components/infoTooltip.vue";
    import NewTransformationDialog from "@/components/newTransformationDialog.vue";

    @Component({
        filters: {
            pretty: function(value: any) {
                return JSON.stringify(value, null, 2)
            }
        },
        components: {NewTransformationDialog, InfoTooltip}
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
        search =  ""
        metatypes: MetatypeT[] = []
        typeMapping: TypeMappingT | null = null

        transformations: TypeMappingTransformationT[] = []

        headers = [{
          text: "Resulting Metatype/Metatype Relationship Name",
          value: 'names'
        }, {
          text: "Applicable to Current Data Set",
          value: 'conditionals'
        }, {
          text: "Actions",
          value: "actions"
        }]

        unmapped!: ImportDataT | null
        unmappedData: {[key: string]: any} = {}

        // returns whether or not the current transformation is applicable to
        // to the payload
        isApplicable(transformation: TypeMappingTransformationT) {
           return false
        }

        mounted() {
          this.unmapped = this.payload
          if(this.payload!.data) {
            this.unmappedData = this.payload!.data
          }

          this.$client.retrieveTypeMapping(this.containerID, this.dataSourceID, this.typeMappingID)
          .then((typeMapping) =>{
            this.typeMapping = typeMapping
          })
          .catch(e => this.errorMessage = e)
        }
    }
</script>
