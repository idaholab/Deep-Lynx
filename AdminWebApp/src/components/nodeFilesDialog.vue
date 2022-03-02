<template>
  <v-container fluid>
    <v-col :cols="12">
      <v-data-table
          :items="files"
          :headers="headers()"
      >
        <template v-slot:top>
          <v-toolbar
              flat
          >
            <v-toolbar-title>{{$t('nodeFiles.attachedFiles')}}</v-toolbar-title>
            <v-divider
                class="mx-4"
                inset
                vertical
            ></v-divider>
            <v-spacer></v-spacer>

            <v-dialog
                v-model="addFileDialog"
                width="50%"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                    color="primary"
                    dark
                    class="mb-2"
                    v-bind="attrs"
                    v-on="on"
                >
                  {{$t('nodeFiles.addFile')}}
                </v-btn>
              </template>
              <v-card>
                <v-card-title></v-card-title>
                <v-card-text>
                  <v-progress-linear indeterminate v-if="fileLoading"></v-progress-linear>
                  <v-file-input v-if="!fileLoading" :label="$t('nodeFiles.selectFile')" @change="addFile"></v-file-input>
                </v-card-text>
              </v-card>
            </v-dialog>

          </v-toolbar>
        </template>


        <template v-slot:[`item.id`]="{ item }">
          <v-tooltip top>
            <template v-slot:activator="{on, attrs}">
              <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
            </template>
            <span>{{$t('nodeFiles.copyID')}} </span>
            <span>{{item.id}}</span>
          </v-tooltip>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <v-icon
              small
              @click="removeFile(item)"
          >
            mdi-delete
          </v-icon>
          <!-- not the world's best if statement for catching IFC files, but will work in 99% of the cases -->
          <ifc-viewer v-if="item.file_name.includes('.ifc')" :file="item" :icon="true"></ifc-viewer>
        </template>
      </v-data-table>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator";
import {FileT, NodeT} from "@/api/types";
import {mdiFileDocumentMultiple} from "@mdi/js";
import IfcViewer from "@/components/ifcViewer.vue";

@Component({components: {IfcViewer}})
export default class NodeFilesDialog extends Vue {
  @Prop({required: true})
  readonly node!: NodeT

  dialog = false
  fileLoading = false
  addFileDialog = false
  errorMessage = ''
  files: FileT[] = []
  copy = mdiFileDocumentMultiple

  mounted() {
    this.loadFiles()
  }

  headers() {
    return [
      {text: this.$t('nodeFiles.id'), value: 'id', sortable: false},
      {text: this.$t('nodeFiles.fileName'), value: 'file_name'},
      {text: this.$t('nodeFiles.fileSize'), value: 'file_size'},
      {text: this.$t('nodeFiles.actions'), value: 'actions', sortable: false}
    ]
  }

  addFile(file: File) {
    this.fileLoading = true

    this.$client.uploadFile(this.node.container_id, this.node.data_source_id, file)
    .then((uploadedFile) => {
      this.$client.attachFileToNode(this.node.container_id, this.node.id, uploadedFile.id)
      .then(() => {
        this.loadFiles()
      })
      .catch(e => this.errorMessage = e)
      .finally(() => {
        this.addFileDialog = false
        this.fileLoading = false
      })
    })
  }

  removeFile(file: FileT) {
    this.$client.detachFileFromNode(this.node.container_id, this.node.id, file.id)
    .then(() => this.loadFiles())
    .catch(e => this.errorMessage = e)
  }

  loadFiles() {
    this.$client.listNodeFiles(this.node.container_id, this.node.id)
    .then((files) => {
      this.files = files
    })
    .catch(e => this.errorMessage = e)
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>