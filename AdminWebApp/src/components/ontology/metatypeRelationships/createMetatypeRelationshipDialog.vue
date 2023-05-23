<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("relationshipTypes.create")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('relationshipTypes.new')}}</span>
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
                  :rules="[v => !!v || $t('validation.required')]"
                  required
              >
                <template v-slot:label>{{$t('general.name')}} <small style="color:red" >*</small></template>
              </v-text-field>
              <v-textarea
                  v-model="description"
                  :rules="[v => !!v || $t('validation.required')]"
                  required
              >
                <template v-slot:label>{{$t('general.description')}} <small style="color:red" >*</small></template>
              </v-textarea>
            </v-form>
            <p><span style="color:red">*</span> = {{$t('validation.required')}}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false; reset()" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" :disabled="!valid" text @click="createMetatype()">{{$t("general.save")}}</v-btn>
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
            this.errorMessage = this.$t('errors.errorCommunicating') as string
          } else {
            this.dialog = false
            // emit only the first object in the result array, as we're only creating
            // a single metatype
            this.$emit('metatypeRelationshipCreated', result[0])
            this.reset()
          }
        })
        .catch(e => this.errorMessage = this.$t('errors.errorCommunicating') as string + e)
  }

  reset() {
    this.name = ""
    this.description = ""
  }

}

</script>
