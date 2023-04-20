<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-combobox
        :items="metatypes"
        v-model="selectedMetatype"
        :search-input.sync="search"
        :single-line="false"
        item-text="name"
        :label="$t('dataMapping.chooseMetatype')"
        :placeholder="$t('dataMapping.typeToSearch')"
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
import {Component, Watch, Vue, Prop} from "vue-property-decorator";
import {MetatypeT} from "@/api/types";

@Component
export default class SearchMetatypes extends Vue {
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

  @Prop({required: false})
  metatypeID?: string | string[]

  @Prop({required: false})
  metatypeUUID?: string | string[]

  @Prop({required: false})
  metatypeName?: string | string[]

  @Prop({required: false})
  rules?: any

  search = ""
  errorMessage = ""
  loading = true

  selectedMetatype: MetatypeT | null | MetatypeT[] = null
  metatypes: MetatypeT[] = []

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
      if (Array.isArray(this.metatypeName)) {
        this.metatypeName = (this.metatypeName as string[]).join(',')
      }
      this.$client.listMetatypes(this.containerID, {nameIn: this.metatypeName, loadKeys: false, ontologyVersion: this.$store.getters.currentOntologyVersionID})
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
  }

  @Watch('search', {immediate: true})
  onSearchChange(newVal: string) {
    this.$client.listMetatypes(this.containerID, {name: newVal, loadKeys: false, ontologyVersion: this.$store.getters.currentOntologyVersionID})
        .then((metatypes) => {
          this.metatypes = metatypes as MetatypeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  emitSelected(metatypes: any) {
    this.$emit('selected', metatypes)
  }
}
</script>
