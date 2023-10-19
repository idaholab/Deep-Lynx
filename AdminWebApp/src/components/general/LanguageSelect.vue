<template>
    <v-select hide-details :items="languages" @input="changeLanguage" v-model="selectedLanguage" class="white--text" :label="$t('languages.language')"></v-select>
</template>

<script lang="ts">
  import Vue from 'vue'

  export default Vue.extend ({
    name: 'LanguageSelect',

    data: () => ({
      selectedLanguage: "en",
      languages: [] as { text: string, value: string }[]
    }),

    created() {
      this.languages = [
        {
          text: this.$t('languages.english') as string,
          value: "en"
        },
        {
          text: this.$t('languages.spanish') as string,
          value: "es"
        }
      ];
    },

    methods: {
      changeLanguage() {
        this.$i18n.locale = this.selectedLanguage
      }
    }
  })
</script>
