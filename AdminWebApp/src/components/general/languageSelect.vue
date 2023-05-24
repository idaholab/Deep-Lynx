<template>
    <v-select hide-details :items="languages" @input="changeLanguage" v-model="selectedLanguage" class="white--text" :label="$t('languages.language')"></v-select>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator'

    @Component
    export default class LanguageSelect extends Vue {
        selectedLanguage = "en"
        languages = [
            {
                text: this.$t('languages.english') as string,
                value: "en"
            },
            {
                text: this.$t('languages.spanish') as string,
                value: "es"
            }
        ]

        changeLanguage() {
            this.$i18n.locale = this.selectedLanguage
        }
    }
</script>
