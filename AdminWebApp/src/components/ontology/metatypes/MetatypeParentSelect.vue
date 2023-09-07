<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-autocomplete
        v-model="parentMetatype"
        :single-line="false"
        :loading="metatypesLoading"
        :items="metatypes"
        :search-input.sync="metatypeSearch"
        item-text="name"
        return-object
        persistent-hint
        :hint="$t('classes.selectParentHelp')"
        clearable
        @change="updateSelectedMetatype"
        :disabled="(disableSelect && parentID !== undefined)"
    >
      <template v-slot:label>{{$t('general.parent')}}</template>
    </v-autocomplete>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {MetatypeT} from "@/api/types";

  interface MetatypeParentSelectModel {
    errorMessage: string
    parentMetatype: MetatypeT | null
    metatypes: MetatypeT[]
    metatypeSearch: string
    metatypesLoading: boolean
  }

  export default Vue.extend({
    name: 'MetatypeParentSelect',

    props: {
      containerID: {
        type: String,
        required: true
      },
      parentID: {
        type: String,
        required: false,
      },
      disableSelect: {
        type: Boolean,
        required: false,
        default: false
      }
    },

    data: (): MetatypeParentSelectModel => ({
      errorMessage: "",
      parentMetatype: null,
      metatypes: [],
      metatypeSearch: "",
      metatypesLoading: false,
    }),

    watch: {
      metatypeSearch: 'onMetatypeSearchChange'
    },

    methods: {
      onMetatypeSearchChange() {
        this.metatypesLoading = true
        this.$client.listMetatypes(this.containerID, {
          name: (this.metatypeSearch !== "") ? this.metatypeSearch : undefined,
          loadKeys: true,
          ontologyVersion: this.$store.getters.activeOntologyVersionID
        })
            .then((metatypes) => {
              this.metatypes = metatypes as MetatypeT[]
              this.metatypesLoading = false
            })
            .catch((e: any) => this.errorMessage = e)
      },
      updateSelectedMetatype() {
        this.$emit('parentUpdate', this.parentMetatype)
      },

    },

    created() {
      if (this.parentID) {
        this.$client.retrieveMetatype(this.containerID, this.parentID)
            .then((metatype) => {
              this.parentMetatype = metatype
            })
            .catch((e: any) => this.errorMessage = e)
      }
    },
  });
</script>
