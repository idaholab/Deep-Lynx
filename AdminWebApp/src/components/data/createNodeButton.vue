<template>
    <div>
        <v-icon
        v-if="icon"
        small
        class="mr-2"
        >mdi-card-plus</v-icon>
        <v-btn v-if="!icon" color="primary" dark class="mt-1" @click="dialog = true">{{$t("createNode.createNode")}}</v-btn>
        <create-node-dialog
            :dialog.sync="dialog"
            :dataSourceID="dataSourceID" 
            :containerID="containerID"
            @nodeCreated="emitNode()"
        ></create-node-dialog>
    </div>
</template>


<script lang="ts">
import CreateNodeDialog from "@/components/data/createNodeDialog.vue";
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component({components: {
  CreateNodeDialog
}})
export default class CreateNodeButton extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  dialog = false

  emitNode() {
    this.$emit('nodeCreated')
  }

}

</script>
