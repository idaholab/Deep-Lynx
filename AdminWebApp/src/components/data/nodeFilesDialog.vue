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

              <v-card class="pt-1 pb-3 px-2">
                <v-card-title>
                  <!-- <span class="headline text-h3"></span> -->
                </v-card-title>
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
          <v-flex style="display: flex; height: 100%; align-items: center">
            <ViewMediaFileDialog v-if="isVideo(item.file_name)">
              <VideoPlayer :options="videoOptions" />
            </ViewMediaFileDialog>
            <v-icon
                small
                @click="downloadFile(item)"
                class="mr-2"
            >
              mdi-download
            </v-icon>

            <v-icon
                small
                @click="removeFile(item)"
                class=""
            >
              mdi-delete
            </v-icon>
            <!-- not the world's best if statement for catching IFC files, but will work in 99% of the cases -->
            <ifc-viewer v-if="item.file_name.includes('.ifc')" :file="item" :icon="true"></ifc-viewer>

            <div @click="viewImage(item)" style="display: flex; height: 100%">
              <img :id="item.file_name" v-if="isImage(item.file_name)" v-observe-visibility="generateThumbnail(item)" :src="fileURL(item)" style="max-height: 50px; max-width: 150px" :alt="item.file_name">
            </div>

          </v-flex>
        </template>
      </v-data-table>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {FileT, NodeT} from "@/api/types";
import Config from "@/config";
import {mdiFileDocumentMultiple} from "@mdi/js";
import IfcViewer from "@/components/general/ifcViewer.vue";
import 'viewerjs/dist/viewer.css';
import Viewer from 'viewerjs';
import {AxiosBasicCredentials, AxiosRequestConfig, AxiosResponse, default as axios} from "axios";
import {RetrieveJWT} from "@/auth/authentication_service";
import buildURL from "build-url";
import ViewMediaFileDialog from "../dialogs/ViewMediaFileDialog.vue";
import VideoPlayer from "../media/VideoPlayer.vue";

@Component({components: {IfcViewer, ViewMediaFileDialog, VideoPlayer}})
export default class NodeFilesDialog extends Vue {
  @Prop({required: true})
  readonly node!: NodeT

  dialog = false
  fileLoading = false
  addFileDialog = false
  errorMessage = ''
  files: FileT[] = []
  copy = mdiFileDocumentMultiple
  imageViewers: Map<string, Viewer> = new Map()

  videoOptions = {
    autoplay: true,
    controls: true,
    sources: [
      {
        src: '',
        type: 'video/mp4'
      }
    ]
  }

  @Watch('node', {immediate: true})
  onNodeChange() {
    this.loadFiles()
  }

  mounted() {
    this.loadFiles()
  }

  generateThumbnail(file: FileT) {
    const imageElm = document.getElementById(file.file_name)
    if (imageElm === null) return

    const viewer = new Viewer(imageElm, {
      viewed() {
        viewer.zoomTo(1);
      },
      toolbar: {
        zoomIn: 1,
        zoomOut: 1,
        oneToOne: 1,
        reset: 1,
        prev: 0,
        play: {
          show: 0,
        },
        next: 0,
        rotateLeft: 1,
        rotateRight: 1,
        flipHorizontal: 1,
        flipVertical: 1,
      },
      navbar: false
    });
    this.imageViewers.set(file.id, viewer)
  }

  viewImage(file: FileT) {
    const viewer = this.imageViewers.get(file.id)
    if (viewer) viewer.show(true);
  }

  viewVideo(file: FileT) {
    console.log(this.videoOptions.sources[0].src)
    this.videoOptions.sources[0].src = this.fileURL(file);
    console.log(this.videoOptions.sources[0].src)
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

  downloadFile(file: FileT) {
    const config: AxiosRequestConfig = {}
    config.responseType = "blob"
    config.headers = {"Access-Control-Allow-Origin": "*"}

    if(Config?.deepLynxApiAuth === "token") {
      config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
    }

    if(Config?.deepLynxApiAuth === "basic") {
      config.auth = {username: Config.deepLynxApiAuthBasicUser, password: Config.deepLynxApiAuthBasicPass} as AxiosBasicCredentials
    }

    const url = buildURL(Config?.deepLynxApiUri!, {path: `/containers/${file.container_id}/files/${file.id}/download`})

    axios.get(url, config)
        .then((response: AxiosResponse) => {
          if (response.status > 299 || response.status < 200) {
            this.errorMessage = `Unable to download file`
          } else {
            const fetchedURL = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')

            link.href = fetchedURL
            link.setAttribute('download', file.file_name)
            document.body.append(link)
            link.click()
          }
        })
  }

  isImage(fileName: string): boolean {
    const extensions = ['jpg', 'jpeg', 'apng', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'ico', 'cur'];

    return extensions.some(ext => fileName.includes(ext));
  }

  isVideo(fileName: string): boolean {
    const extensions = ['mp4'];

    return extensions.some(ext => fileName.includes(ext));
  }

  fileURL(file: FileT): string {
    const token = localStorage.getItem('user.token');

    const fileUrl = new URL(`${Config.deepLynxApiUri}/containers/${file.container_id}/files/${file.id}/download`);
    fileUrl.searchParams.append("auth_token", token!);
    return fileUrl.toString()
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>