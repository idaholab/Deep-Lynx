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

    <v-card>
      <v-card-title class="text-h5 grey lighten-2">
        {{$t('queryBuilder.selectFilterType')}}
      </v-card-title>
      <v-card-text>
        <v-select
            :items="options()"
            @change="select"
            v-model="model"
        >
        </v-select>
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
    return [
      {text: this.$t('queryBuilder.MetatypeFilter'), value: 'MetatypeFilter'},
      {text: this.$t('queryBuilder.DataSourceFilter'), value: 'DataSourceFilter'},
      {text: this.$t('queryBuilder.IDFilter'), value: 'IDFilter'},
      {text: this.$t('queryBuilder.OriginalIDFilter'), value: 'OriginalIDFilter'},
    ]
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