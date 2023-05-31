<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
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
  import {Component, Vue} from 'vue-property-decorator'
  import {ContainerT} from "../../../api/types";

  @Component
  export default class ContainerSelect extends Vue {
    errorMessage = ""
    containers: ContainerT[] =  []

    mounted() {
      this.$client.listContainers()
          .then(containers => {
              this.containers = containers
          })
          .catch(e => this.errorMessage = e)
    }

    setActiveContainer(container: any) {
      this.$store.commit('setActiveContainer', container)
      this.$emit('containerSelected', container)
    }
  }
</script>
