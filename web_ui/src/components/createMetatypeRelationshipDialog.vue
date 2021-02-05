<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-card-plus</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("createMetatypeRelationship.createMetatypeRelationship")}}</v-btn>
    </template>

    <v-card>
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('createMetatypeRelationship.newMetatypeRelationship')}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
              >
                <v-text-field
                    v-model="name"
                    :label="$t('createMetatypeRelationship.name')"
                    required
                ></v-text-field>
                <v-textarea
                    v-model="description"
                    :label="$t('createMetatypeRelationship.description')"
                ></v-textarea>

              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false; reset()" >{{$t("createMetatypeRelationship.cancel")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!formValid" text @click="createMetatype()">{{$t("createMetatypeRelationship.save")}}</v-btn>
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

  get formValid() {
    return this.name !== ""
  }

  createMetatype() {
    this.$client.createMetatypeRelationship(this.containerID, this.name, this.description)
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
