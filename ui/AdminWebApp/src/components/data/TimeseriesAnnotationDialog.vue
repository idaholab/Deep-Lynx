<template>
  <v-dialog
    :value="dialog"
    @input="$emit('update:dialog', $event)"
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
            v-model="annotateX"
            :rules="[validateRequired]"
            disabled
            label="X"
        ></v-text-field>
        <v-text-field
            v-model="annotateY"
            :rules="[validateRequired]"
            disabled
            label="Y"
        ></v-text-field>
        <v-text-field
            v-if="z"
            v-model="annotateZ"
            :rules="[validateRequired]"
            disabled
            label="Z"
        ></v-text-field>
        <v-text-field
            v-model="annotation"
            :rules="[validateRequired]"
            :label="$t('timeseries.annotation')"
        ></v-text-field>
        <v-select
            v-model="direction"
            :items="directions"
            :rules="[validateRequired]"
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
  import Vue, { PropType } from 'vue'
  import {Datum} from "plotly.js-dist-min";

  interface TimeseriesAnnotationDialogModel {
    annotation: string
    direction: string
    directions: string[]
    valid: boolean
    annotateX: Datum | undefined
    annotateY: Datum | undefined
    annotateZ: Datum | undefined
  }

  export default Vue.extend ({
    name: 'TimeseriesAnnotationDialog',

    props: {
      x: {type: [String, Number, Date, null] as PropType<Datum>, required: true},
      y: {type: [String, Number, Date, null] as PropType<Datum>, required: true},
      z: {type: [String, Number, Date, null] as PropType<Datum>, required: false, default: null},
      dialog: {type: Boolean, required: true, default: false},
    },

    data: (): TimeseriesAnnotationDialogModel => ({
      annotation: "",
      direction: "above",
      directions: ["above", "below"],
      valid: false,
      annotateX: undefined,
      annotateY: undefined,
      annotateZ: undefined
    }),

    watch: {
      x: {handler: 'xChange', immediate: true}
    },

    methods: {
      validateRequired(value: any) {
        return (value == 0 || !!value) || this.$t('validation.required');
      },
      xChange() {
        this.annotateX = this.x;
        this.annotateY = this.y;
        this.annotateZ = this.z;
      },
      createAnnotation() {
        // @ts-ignore
        if (!this.$refs.form!.validate()) return;

        let annotation: any = {}

        annotation = {
          x: this.x,
          y: this.y,
          annotation: this.annotation,
          direction: this.direction
        }

        if (this.z) annotation.z = this.z;
        this.$emit('createAnnotation', annotation)
      },
      assignDatumValue(value: Datum | undefined): Datum | undefined {
        return value !== undefined ? value : null;
      }
    }
  });
</script>
