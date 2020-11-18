<template>
    <div>
        <v-data-table
                :headers="headers"
                :items="dataSources"
                sort-by="calories"
                class="elevation-1"
        >
            <template v-slot:top>
                <v-toolbar flat color="white">
                    <v-toolbar-title>Data Sources</v-toolbar-title>
                    <v-divider
                            class="mx-4"
                            inset
                            vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                    <new-data-source-dialog :containerID="containerID" @dataSourceCreated="refreshDataSources"></new-data-source-dialog>
                </v-toolbar>
            </template>
            <template v-slot:[`item.active`]="{item}">
                <v-switch @change="toggleDataSourceActive(item)" v-model="item.active"></v-switch>
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <v-icon
                        small
                        @click="deleteItem(item)"
                >
                    mdi-delete
                </v-icon>
            </template>
        </v-data-table>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'
    import {DataSourceT} from "@/api/types";
    import NewDataSourceDialog from "@/components/newDataSourceDialog.vue"

    @Component({components:{NewDataSourceDialog}})
    export default class DataSources extends Vue {
        @Prop({required: true})
        readonly containerID!: string;

        dialog= false
        select = ""
        headers = [
            { text: "Name", value: 'name' },
            { text: "Adapter Type", value: 'adapter_type'},
            { text: "Active", value: 'active'},
            { text: 'Actions', value: 'actions', sortable: false }
        ]
        dataSources: DataSourceT[] = []


        clearNewAdapter() {
            this.dialog = false
        }

        mounted() {
            this.refreshDataSources()
        }

        refreshDataSources() {
            this.$client.listDataSources(this.containerID)
                .then(dataSources => {
                    this.dataSources = dataSources
                })
                .catch(e => console.log(e))
        }

        deleteItem(dataSource: DataSourceT) {
            this.$client.deleteDataSources(this.containerID, dataSource.id)
                .then(()=> {
                    this.refreshDataSources()
                })
                .catch(e => console.log(e))
        }

        toggleDataSourceActive(dataSource: DataSourceT) {
            if(dataSource.active) {
                this.$client.activateDataSource(this.containerID, dataSource.id)
                    .then(()=> {
                        this.refreshDataSources()
                    })
                    .catch(e => console.log(e))
            } else {
                this.$client.deactivateDataSource(this.containerID, dataSource.id)
                    .then(()=> {
                        this.refreshDataSources()
                    })
                    .catch(e => console.log(e))
            }
        }
    }
</script>
