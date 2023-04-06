<template>
  <div>
    <video ref="videoPlayer" class="video-js"></video>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

@Component
export default class VideoPlayer extends Vue {
  @Prop({required: false, default: function () { return {} }})
  readonly options!: any

  player: any = null

  mounted() {
    // @ts-ignore
    this.player = videojs(this.$refs.videoPlayer!, this.options, () => {
      this.player.log('onPlayerReady', this);
    });
  }

  beforeDestroy() {
    if (this.player) {
      this.player.dispose();
    }
  }
}
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>
