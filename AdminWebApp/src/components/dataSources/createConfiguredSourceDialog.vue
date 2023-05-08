<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="reset()">
    <template v-slot:activator="{on}">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t('configuredSource.addNew')}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('configuredSource.new')}}</span>
      </v-card-title>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-select
              v-model="type"
              :items="adapterTypes()"
              @input="selectAdapter"
              :label="$t('createDataSource.sourceType')"
              required
            />
          </v-col>
        </v-row>

        <div v-if="config.type === 'p6'">
          <v-form
            ref="form"
            v-model="valid"
          >
            <v-row>
              <v-col :cols="12">
                <v-text-field
                  :label="$t('createDataSource.p6alias')"
                  v-model="config.name"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col :cols="6">
                <v-text-field
                  :label="$t('createDataSource.p6endpoint')"
                  v-model="config.endpoint"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col :cols="6">
                <v-text-field
                  :label="$t('createDataSource.p6projectID')"
                  v-model="config.projectID"
                />
              </v-col>
            </v-row>
          </v-form>
        </div>
      </v-card-text>
            
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t('home.cancel')}}</v-btn>
        <v-btn
          :disabled="!valid"
          color="primary"
          dark
          @click="createConfig"
        >{{$t('home.create')}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {v4 as uuidv4} from 'uuid';

@Component
export default class CreateConfiguredSourceDialog extends Vue {
  dialog = false
  errorMessage = ''
  hidePass = true
  type = ''
  valid = false
  config: P6SourceConfig = {
    id: uuidv4(),
    name: '',
    endpoint: '',
    projectID: '',
    type: ''
  }

  adapterTypes() {
    const types = [
      {text: this.$t('createDataSource.p6'), value: 'p6', description: this.$t('createDataSource.p6description')}
    ]

    return types
  }

  selectAdapter(adapter: string){
    this.config.type = adapter
  }

  reset() {
    this.dialog = false
    this.type = ''
    this.config = {
      id: uuidv4(),
      name: '',
      endpoint: '',
      projectID: '',
      type: ''
    }
  }

  createConfig() {
    this.$emit('created', this.config)
    this.reset()
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