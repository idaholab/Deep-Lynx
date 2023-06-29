<template>
  <v-dialog
    v-model="show"
    :max-width="maxWidth"
    transition= "dialog-transition"
    @click:outside="close()"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-icon
        v-if="icon"
        small
        v-bind="attrs"
        v-on="on"
      >{{ iconName }}</v-icon>
      <v-btn v-if="!icon" color="primary" v-bind="attrs" v-on="on">{{title}}</v-btn>
    </template>
    <v-card>
      <!-- Dialog Title -->
      <v-card-title class="py-1 pl-4 pr-2">
        <span class="headline text-h3">{{title}}</span>
        <v-spacer></v-spacer>
        <!-- Close button -->
        <v-btn text icon color="primary" @click="show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="px-4 py-0">
        <slot name="content" />
      </v-card-text>
      <!-- Dialog Action Buttons -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <slot name="actions" />
        <v-btn color="error" text @click="close()">{{$t("general.cancel")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {
  defineComponent,
  SetupContext,
  ref
} from "vue";

export default defineComponent({
  name: 'BasicDialog',

  props: {
    title: String,
    maxWidth: {type: String, required: false, default: '80%'},
    icon: {required: false, default: true}, // as PropType<boolean>
    iconName: {required: false, default: 'mdi-eye'},
  },

  setup(props: any, context: SetupContext) {
    const show = ref(props.value);

    function close() {
      show.value = !show.value
    }

    return {
      show,
      close
    };
  }
});
</script>