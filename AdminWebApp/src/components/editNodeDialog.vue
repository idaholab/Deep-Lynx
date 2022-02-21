<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("editNode.editNode")}}</v-btn>
    </template>
    <v-card v-if="selectedNode">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('editNode.edit')}} {{selectedNode.metatype.name}}</span>
          <v-row>
            <v-col :cols="12">
              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="selectedNode.metatype.name"
                    :rules="[v => !!v || $t('editNode.nameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t("editNode.name")}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="selectedNode.metatype.description"
                    :rules="[v => !!v || $t('editNode.descriptionRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('editNode.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('editNode.requiredField')}}</p>
            </v-col>
            <v-col :cols="12">
              <v-data-table
                  :headers="headers()"
                  :items="nodeProperties"
                  :disable-pagination="true"
                  :hide-default-footer="true"
                  class="elevation-1"
              >
                <template v-slot:top>
                  <v-toolbar flat color="white">
                    <v-toolbar-title>{{$t('editNode.formTitle')}}</v-toolbar-title>
                    <v-divider
                        class="mx-4"
                        inset
                        vertical
                    ></v-divider>
                    <v-spacer></v-spacer>
                  </v-toolbar>
                </template>
                <template v-slot:[`item.value`]="value">
                  <v-edit-dialog
                     :return-value.sync="value.item.value"
                  >
                    {{ value.item.value }}
                    <template v-slot:input>
                      <v-text-field
                        v-model="value.item.value"
                        label="Edit"
                      ></v-text-field>
                    </template>
                  </v-edit-dialog>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("editNode.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="updateNode()">{{$t("editNode.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {NodeT, PropertyT} from "../api/types";

@Component({components: {}})
export default class EditNodeDialog extends Vue {
  @Prop({required: true})
  node!: NodeT;

  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  selectedNode: NodeT | null  = null
  valid = false
  nodeProperties: PropertyT[] = []
  property = {}

  // load properties to array when the node is selected so that we can edit fields.
  @Watch('dialog', {immediate: true})
  isDialogOpen() {
    if(this.dialog) {
      this.propertiesToArray()
    } 
  }

  headers() {
    return  [
      { text: this.$t('editNode.keyName'), value: 'key'},
      { text: this.$t('editNode.value'), value: 'value'},
    ]
  }

  mounted() {
    // have to do this to avoid mutating properties
    this.selectedNode = JSON.parse(JSON.stringify(this.node))
  }

  propertiesToArray() {
    if (this.selectedNode) {
      this.nodeProperties = []
      Object.entries(this.selectedNode.properties).forEach(([key, text]) => {
        const object = {key: key, value: String(text)} as PropertyT
        this.nodeProperties.push(object)  
      })
    }
   
  }

  setProperties() {
    this.property = {}
    const entries: { [key: string]: any } = {}
    this.nodeProperties.forEach( (property: any) => {
       if (String(property.value).toLowerCase() === "true") {
        property.value = true
      } else if (String(property.value).toLowerCase() === "false" ) {
         property.value = false
      } else if (String(property.value) === "") {
        property.value = null
      } else if (String(property.value) === "null") {
        property.value = null
      }
      entries[property.key] = property.value
    })
    this.property = entries
  }

  updateNode() {
    this.setProperties()
    this.$client.createNode(this.containerID,
      {
        "container_id": this.containerID,
        "data_source_id": this.dataSourceID,
        "metatype_id": this.selectedNode!.metatype.id,
        "properties": this.property,
        "id": this.selectedNode!.id
      }
    )
      .then(results => {
        this.dialog = false
        this.$emit('nodeUpdated', results[0])
      })
      .catch(e => this.errorMessage = this.$t('createNode.errorCreatingAPI') as string + e)
  }
}

</script>
