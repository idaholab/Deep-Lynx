<template>
    <v-select hide-details :items="languages" @input="changeLanguage" v-model="selectedLanguage" class="white--text" :label="$t('home.language')"></v-select>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator'

    @Component
    export default class LanguageSelect extends Vue {
        selectedLanguage = "en"
        languages = [
            {
                text: "English",
                value: "en"
            },
            {
                text: "Spanish",
                value: "es"
            }
        ]

        changeLanguage() {
            this.$i18n.locale = this.selectedLanguage
        }
    }
</script>
