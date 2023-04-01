<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-data-table
        :headers="headers()"
        :items="fileSets"
        item-key="file_id"
        :loading="fileSetsLoading"
        sort-by="modified_at"
        sort-desc
        group-by="tag_name"
        show-group-by
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('home.fileManagerDescription')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <create-file-set-dialog :containerID="containerID" @fileSetCreated="refreshFileSets()"></create-file-set-dialog>
        </v-toolbar>
      </template>

      <template #[`group.header`]='{ items, isOpen, toggle }'>
        <td :colspan='12'>
          <v-btn
              icon
              @click='toggle'
          >
            <v-icon>{{ isOpen ? 'mdi-minus' : 'mdi-plus' }}</v-icon>
          </v-btn>
          {{ items[0].tag_name }}

          <edit-tag-dialog
              :containerID="items[0].container_id"
              @tagUpdated="refreshFileSets()"
              :tag="items[0]"
              icon="pencil">
          </edit-tag-dialog>

          <v-btn
              @click='open3DViewer(items)'
              style="float: right"
          >
            {{$t('fileManager.fileManager3DViewer')}}
          </v-btn>
        </td>
      </template>


      <template v-slot:[`item.copy`]="{ item }">
        <v-tooltip top>
          <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on" @click="copyID(item.file_id)">{{copy}}</v-icon>
          </template>
          <span>{{$t('dataSources.copyID')}}</span>
          <span>{{item.file_id}}</span>
        </v-tooltip>
      </template>
      <template v-slot:[`item.tag_name`]="{ item }">
        <span>{{item.tag_name}}</span>
      </template>
      <template v-slot:[`item.file_name`]="{ item }">
        <span>{{item.file_name}}</span>
      </template>
      <template v-slot:[`item.file_size`]="{ item }">
        <span>{{item.file_size}}</span>
      </template>
      <template v-slot:[`item.modified_at`]="{ item }">
        <span>{{item.modified_at}}</span>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <edit-file-set-dialog
            :containerID="containerID"
            :file="item"
            @fileUpdated="refreshFileSets"
        >
        </edit-file-set-dialog>
        <delete-file-set-dialog
            :containerID="item.container_id"
            @fileDeleted="refreshFileSets()"
            :file="item"
            icon="trash">
        </delete-file-set-dialog>
      </template>
    </v-data-table>

  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import CreateFileSetDialog from "@/components/fileManager/createFileSetDialog.vue";
import DeleteFileSetDialog from "@/components/fileManager/deleteFileSetDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import ReprocessDataSourceDialog from "@/components/dataImport/reprocessDataSourceDialog.vue";
import EditFileSetDialog from "@/components/fileManager/editFileSetDialog.vue";
import EditTagDialog from "@/components/fileManager/editTagDialog.vue";
import Config from "../config";

@Component({components:{
    CreateFileSetDialog,
    EditFileSetDialog,
    DeleteFileSetDialog,
    ReprocessDataSourceDialog,
    EditTagDialog
  }})
export default class FileManager extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  fileSetsLoading = false
  fileSets: any[] = []
  errorMessage = ""
  copy = mdiFileDocumentMultiple

  headers() {
    return [
      { text: '', value: 'copy', groupable: false,},
      { text: this.$t('fileManager.id'), value: 'file_id', groupable: false,},
      { text: this.$t('fileManager.tagName'), value: 'tag_name'},
      { text: this.$t('fileManager.file'), value: 'file_name', groupable: false,},
      { text: this.$t('fileManager.fileSize'), value: 'file_size', groupable: false,},
      { text: this.$t('fileManager.modifiedAt'), value: 'file_modified_at', groupable: false,},
      { text: this.$t('dataSources.actions'), value: 'actions', sortable: false, groupable: false,}
    ]
  }

  mounted() {
    this.refreshFileSets()
  }

  refreshFileSets() {
    this.fileSetsLoading = true
    this.$client.listWebGLFilesAndTags(this.containerID)
        .then(fileSets => {
          this.fileSets = fileSets
        })
        .catch(e => this.errorMessage = e)
        .finally(() => this.fileSetsLoading = false)
  }

  open3DViewer(selectedTag: any) {
    localStorage.setItem("webgl", JSON.stringify(selectedTag));
    window.open(`${Config.deepLynxApiUri}/viewer`, "_blank");
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
