<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
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
        :rules="rules"
        :loading="loading"
    >
      <template v-if="tooltip" slot="append-outer"><info-tooltip :message="tooltipHelp"></info-tooltip> </template>
    </v-combobox>
  </div>
</template>

<script lang="ts">
import {Component, Vue, Prop} from "vue-property-decorator";
import {MetatypeKeyT} from "@/api/types";

@Component
export default class MetatypeKeysSelect extends Vue {
  @Prop({required: true})
  readonly containerID!: string

  @Prop({required: false, default: false})
  multiple!: boolean

  @Prop({required: false, default: false})
  disabled?: boolean

  @Prop({required: false, default: false})
  tooltip!: boolean

  @Prop({required: false, default: ''})
  tooltipHelp!: string

  @Prop({required: true})
  readonly metatypeID!: string

  @Prop({required: false})
  rules?: any

  @Prop({required: false})
  propertyName?: string

  search = ""
  errorMessage = ""
  loading = true

  selectedMetatypeKeys: MetatypeKeyT | null | MetatypeKeyT[] = null
  metatypeKeys: MetatypeKeyT[] = []

  beforeMount(){
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
  }

  emitSelected(keys: any) {
    this.$emit('selected', keys)
  }
}
</script>
