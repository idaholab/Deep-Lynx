<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="clearTag()">
    <template v-slot:activator="{ on }">
      <v-icon
          small
          class="mx-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="displayIcon ==='none'" color="primary" dark class="mt-2" v-on="on">{{$t("fileManager.updateTag")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("fileManager.updateTag")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
                lazy-validation
            >

              <v-text-field
                  v-model="tag.tag_name"
                  :label="$t('fileManager.tagName')"
                  :rules="[v => !!v || $t('fileManager.tagRequired')]"
              ></v-text-field>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearTag" >{{$t("home.cancel")}}</v-btn>
        <v-btn
            color="primary"
            text
            @click="updateTag" >
          {{$t("home.update")}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import {TagT} from "@/api/types";

@Component
export default class EditTagDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: true})
  tag!: TagT

  @Prop({required: false, default: "none"})
  readonly icon!: "trash" | "none"

  dialog= false
  valid = true
  errorMessage = ""

  get displayIcon() {
    return this.icon
  }

  updateTag() {
    // @ts-ignore
    if(!this.$refs.form!.validate()) return;

    this.$client.updateTag(this.containerID, this.tag.id!, this.tag)
        .then(() => {
          this.$emit('tagUpdated');
          this.clearTag();
        })
        .catch(e => this.errorMessage = e)

  }

  clearTag() {
    this.dialog = false;
  }

}
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>
