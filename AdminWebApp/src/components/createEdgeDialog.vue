<template>
  <v-dialog v-model="dialog" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createEdge.createEdge")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createEdge.formTitle")}}</span>
        <error-banner :message="errorMessage"></error-banner>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-autocomplete
                    v-model="originSelect"
                    :rules="[v => !!v || $t('createEdge.originNodeRequired')]"
                    :single-line="false"
                    :items="originNodes"
                    :search-input.sync="originSearch"
                    item-text="metatype_name"
                    return-object
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createEdge.originNode')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-autocomplete
                    v-model="destinationSelect"
                    :rules="[v => !!v || $t('createEdge.destinationNodeRequired')]"
                    :single-line="false"
                    :items="destinationNodes"
                    :search-input.sync="destinationSearch"
                    item-text="metatype_name"
                    return-object
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createEdge.destinationNode')}} <small style="color:red" >*</small></template>
                </v-autocomplete>
                <v-autocomplete
                    v-model="relationshipPairSelect"
                    :rules="[v => !!v || $t('createEdge.relationshipRequired')]"
                    :single-line="false"
                    :items="metatypeRelationshipPairs"
                    :search-input.sync="relationshipSearch"
                    item-text="name"
                    item-value="id"
                    persistent-hint
                    required
                    clearable
                >
                  <template v-slot:label>{{$t('createEdge.relationship')}} <small style="color:red" >*</small></template>
                </v-autocomplete>

                
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createEdge.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false" >{{$t("createEdge.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text :disabled="!valid" @click="createEdge()">{{$t("createEdge.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {MetatypeRelationshipPairT, NodeT} from "@/api/types";

@Component
export default class CreateRelationshipPairDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  icon = false
  errorMessage = ""
  dialog = false
  valid = false
  destinationSearch = ""
  originSearch = ""
  relationshipSearch = ""
  originID = ""
  destinationID =  ""
  relationshipPairID = ""
  originSelect = {} as NodeT;
  destinationSelect = {} as NodeT;
  relationshipPairSelect = ""
  relationshipType = ""
  originNodes: NodeT[] = []
  destinationNodes: NodeT[] = []
  metatypeRelationshipPairs: MetatypeRelationshipPairT[] = []

  @Watch('dialog', {immediate: true})
  onDialogChange() {
    if(!this.dialog) this.reset()
  }

  @Watch('destinationSearch', {immediate: true})
  onDestinationSearchChange() {
    this.$client.listNodes(this.containerID, {dataSourceID: this.dataSourceID})
        .then((nodes) => {
          this.destinationNodes = nodes as NodeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  @Watch('originSearch', {immediate: true})
  onOriginSearchChange() {
    this.$client.listNodes(this.containerID, {dataSourceID: this.dataSourceID})
        .then((nodes) => {
          this.originNodes = nodes as NodeT[]
        })
        .catch((e: any) => this.errorMessage = e)
  }

  // Sort the metatypeRelationshipPairs by the origin and desination selections
  //TODO check if Select.metatype.id is undefined.... but in a slick way.
  //BUGS: current implementation shows errors in web console about passing in array and can't read undefined
  @Watch('destinationSelect' || 'originSelect')
  onRelationshipSearchChange() {
    if(this.destinationSelect.metatype && this.originSelect.metatype) {
       this.$client.listMetatypeRelationshipPairs(this.containerID,  {
        destinationID: this.destinationSelect.metatype.id,
        originID: this.originSelect.metatype.id,
        ontologyVersion: this.$store.getters.activeOntologyVersionID
      })
        .then((metatypeRelationshipPairs) => {
          this.metatypeRelationshipPairs = metatypeRelationshipPairs as MetatypeRelationshipPairT[]
        })
        .catch(e => this.errorMessage = e) 
    }
    
        
  }

  createEdge() {
    this.$client.createEdge(this.containerID,
        {
          "container_id": this.containerID,
          "data_source_id": this.dataSourceID,
          "origin_id": this.originSelect.id,
          "destination_id": this.destinationSelect.id,
          "relationship_pair_id": this.relationshipPairSelect,
        }
    )
        .then(results => {
          this.dialog = false
          this.reset()
          this.$emit('edgeCreated', results[0])
        })
        .catch(e => this.errorMessage = this.$t('createEdge.errorCreatingAPI') as string + e)
  }

  reset() {
    this.originSelect = {} as NodeT
    this.destinationSelect = {} as NodeT
    this.relationshipPairSelect = ""
  }
}

</script>
