<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-autocomplete
      :items="containers"
      item-text="name"
      :label="$t('containers.select')"
      return-object
      @input="setActiveContainer"
    ></v-autocomplete>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ContainerT} from "../../../api/types";

  interface ContainerSelectModel {
    containers: ContainerT[]
    errorMessage: string
  }

  export default Vue.extend ({
    name: 'ContainerSelect',

    data: (): ContainerSelectModel => ({
      containers:  [],
      errorMessage: ""
    }),

    methods: {
      setActiveContainer(container: any) {
        this.$store.commit('setActiveContainer', container)
        this.$emit('containerSelected', container)
      }
    },

    mounted() {
      this.$client.listContainers()
        .then(containers => {
            this.containers = containers
        })
        .catch(e => this.errorMessage = e)
    }
  })
</script>
