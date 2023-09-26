<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="clearTag()">
    <template v-slot:activator="{ on }">
      <v-icon
          small
          class="mx-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="displayIcon ==='none'" color="primary" dark class="mt-2" v-on="on">{{$t("tags.update")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("tags.update")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
                lazy-validation
            >

              <v-text-field
                  v-if="localTag"
                  v-model="localTag.tag_name"
                  :label="$t('tags.name')"
                  :rules="[validateTagName]"
              ></v-text-field>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearTag" >{{$t("general.cancel")}}</v-btn>
        <v-btn
            color="primary"
            text
            @click="updateTag" >
          {{$t("general.update")}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {TagT} from "@/api/types";

  interface EditTagDialogModel {
    errorMessage: string;
    dialog: boolean;
    valid: boolean;
    localTag: TagT | null;
  }

  interface VForm extends Vue {
    validate: () => boolean;
  }

  export default Vue.extend ({
    name: 'EditTagDialog',

    props: {
      containerID: {
        required: true,
        type: String
      },
      tag: {
        required: true,
        type: Object as () => TagT,
      },
      icon: {
        required: false,
        default: "none",
        type: String,
        validator: (value: string) => ["trash", "none"].includes(value)
      }
    },

    data: (): EditTagDialogModel & { localTag: TagT | null } => ({
      errorMessage: "",
      dialog: false,
      valid: true,
      localTag: null
    }),

    computed: {
      displayIcon(): string {
        return this.icon as string;
      }
    },

    methods: {
      updateTag() {
        if (!this.localTag || !this.localTag.id) {
          // Handle the scenario when localTag or its id is undefined.
          return;
        }
        
        const form = this.$refs.form as VForm;
        if (!form.validate()) return;

        this.$client.updateTag(this.containerID, this.localTag.id, this.localTag)
            .then(() => {
                this.$emit('tagUpdated');
                this.clearTag();
            })
            .catch(e => this.errorMessage = e)
      },
      clearTag() {
        this.dialog = false;
      },
      validateTagName(v: string): boolean | string {
        return !!v || this.$t('validation.required');
      }
    },

    created() {
      this.localTag = { ...this.tag };
    },
  });
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>