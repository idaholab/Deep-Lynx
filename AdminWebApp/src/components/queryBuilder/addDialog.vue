<template>
  <v-dialog
    v-model="dialog"
    width="500"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-icon
        v-bind="attrs"
        v-on="on"
        large
      >
        mdi-plus-circle
      </v-icon>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title class="grey lighten-2">
        <span class="headline text-h3">{{$t('queryBuilder.selectFilterType')}}</span>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col>
            <v-select
              :items="options()"
              @change="select"
              v-model="model"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">

import {Component, Vue} from "vue-property-decorator";

@Component
export default class AddDialog extends Vue {
  dialog = false
  model = 0

  options() {
    const options = [
      {text: this.$t('queryBuilder.MetatypeFilter'), value: 'MetatypeFilter'},
      {text: this.$t('queryBuilder.DataSourceFilter'), value: 'DataSourceFilter'},
      {text: this.$t('queryBuilder.IDFilter'), value: 'IDFilter'},
      {text: this.$t('queryBuilder.OriginalIDFilter'), value: 'OriginalIDFilter'},
      {text: this.$t('queryBuilder.MetadataFilter'), value: "MetadataFilter"},
      {text: this.$t('queryBuilder.RawDataFilter'), value: 'RawDataFilter'}
    ]

    return options
  }

  select(filterName: string) {
    this.$emit('selected', filterName)
    this.dialog = false
    this.$nextTick(() => {
      this.model = 0;
    });
  }
}
</script>