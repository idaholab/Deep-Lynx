<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-combobox
        :items="metatypes"
        v-model="selectedMetatype"
        :search-input.sync="search"
        :single-line="false"
        item-text="name"
        :label="$t('classes.select')"
        :placeholder="$t('classes.search')"
        @change="emitSelected"
        return-object
        :multiple="multiple"
        :clearable="multiple"
        :disabled="disabled"
        :rules="rules"
        :loading="loading"
    >
      <template v-if="tooltip" slot="append-outer"><info-tooltip :message="tooltipHelp"></info-tooltip> </template>
    </v-combobox>
  </div>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {MetatypeT} from "@/api/types";

  interface SearchMetatypesModel {
    errorMessage: string
    loading: boolean
    search: string
    selectedMetatype: MetatypeT | null | MetatypeT[]
    metatypes: MetatypeT[]
  }

  export default Vue.extend ({
    name: 'SearchMetatypes',

    props: {
      containerID: {
        type: String,
        required: true
      },
      multiple: {
        type: Boolean,
        required: false, 
        default: false
      },
      disabled: {
        type: Boolean,
        required: false, 
        default: false
      },
      tooltip: {
        type: Boolean,
        required: false, 
        default: false
      },
      tooltipHelp: {
        type: String,
        required: false, 
        default: ''
      },
      metatypeID: {
        type: [String, Array] as PropType<string | string[]>,
        required: false
      },
      metatypeUUID: {
        type: [String, Array] as PropType<string | string[]>,
        required: false
      },
      metatypeName: {
        type: [String, Array] as PropType<string | string[]>,
        required: false,
      },
      rules: {
        type: Object as PropType<any>,
        required: false
      },
    },

    data: (): SearchMetatypesModel => ({
      errorMessage: "",
      loading: false,
      search: "",
      selectedMetatype: null,
      metatypes: []
    }),

    watch: {
      dialog: {
        immediate: true,
        handler(newDialog) {
          this.$client.listMetatypes(this.containerID, {name: newDialog, loadKeys: false, ontologyVersion: this.$store.getters.currentOntologyVersionID})
          .then((metatypes) => {
            this.metatypes = metatypes as MetatypeT[]
          })
          .catch((e: any) => this.errorMessage = e)
        }
      }
    },

    beforeMount(){
      if(this.metatypeID) {
        if(Array.isArray(this.metatypeID)) {
          this.selectedMetatype = []

          this.metatypeID.forEach(id => {
            this.$client.retrieveMetatype(this.containerID, id as string)
              .then((result: MetatypeT) => (this.selectedMetatype as MetatypeT[]).push(result))
              .finally(() => this.loading = false)
          })
        }

        this.$client.retrieveMetatype(this.containerID, this.metatypeID as string)
          .then((result: MetatypeT) => {
            this.selectedMetatype = result
            this.emitSelected(this.selectedMetatype)
          })
          .finally(() => this.loading = false)
      } else if (this.metatypeUUID) {
        if(Array.isArray(this.metatypeUUID)) {
          this.selectedMetatype = []

          this.metatypeUUID.forEach(id => {
            this.$client.retrieveMetatypeByUUID(this.containerID, id as string)
              .then((result: MetatypeT) => (this.selectedMetatype as MetatypeT[]).push(result))
              .finally(() => this.loading = false)
          })
        }

        this.$client.retrieveMetatypeByUUID(this.containerID, this.metatypeUUID as string)
          .then((result: MetatypeT) => {
            this.selectedMetatype = result
            this.emitSelected(this.selectedMetatype)
          })
          .finally(() => this.loading = false)
      } else if (this.metatypeName) {
        const metatypeNames = Array.isArray(this.metatypeName) ? (this.metatypeName as string[]).join(',') : this.metatypeName;
        this.$client.listMetatypes(this.containerID, {nameIn: metatypeNames, loadKeys: false, ontologyVersion: this.$store.getters.currentOntologyVersionID})
          .then((metatypes) => {
            if ((metatypes as MetatypeT[]).length > 1) {
              this.selectedMetatype = metatypes as MetatypeT[]
            } else {
              this.selectedMetatype = (metatypes as MetatypeT[])[0]
            }
          })
          .catch((e: any) => this.errorMessage = e)
          .finally(() => this.loading = false)
      } else {
        this.loading = false
      }
    },

    methods: {
      emitSelected(metatypes: any) {
        this.$emit('selected', metatypes)
      }
    }
  })
</script>
