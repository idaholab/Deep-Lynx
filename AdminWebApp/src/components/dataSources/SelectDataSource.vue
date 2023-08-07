<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-combobox
      :style="[noIndent ? '' : {'margin-left': '10px', 'margin-right': '10px'}]"
      :items="dataSources"
      item-text="name"
      @change="setDataSource"
      :label="label ? label : selectDataSourceString()"
      :multiple="multiple"
      :clearable="multiple"
      :disabled="disabled"
      v-model="selected"
      :rules="rules"
      :loading="loading"
      :key="key"
    >
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title v-if="item.archived" class="text--disabled">
            {{ item.name }} - <i class="text-caption">{{$t('general.archived')}}</i>
          </v-list-item-title>
          <v-list-item-title v-else>{{ item.name }}</v-list-item-title>
        </v-list-item-content>
      </template>

      <template v-if="tooltip" slot="append-outer">
        <info-tooltip :message="tooltipHelp"/>
      </template>
    </v-combobox>
  </div>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {DataSourceT} from "@/api/types";

  interface SelectDataSourceModel {
    dataSources: DataSourceT[]
    selected: DataSourceT | DataSourceT[] | null
    errorMessage: string
    loading: boolean
    key: number
  }

  export default Vue.extend ({
    name: 'SelectDataSource',

    props: {
      containerID: {type: String, required: true},
      showArchived: {type: Boolean, required: false, default: false},
      tooltip: {type: Boolean, required: false, default: false},
      tooltipHelp: {type: String, required: false, default: ''},
      multiple: {type: Boolean, required: false, default: false},
      disabled: {type: Boolean, required: false, default: false},
      dataSourceID: {
        type: Object as PropType<string|string[]>, 
        required: false
      },
      rules: {
        type: Object as PropType<any>,
        required: false
      },
      noIndent: {type: Boolean, required: false, default: false},
      label: {type: String, required: false},
      clear: {type: Boolean, required: false, default: false},
      timeseries: {type: Boolean, required: false},
    },

    data: (): SelectDataSourceModel => ({
      dataSources: [],
      selected: null,
      errorMessage: "",
      loading: true,
      key: 0
    }),

    watch: {
      clear: {handler: 'clearChange', immediate: true}
    },

    mounted() {
      this.$client.listDataSources(this.containerID, this.showArchived, this.timeseries)
        .then(dataSources => {
          this.dataSources = dataSources

          if (this.dataSourceID) {
            if (Array.isArray(this.dataSourceID)) {
              this.selected = []

              this.dataSourceID.forEach(id => {
                const source = this.dataSources.find(source => source.id === id)
                if (source) (this.selected as DataSourceT[]).push(source)
              })
            } else {
              const source = this.dataSources.find(source => source.id = this.dataSourceID as string)
              if (source) this.selected = source
            }
          }
        })
        .catch(e => this.errorMessage = e)
        .finally(() => {
          if (this.selected) {
            this.$emit('selected', this.selected)
          }

          this.loading = false
        })
    },

    methods: {
      clearChange() {
        this.key += 1
      },
      setDataSource(source: DataSourceT) {
        this.$emit('selected', source)
      },
      reset(tab?: string) {
        this.selected = null
        this.dataSources = []
        this.listDataSources(tab)
      },
      selectDataSourceString() {
        return this.$t('dataSources.select') as string
      },
      listDataSources(tab?: string) {
        let timeseries: boolean | undefined;
        if (tab && tab === 'timeseries') {
          timeseries = true
        } else if (tab) {
          timeseries = false
        } else {
          timeseries = this.timeseries
        }
        this.$client.listDataSources(this.containerID, this.showArchived, timeseries)
            .then(dataSources => {
              this.dataSources = dataSources

              if (this.dataSourceID) {
                if (Array.isArray(this.dataSourceID)) {
                  this.selected = []

                  this.dataSourceID.forEach(id => {
                    const source = this.dataSources.find(source => source.id === id)
                    if (source) (this.selected as DataSourceT[]).push(source)
                  })
                } else {
                  const source = this.dataSources.find(source => source.id === this.dataSourceID)
                  if (source) this.selected = source
                }
              }
            })
            .catch(e => this.errorMessage = e)
            .finally(() => {
              if (this.selected) {
                this.$emit('selected', this.selected)
              }

              this.loading = false
            })
      }
    }
  });
</script>
