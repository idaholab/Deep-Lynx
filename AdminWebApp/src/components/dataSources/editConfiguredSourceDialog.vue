<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false" max-width="70%">
    <template v-slot:activator="{on}">
      <v-icon small class="mr-2" v-on="on">mdi-pencil</v-icon>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('configuredSource.edit')}}</span>
      </v-card-title>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-text-field
              disabled
              :value="config.type"
              :label="$t('createDataSource.sourceType')"
              required
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col :cols="12">
            <v-text-field
              disabled
              :label="$t('createDataSource.p6alias')"
              v-model="config.name"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col :cols="6">
            <v-text-field
              :label="$t('createDataSource.p6endpoint')"
              v-model="config.endpoint"
            />
          </v-col>
          <v-col :cols="6">
            <v-text-field
              :label="$t('createDataSource.p6projectID')"
              v-model="config.projectID"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="clearConfig()">{{$t('home.cancel')}}</v-btn>
        <v-btn
          :disabled="config.name === ''"
          color="primary"
          dark
          @click="editConfig"
        >{{$t('home.save')}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator';
import { ContainerT } from '@/api/types';

@Component
export default class EditConfiguredSourceDialog extends Vue {
  @Prop({required: true})
  configID!: string;

  dialog = false
  errorMessage = ''
  container: ContainerT | undefined = undefined;
  config: P6SourceConfig | undefined = undefined;
  index: number | undefined = undefined;

  beforeMount() {
    this.container = this.$store.getters.activeContainer;
    this.index = this.container?.config.configured_data_sources?.findIndex(config => config.id === this.configID);
    // select first item if no index found
    if (this.index === -1) {this.index = 0}
    this.config = this.container!.config.configured_data_sources![this.index!] as P6SourceConfig;
  }

  editConfig() {
    this.container!.config.configured_data_sources![this.index!] = this.config!
    this.$emit('edited')
    this.clearConfig()
  }

  clearConfig() {
    this.dialog = false;
    this.errorMessage = '';
  }
}

type P6SourceConfig = {
  id?: string;
  name?: string;
  endpoint: string;
  projectID: string;
  username?: string;
  password?: string;
  type: string;
}
</script>