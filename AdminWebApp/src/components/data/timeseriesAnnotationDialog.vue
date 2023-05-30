<template>
  <v-dialog
      v-model="dialog"
      max-width="60%"
      @click:outside="$emit('createAnnotation')"
  >

    <v-card class="pa-4">
      <v-form
          ref="form"
          v-model="valid"
          lazy-validation
      >
        <v-text-field
            v-model="x"
            :rules="[v => !!v || $t('validation.required')]"
            disabled
            label="X"
        ></v-text-field>
        <v-text-field
            v-model="y"
            :rules="[v => !!v || $t('validation.required')]"
            disabled
            label="Y"
        ></v-text-field>
        <v-text-field
            v-if="z"
            v-model="z"
            :rules="[v => !!v || $t('validation.required')]"
            disabled
            label="Z"
        ></v-text-field>
        <v-text-field
            v-model="annotation"
            :rules="[v => !!v || $t('validation.required')]"
            :label="$t('timeseries.annotation')"
        ></v-text-field>
        <v-select
            v-model="direction"
            :items="directions"
            :rules="[v => !!v || $t('validation.required')]"
            :hint="$t('help.annotation')"
            persistent-hint
        >
        </v-select>
      </v-form>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="$emit('createAnnotation')">{{$t('general.cancel')}}</v-btn>
        <v-btn
            :disabled="!valid"
            color="primary"
            dark
            @click="createAnnotation()"
        >{{$t('general.create')}}</v-btn>
      </v-card-actions>
    </v-card>

  </v-dialog>
</template>

<script lang="ts">

import {Component, Prop, Vue} from "vue-property-decorator";
import {Datum} from "plotly.js-dist-min";

@Component
export default class TimeseriesAnnotationDialog extends Vue {
  @Prop({required: true})
  readonly x!: Datum

  @Prop({required: true})
  readonly y!: Datum

  @Prop({required: false, default: null})
  readonly z!: Datum

  @Prop({required: true})
  dialog = false
  annotation = ''
  direction = ''
  directions = ['above', 'below']
  valid = false

  createAnnotation() {
    // @ts-ignore
    if (!this.$refs.form!.validate()) return;

    let annotation = {}
    if (this.z) {
      annotation = {
        x: this.x,
        y: this.y,
        z: this.z,
        annotation: this.annotation,
        direction: this.direction
      }
    } else {
      annotation = {
        x: this.x,
        y: this.y,
        annotation: this.annotation,
        direction: this.direction
      }
    }
    this.$emit('createAnnotation', annotation)
  }
}
</script>