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
        <span class="headline text-h3">{{$t('query.selectFilter')}}</span>
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
  import { Vue } from "vue-property-decorator";

  interface AddFilterModel {
    dialog: boolean
    model: number
  }

  export default Vue.extend ({
    name: 'AddFilter',

    props: {
      rawMetadataEnabled: {type: Boolean, required: false},
    },

    data: (): AddFilterModel => ({
      dialog: false,
      model: 0,
    }),

    methods: {
      options() {
        const commonOptions = [
          { text: this.$t('query.FilterMetatype'), value: 'FilterMetatype' },
          { text: this.$t('query.FilterDataSource'), value: 'FilterDataSource' },
          { text: this.$t('query.FilterID'), value: 'FilterID' },
          { text: this.$t('query.FilterOriginalID'), value: 'FilterOriginalID' },
          { text: this.$t('query.FilterMetadata'), value: 'FilterMetadata' },
        ];

        if (this.rawMetadataEnabled) {
          return [
            ...commonOptions,
            { text: this.$t('query.FilterRawData'), value: 'FilterRawData' },
          ];
        } else {
            return commonOptions;
        }
      },

      select(filterName: string) {
        this.$emit('selected', filterName)
        this.dialog = false
        this.$nextTick(() => {
          this.model = 0;
        });
      }
    },
  })
</script>