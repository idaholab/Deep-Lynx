<template>
    <v-card
    >
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
      <v-select
                style="margin-left:10px; margin-right: 10px"
                :items="dataSources"
                item-text="name"
                return-object
                @change="setDataSource"
                :value="selectedDataSource"
                :label="$t('dataMapping.selectDataSource')"
        ></v-select>
        <v-tabs v-if="selectedDataSource !== null" grow>
            <v-tab @click="activeTab = 'currentMappings'">{{$t('dataMapping.currentMappings')}}</v-tab>
                <v-tab @click="activeTab = 'pendingMappings'" :disabled="unmappedCount === 0">
                    <v-badge v-if="unmappedCount !== 0" color="green" :content="unmappedCount">
                        {{$t('dataMapping.pendingMapping')}}
                    </v-badge>
                    <div v-if="unmappedCount === 0" >
                      {{$t('dataMapping.pendingMapping')}}
                    </div>
            </v-tab>
        </v-tabs>
        <v-card v-if="(selectedDataSource !== null && activeTab ==='currentMappings')">
            <v-card-title>
                <v-text-field
                        v-model="search"
                        label="Search"
                        single-line
                        hide-details
                ></v-text-field>
            </v-card-title>
        <v-data-table
                :headers="headers"
                :items="typeMappings"
                class="elevation-1"
        >
            <template v-slot:[`item.actions`]="{ item }">
                <v-icon
                        small
                        class="mr-2"
                        @click="editItem(item)"
                >
                    mdi-pencil
                </v-icon>
                <v-icon
                        small
                        @click="deleteItem(item)"
                >
                    mdi-delete
                </v-icon>
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <v-icon
                        small
                        class="mr-2"
                        @click="editItem(item)"
                >
                    mdi-pencil
                </v-icon>
                <v-icon
                        small
                        @click="deleteItem(item)"
                >
                    mdi-delete
                </v-icon>
            </template>
        </v-data-table>
        </v-card>
        <div v-if="(selectedDataSource !== null && activeTab === 'pendingMappings')">
            <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" @mappingCreated="setUnmappedCount()"></data-type-mapping>
        </div>
    </v-card>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {DataSourceT, TypeMappingT} from "@/api/types";
import DataTypeMapping from "@/components/dataTypeMapping.vue"

    @Component({filters: {
            pretty: function(value: any) {
                return JSON.stringify(value, null, 2);
            }
        },
        components: {
           DataTypeMapping
    }})
    export default class DataMapping extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        errorMessage = ""
        successMessage = ""
        search = null
        unmappedCount = 0
        activeTab = "currentMappings"
        selectedDataSource: DataSourceT | null = null
        dataSources: DataSourceT[] = []
        typeMappings: TypeMappingT[] = []

        headers = [{
            text: "Class Name",
            value: "metatype_name",
            align: 'start'
        },{ text: 'Actions', value: 'actions', sortable: false },]

        @Watch('selectedDataSource', {immediate: true})
        onSelectedDataSourceChange(dataSource: DataSourceT) {
          if(!dataSource) return;

          this.refreshTypeMappings()
        }

        setDataSource(dataSource: any) {
            this.selectedDataSource = dataSource

            this.setUnmappedCount()
        }

        refreshTypeMappings() {
          this.$client.listTypeMappings(this.containerID, this.selectedDataSource?.id!, {})
              .then((results) => {
                this.typeMappings = results
              })
              .catch(e => this.errorMessage = e)
        }

        mounted() {
            this.$client.listDataSources(this.containerID)
                .then(dataSources => {
                    this.dataSources = dataSources
                })
                .catch((e: any) => this.errorMessage = e)
        }

        setUnmappedCount() {
          this.refreshTypeMappings()

            if(this.selectedDataSource) {
                this.$client.countUnmappedData(this.containerID, this.selectedDataSource.id)
                .then((count) => {
                    this.unmappedCount = count

                    if(this.unmappedCount === 0) {
                      this.activeTab = "currentMappings"
                    }
                })
            }
        }

      deleteItem(typeMapping: TypeMappingT) {
        this.$client.deleteTypeMapping(this.containerID, this.selectedDataSource?.id!, typeMapping.id)
            .then(()=> {
              this.refreshTypeMappings()
              this.successMessage = this.$t('dataMapping.successfullyDeleted') as string
            })
            .catch((e: any) => this.errorMessage = e)
      }
    }
</script>
