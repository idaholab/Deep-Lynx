<template>
  <div>
    <video ref="videoPlayer" class="video-js"></video>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';

  interface VideoPlayerModel {
    options: any;
    player: any;
  }

  export default Vue.extend ({
    name: 'VideoPlayer',

    data: (): VideoPlayerModel => ({
      options: {},
      player: null
    }),

    mounted() {
      this.player = videojs(this.$refs.videoPlayer as Element, this.options, () => {
        this.player.log('onPlayerReady', this);
      });
    },

    beforeDestroy() {
      if (this.player) {
        this.player.dispose();
      }
    } 
  });
</script>

<style lang="scss">
  .v-expansion-panel-header__icon .v-icon__svg {
    color: white;
  }
</style>