<template>
  <v-dialog v-model="dialog" @click:outside="close()" width="40%" max-width="60%">
    <create-node-card
      :dialog.sync="dialog"
      :dataSourceID="dataSourceID"
      :containerID="containerID"
      @nodeCreated="emitNode()"
      @close="close()"
    ></create-node-card>
  </v-dialog>
</template>

<script lang="ts">
import CreateNodeCard from "@/components/data/createNodeCard.vue";
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component({components: {
  CreateNodeCard
}})
export default class CreateNodeDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  @Prop({required: false, default: false})
  dialog!: boolean;

  close() {
    this.$emit('update:dialog', false)
  }

  emitNode() {
    this.$emit('nodeCreated')
  }
}

</script>
