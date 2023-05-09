<template>
  <v-container fluid>
    <v-col :cols="12">
      <v-data-table
          :items="nodeTags"
          :headers="headers()"
      >
        <template v-slot:top>
          <v-toolbar
              flat
          >
            <v-toolbar-title>{{$t('nodeTags.attachedTags')}}</v-toolbar-title>
            <v-divider
                class="mx-4"
                inset
                vertical
            ></v-divider>
            <v-spacer></v-spacer>

            <v-dialog
                v-model="addTagDialog"
                @click:outside="reset()"
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
                  {{$t('nodeTags.addTag')}}
                </v-btn>
              </template>

              <v-card class="pt-1 pb-3 px-2">
                <v-card-title>
                   <span class="headline text-h3">{{$t('nodeTags.addTag')}}</span>
                </v-card-title>
                <v-card-text>
                  <v-progress-linear indeterminate v-if="tagLoading"></v-progress-linear>
                  <v-select
                      :items="containerTags"
                      item-text="tag_name"
                      return-object
                      :label="$t('nodeTags.selectTag')"
                      v-model="selectedTag"
                  >
                  </v-select>
                </v-card-text>

                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" text @click="reset()">{{$t("home.cancel")}}</v-btn>
                  <v-btn color="error" text @click="addTag(selectedTag)">
                    {{$t("home.save")}}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

          </v-toolbar>
        </template>


        <template v-slot:[`item.id`]="{ item }">
          <v-tooltip top>
            <template v-slot:activator="{on, attrs}">
              <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
            </template>
            <span>{{$t('nodeTags.copyID')}} </span>
            <span>{{item.id}}</span>
          </v-tooltip>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <v-icon
              small
              @click="removeTag(item)"
          >
            mdi-delete
          </v-icon>
        </template>
      </v-data-table>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {NodeT, TagT} from "@/api/types";
import {mdiFileDocumentMultiple} from "@mdi/js";

@Component({components: {}})
export default class NodeTagsDialog extends Vue {
  @Prop({required: true})
  readonly node!: NodeT

  selectedTag: TagT | null = null
  tagLoading = false
  addTagDialog = false
  errorMessage = ''
  nodeTags: TagT[] = []
  containerTags: TagT[] = []
  copy = mdiFileDocumentMultiple

  @Watch('node', {immediate: true})
  onNodeChange() {
    this.loadNodeTags()
  }


  async mounted() {
    await this.loadNodeTags()
    await this.loadContainerTags()
  }

  headers() {
    return [
      {text: this.$t('nodeTags.id'), value: 'id', sortable: false},
      {text: this.$t('nodeTags.tagName'), value: 'tag_name'},
      {text: this.$t('nodeTags.actions'), value: 'actions', sortable: false}
    ]
  }

  addTag(tag: TagT) {
    this.tagLoading = true

    this.$client.attachTagToNode(this.node.container_id, tag.id!, this.node.id)
        .then(() => {
          this.loadNodeTags();
          this.$emit('tagAttached');
          this.reset();
        })
        .catch(e => this.errorMessage = e)
        .finally(() => {
          this.tagLoading = false
        })

  }

  removeTag(tag: TagT) {
    this.$client.detachTagFromNode(this.node.container_id, tag.id!, this.node.id)
        .then(() => {
          this.loadNodeTags()
        })
        .catch(e => this.errorMessage = e)

  }

  loadNodeTags() {
    this.$client.listTagsForNode(this.node.container_id, this.node.id)
        .then((tags) => {
          this.nodeTags = tags
        })
        .catch(e => this.errorMessage = e)
  }

  loadContainerTags() {
    this.$client.listTagsForContainer(this.node.container_id)
        .then((tags) => {
          this.containerTags = tags
        })
        .catch(e => this.errorMessage = e)
  }

  reset() {
    this.selectedTag = null;
    this.addTagDialog = false;
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>