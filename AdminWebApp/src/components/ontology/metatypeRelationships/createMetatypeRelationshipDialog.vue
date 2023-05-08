<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("createMetatypeRelationship.createMetatypeRelationship")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('createMetatypeRelationship.newMetatypeRelationship')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
            >
              <v-text-field
                  v-model="name"
                  :rules="[v => !!v || $t('createMetatypeRelationship.nameRequired')]"
                  required
              >
                <template v-slot:label>{{$t('createMetatypeRelationship.name')}} <small style="color:red" >*</small></template>
              </v-text-field>
              <v-textarea
                  v-model="description"
                  :rules="[v => !!v || $t('createMetatypeRelationship.descriptionRequired')]"
                  required
              >
                <template v-slot:label>{{$t('createMetatypeRelationship.description')}} <small style="color:red" >*</small></template>
              </v-textarea>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('createMetatypeRelationship.requiredField')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false; reset()" >{{$t("createMetatypeRelationship.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="createMetatype()">{{$t("createMetatypeRelationship.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class CreateMetatypeRelationshipDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  name = ""
  description = ""
  valid = false

  createMetatype() {
    this.$client.createMetatypeRelationship(this.containerID, this.name, this.description, this.$store.getters.activeOntologyVersionID)
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('createMetatypeRelationship.errorCreatingAPI') as string
          } else {
            this.dialog = false
            // emit only the first object in the result array, as we're only creating
            // a single metatype
            this.$emit('metatypeRelationshipCreated', result[0])
            this.reset()
          }
        })
        .catch(e => this.errorMessage = this.$t('createMetatypeRelationship.errorCreatingAPI') as string + e)
  }

  reset() {
    this.name = ""
    this.description = ""
  }

}

</script>
