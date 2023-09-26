<template>
  <DialogBasic
    ref="dialog"
    :icon-name="config.icon"
    :max-width="maxWidth"
    :icon="icon"
    :title="config.title"
    :button-title="config.button ?? config.title"
    :button-color="config.buttonColor ?? 'primary'"
    @closeDialog="resetDialog"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>
      <success-banner :message="successMessage"/>
      <!-- <template v-if="mode === 'create'">
        <v-text-field
          v-model="newTag"
          :label="$t('tags.name')"
          :rules="[validateRequired]"
        />
      </template> -->

      <template v-if="mode === 'add'">
        <v-progress-linear indeterminate v-if="tagLoading"/>
        <v-select
          :items="tags"
          item-text="tag_name"
          return-object
          :label="$t('tags.select')"
          v-model="selectedTag"
        />
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">{{$t('warnings.deleteTag')}}</v-alert>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <!-- <v-btn v-if="mode === 'create'"
        color="primary"
        text
        @click="createTag"
      >{{ $t('general.save') }}</v-btn> -->

      <v-btn v-if="mode === 'add'"
        color="primary"
        text
        @click="addTag(selectedTag)"
      >{{ $t('general.add') }}</v-btn>

      <v-btn v-if="mode === 'delete'"
        color="primary"
        text
        @click="removeTag"
      >{{ $t('general.delete') }}</v-btn>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import { TagT } from '@/api/types';

  interface TagActionsModel {
    config: {
      icon?: string;
      title?: string;
      button?: string;
      buttonColor?: string;
    }
    errorMessage: string;
    successMessage: string;
    newTag: string;
    tagLoading: boolean;
    tags: TagT[];
    selectedTag: TagT | null;
  }

  export default Vue.extend({
    name: 'TagActions',

    components: {DialogBasic},

    props: {
      mode: {type: String, required: true},
      containerID: {type: String, required: true},
      maxWidth: {type: String, required: false, default: '50%'},
      icon: {type: Boolean, required: false, default: true},
      tag: {type: Object as PropType<TagT>, required: false},
      graphItemID: {type: String, required: false},
      type: {type: String, required: true},
    },

    data: (): TagActionsModel => ({
      config: {},
      errorMessage: "",
      successMessage: "",
      newTag: "",
      tagLoading: false,
      tags: [],
      selectedTag: null,
    }),

    methods: {
      validateRequired(value: any) {
        return !!value || this.$t('validation.required');
      },
      // createTag() {
      //   const tag = {
      //     tag_name: this.newTag,
      //     metadata: {"webgl": false}
      //   }
      //   this.$client.createTag(this.containerID, [tag])
      //     .then((result) => {
      //       if(result) {
      //         // TODO: figure out how to attach newly created tag
      //         this.$emit('refreshTags');
      //         this.closeDialog();
      //       }
      //     })
      //     .catch(e => this.errorMessage = e);
      // },
      addTag(tag: TagT | null) {
        this.tagLoading = true;
        if (this.type === 'node') {
          this.addNodeTag(tag);
        } else if (this.type === 'edge') {
          this.addEdgeTag(tag);
        }
      },
      removeTag() {
        this.tag;
        if (this.type === 'node') {
          this.removeNodeTag();
        } else if (this.type === 'edge') {
          this.removeEdgeTag();
        }
      },
      loadTags() {
        this.$client.listTagsForContainer(this.containerID)
          .then((tags) => {
            this.tags = tags.map((t) => {
              return {id: t.id, tag_name: t.tag_name}
            });
          })
          .catch(e => this.errorMessage = e);
      },
      addNodeTag(tag: TagT | null) {
        this.$client.attachTagToNode(this.containerID, tag!.id!, this.graphItemID)
          .then(() => {
            this.$emit('refreshTags');
            this.closeDialog();
          })
          .catch(e => this.errorMessage = e)
          .finally(() => {
            this.tagLoading = false
          });
      },
      addEdgeTag(tag: TagT | null) {
        this.$client.attachTagToEdge(this.containerID, tag!.id!, this.graphItemID)
          .then(() => {
            this.$emit('refreshTags');
            this.closeDialog();
          })
          .catch(e => this.errorMessage = e)
          .finally(() => {
            this.tagLoading = false
          });
      },
      removeNodeTag() {
        this.$client.detachTagFromNode(this.containerID, this.tag.id!, this.graphItemID)
          .then(() => {
            this.$emit('refreshTags');
            this.closeDialog();
          })
          .catch(e => this.errorMessage = e);
      },
      removeEdgeTag() {
        this.$client.detachTagFromEdge(this.containerID, this.tag.id!, this.graphItemID)
          .then(() => {
            this.$emit('refreshTags');
            this.closeDialog();
          })
          .catch(e => this.errorMessage = e);
      },
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) {dialogInstance.close()}
      },
      openDialog() {
        this.$nextTick(() => {
          this.resetDialog();
        });
      },
      resetDialog() {
        this.errorMessage = "";
        this.successMessage = "";
        this.selectedTag = null;
      }
    },

    beforeMount() {
      switch(this.mode) {
        // case 'create': {
        //   this.config.title = this.$t('tags.createAttach');
        //   this.config.button = this.$t('tags.create');
        //   break;
        // }
        case 'add': {
          this.config.title = this.$t('tags.attachExisting');
          this.config.button = this.$t('tags.attach');
          this.loadTags()
          break;
        }
        case 'delete': {
          this.config.title = this.$t('tags.delete');
          this.config.icon = 'mdi-delete';
          break;
        }
      }
    }
  })
</script>