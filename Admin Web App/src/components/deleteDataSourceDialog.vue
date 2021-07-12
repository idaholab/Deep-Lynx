<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; isArchive = false; isDelete = false;"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="displayIcon === 'archive' || displayIcon === 'both' && displayIcon !== 'none'"
          small
          class="mr-2"
          v-on="on"
          @click="isArchive = true"
      >mdi-archive</v-icon>
      <v-icon
          v-if="displayIcon === 'trash' || displayIcon === 'both' && displayIcon !== 'none'"
          small
          class="mr-2"
          v-on="on"
          @click="isDelete = true"
      >mdi-delete</v-icon>
      <v-btn v-if="displayIcon ==='none'" color="primary" dark class="mb-2" v-on="on">{{$t("deleteDataSource.deleteDataSource")}}</v-btn>
    </template>

    <v-card v-if="isDelete">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('deleteDataSource.deleteTitle')}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
              >

              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false">{{$t("deleteDataSource.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="dialog = false" v-if="!dataSource.archived">{{$t("deleteDataSource.archive")}}</v-btn>
        <v-btn color="blue darken-1" text :disabled="countDown > 0">{{$t("deleteDataSource.delete")}}
          <span v-if="countDown > 0">{{$t('deleteDataSource.in')}} {{countDown}}</span></v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-if="isArchive">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('deleteDataSource.archiveTitle')}}</span>
          <v-row>
            <v-col :cols="12">

              <v-form
                  ref="form"
              >

              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false">{{$t("deleteDataSource.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="dialog = false">{{$t("deleteDataSource.archive")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {DataSourceT} from "@/api/types";

@Component
export default class DeleteDataSourceDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: true})
  dataSource!: DataSourceT

  @Prop({required: false, default: "none"})
  readonly icon!: "trash" | "archive" | "both" | "none"

  errorMessage = ""
  dialog = false
  isDelete = false
  isArchive = false
  countDown = 10

  get displayIcon() {
    return this.icon
  }

  mounted() {
    this.countdown()
  }

  countdown() {
    if(this.countDown > 0) {
      setTimeout(() => {
        this.countDown -= 1
        this.countdown()
      }, 1000)
    }
  }
}
</script>