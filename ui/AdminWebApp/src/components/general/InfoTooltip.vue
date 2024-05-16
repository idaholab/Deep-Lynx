<template>
    <v-tooltip top>
        <template v-slot:activator="{on, attrs}">
            <v-icon v-bind="attrs" v-on="on">{{info}}</v-icon>
        </template>
        <span>{{message}}</span>
    </v-tooltip>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {mdiInformation} from "@mdi/js"

  export default Vue.extend ({
    name: 'InfoTooltip',

    props: {
      message: {required: true}, // as PropType<string>
    },

    data: () => ({
      info: mdiInformation
    }),
  })
</script>
