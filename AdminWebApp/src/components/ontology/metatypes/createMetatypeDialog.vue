<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createMetatype.createMetatype")}}</v-btn>
    </template>

    <v-card>
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('createMetatype.newMetatype')}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
                  v-model="valid"
              >
                <v-text-field
                    v-model="name"
                    :rules="[v => !!v || $t('createMetatype.nameRequired')]"
                    required
                >
                  <template v-slot:label>{{$t('createMetatype.name')}} <small style="color:red" >*</small></template>
                </v-text-field>
                <v-textarea
                    v-model="description"
                    required
                    :rules="[v => !!v || $t('createMetatype.nameRequired')]"
                >
                  <template v-slot:label>{{$t('createMetatype.description')}} <small style="color:red" >*</small></template>
                </v-textarea>
              </v-form>
              <p><span style="color:red">*</span> = {{$t('createMetatype.requiredField')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false; reset()" >{{$t("createMetatype.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="createMetatype()">{{$t("createMetatype.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class CreateMetatypeDialog extends Vue {
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
    this.$client.createMetatype(this.containerID, this.name, this.description, this.$store.getters.activeOntologyVersionID)
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('createMetatype.errorCreatingAPI') as string
          } else {
            this.dialog = false
            // emit only the first object in the result array, as we're only creating
            // a single metatype
            this.$emit('metatypeCreated', result[0])
            this.reset()
          }
        })
        .catch(e => this.errorMessage = this.$t('createMetatype.errorCreatingAPI') as string + e)
  }

  reset() {
    this.name = ""
    this.description = ""
  }

}

</script>
