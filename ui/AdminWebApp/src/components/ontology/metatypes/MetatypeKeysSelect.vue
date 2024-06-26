<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-combobox
        :items="metatypeKeys"
        v-model="selectedMetatypeKeys"
        :single-line="false"
        item-text="name"
        :label="$t('classes.selectProperty')"
        :placeholder="$t('classes.searchProperty')"
        @change="emitSelected"
        return-object
        :multiple="multiple"
        :clearable="multiple"
        :disabled="disabled"
        :loading="loading"
    >
      <template v-if="tooltip" slot="append-outer"><info-tooltip :message="tooltipHelp"></info-tooltip> </template>
    </v-combobox>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {MetatypeKeyT} from "@/api/types";

  interface MetatypeKeySelectModel {
    search: string
    errorMessage: string
    loading: boolean
    selectedMetatypeKeys: MetatypeKeyT | null | MetatypeKeyT[]
    metatypeKeys: MetatypeKeyT[]
  }

  export default Vue.extend ({
    name: 'MetatypeKeysSelect',

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
        type: String,
        required: true
      },
      propertyName: {
        type: String,
        required: false
      },
    },

    data: (): MetatypeKeySelectModel => ({
      search: "",
      errorMessage: "",
      loading: true,
      selectedMetatypeKeys: null,
      metatypeKeys: []
    }),

    beforeMount() {
      this.$client.listMetatypeKeys(this.containerID, this.metatypeID)
        .then((keys) => {
          this.metatypeKeys = keys

          if(this.propertyName && this.metatypeKeys.length > 0) {
            const found = this.metatypeKeys.find(k => k.property_name === this.propertyName)
            if(found) this.selectedMetatypeKeys = found
          }
        })
        .catch((e) => this.errorMessage = e)
        .finally(() => this.loading = false);
    },

    methods: {
      emitSelected(keys: any) {
        this.$emit('selected', keys)
      },
      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      }
    }

  });
</script>
