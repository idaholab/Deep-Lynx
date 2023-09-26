<template>
  <v-card 
    :style="{
      'height': '100%',
      'max-height': maxHeight + 'px',
      'z-index': 4,
      'position': 'absolute',
      'min-width': '400px',
      'max-width': '50%',
      'overflow-y': 'scroll'
    }"
  >
    <div class="mt-2 pt-3 px-5 pb-5 height-full">
      <h4 class="primary--text">{{infoLabel}}</h4>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>

      <!-- if we have an id we can assume the object exists -->
      <div v-if="graphItem.id">
        <v-row>
          <v-col>
            <div>
              <span class="text-overline">{{$t('general.id')}}:</span> {{displayedItem.id}}
            </div>
            <div>
              <span class="text-overline">{{ontologyLabel}}:</span> {{displayedItem.ontology_name}}
            </div>
            <div>
              <span class="text-overline">{{$t('dataSources.dataSource')}}:</span> {{getDataSource}}
            </div>
            <div>
              <span class="text-overline">{{$t('general.dateCreated')}}:</span> {{ displayedItem.created_at }}
            </div>
            <div v-show="displayedItem.modified_at">
              <span class="text-overline">{{$t('general.modifiedAt')}}:</span> {{ displayedItem.modified_at }}
            </div>
            <v-expansion-panels multiple v-model="openPanels">
              <!-- Properties -->
              <v-expansion-panel>
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{$t('properties.properties')}}</span></div>
                  <GraphItemActions v-if="displayedItem && displayedItem.id && displayedItem.properties"
                    :key="displayedItem.id"
                    :type="type"
                    mode="edit"
                    :containerID="containerID"
                    :icon="false"
                    :graphItem="displayedItem"
                    @updated="updateGraphItem"
                  />
                </v-expansion-panel-header> 
                <v-expansion-panel-content>
                  <v-data-table v-if="displayedItem.properties"
                    :items="Object.keys(displayedItem.properties).map(k => {
                      return {key: k, value: displayedItem.properties[k]}
                    })"
                    :headers="propertyHeaders"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
              <!-- History View -->
              <v-expansion-panel>
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{historyLabel}}:</span></div>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-list>
                    <v-list-item-group color="primary">
                      <v-list-item
                        two-line
                        v-for="(item, i) in displayedItem.history"
                        :key="i"
                        @click="getInfo(item.id, i)"
                        :value="item.created_at"
                      >
                        <v-list-item-icon><v-icon color="#b2df8a">mdi-edit</v-icon></v-list-item-icon>

                        <v-list-item-content>
                          <v-list-item-title>{{$utils.formatISODate(item.created_at)}}</v-list-item-title>
                          <v-list-item-subtitle>{{$t('general.createdBy')}}: {{getCreatedBy(item.created_by)}}</v-list-item-subtitle>
                        </v-list-item-content>
                      </v-list-item>
                    </v-list-item-group>
                  </v-list>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <!-- Timeseries (Node Only) -->
              <v-expansion-panel v-if="type === 'node'">
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{$t('timeseries.data')}}:</span></div>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <NodeTimeseriesDataTable
                    :nodeID="displayedItem.id"
                    :containerID="containerID"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
              <!-- Metadata Properties -->
              <v-expansion-panel v-if="displayedItem.metadata_properties !== null"> 
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{$t('query.metadataProperties')}}:</span></div>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-container fluid>
                    <json-viewer
                      :value="displayedItem.metadata_properties"
                      copyable
                      :maxDepth="4"
                    />
                  </v-container>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <!-- Raw Data -->
              <v-expansion-panel v-if="rawDataEnabled && displayedItem.raw_data"> 
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{$t('query.rawData')}}:</span></div>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-container fluid>
                    <json-viewer
                      :value="displayedItem.raw_data"
                      copyable
                      :maxDepth="4"
                    />
                  </v-container>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <!-- Files (Node Only) -->
              <v-expansion-panel v-if="type === 'node'"> 
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{$t('files.files')}}:</span></div>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <NodeFilesDialog
                    :icon="true"
                    :node="displayedItem"
                    @nodeFilesDialogClose="refreshFiles"
                    :key="fileKey"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
              <!-- Tags -->
              <v-expansion-panel> 
                <v-expansion-panel-header>
                  <div><span class="text-overline">{{$t('tags.tags')}}:</span></div>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-data-table
                    :items="tags"
                    :headers="tagHeaders"
                  >
                    <template v-slot:top>
                      <v-toolbar flat>
                        <v-toolbar-title>{{ $t('tags.attached') }}</v-toolbar-title>
                        <v-divider class="mx-4" inset vertical></v-divider>
                        <v-spacer></v-spacer>
                        <!-- <TagActions
                          mode="create"
                          :type="type"
                          :containerID="containerID"
                          :graphItemID="graphItem.id"
                          :icon="false"
                          @refreshTags="loadTags"
                        /> -->
                        <span class="px-2"></span>
                        <TagActions
                          :key="displayedItem.id"
                          mode="add"
                          :type="type"
                          :containerID="containerID"
                          :graphItemID="displayedItem.id"
                          :icon="false"
                          @refreshTags="loadTags"
                        />
                      </v-toolbar>
                    </template>

                    <template v-slot:[`item.id`]="{item}">
                      <v-tooltip top>
                        <template v-slot:activator="{on, attrs}">
                          <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
                        </template>
                        <span>{{ $t('general.copyID') }} {{ item.id }}</span>
                      </v-tooltip>
                    </template>

                    <template v-slot:[`item.actions`]="{item}">
                      <TagActions
                        :key="displayedItem.id"
                        mode="delete"
                        :type="type"
                        :containerID="containerID"
                        :graphItemID="displayedItem.id"
                        :tag="item"
                        @refreshTags="loadTags"
                      />
                    </template>
                  </v-data-table>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-col>
        </v-row>
      </div>

      <p v-else>{{helpLabel}}</p>

      <GraphItemActions v-if="displayedItem && displayedItem.id"
        :key="displayedItem.id"
        :type="type"
        mode="delete"
        :icon="false"
        :containerID="containerID"
        :graphItem="displayedItem"
        @deleteGraphItem="deleteGraphItem"
      />
    </div>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import NodeTimeseriesDataTable from '../data/NodeTimeseriesDataTable.vue';
import NodeFilesDialog from '../data/NodeFilesDialog.vue';
import { DataSourceT, EdgeT, NodeT, TagT, UserT } from '@/api/types';
import GraphItemActions from '../data/GraphItemActions.vue';
import TagActions from '../data/TagActions.vue';
import { mdiFileDocumentMultiple } from '@mdi/js';

interface GraphItemCardModel {
  openPanels: number[];
  dataSources: Map<string, DataSourceT>;
  users: Map<string, UserT>;
  fileKey: number;
  displayedItem: any;
  tags: TagT[];
  copy: string;
  errorMessage: string;
}

export default Vue.extend({
  name: 'GraphItemCard',

  props: {
    graphItem: {type: Object as PropType<NodeT | EdgeT>, required: true},
    containerID: {type: String, required: true},
    type: {type: String, required: true},
    rawDataEnabled: {type: Boolean, required: true},
    maxHeight: {type: Number, required: true},
    pointInTime: {type: Number, required: true}
  },

  components: {
    NodeTimeseriesDataTable,
    NodeFilesDialog,
    GraphItemActions,
    TagActions
},

  data: (): GraphItemCardModel => ({
    openPanels: [0],
    dataSources: new Map(),
    users: new Map(),
    fileKey: 0,
    displayedItem: {},
    tags: [],
    copy: mdiFileDocumentMultiple,
    errorMessage: '',
  }),

  watch: {
    graphItem: {handler: 'onGraphItemChange', immediate: true, deep: true}
  },

  computed: {
    infoLabel() {
      let label = '';
      if (this.type === 'node') {
        label = this.$t('nodes.info')
      } else if (this.type === 'edge') {
        label = this.$t('edges.info')
      }
      return label;
    },
    ontologyLabel() {
      if (this.type === 'node') {
        return this.$t('classes.class')
      } else { // assume type is edge
        return this.$t('relationshipTypes.relType')
      }
    },
    getDataSource() {
      const sourceName = (this.dataSources.get(this.displayedItem.data_source_id!))?.name;
      return `${sourceName} (${this.displayedItem.data_source_id})`;
    },
    propertyHeaders() {
      return [
        {text: this.$t('general.name'), value: 'key'},
        {text: this.$t('general.value'), value: 'value'}
      ];
    },
    historyLabel() {
      // this.t nodes.history or edges.history
      if (this.type === 'node') {
        return this.$t('nodes.history')
      } else { // assume type is edge
        return this.$t('edges.history')
      }
    },
    helpLabel() {
      if (this.type === 'node') {
        return this.$t('help.selectNodeInfo')
      } else { // assume type is edge
        return this.$t('help.selectEdgeInfo')
      }
    },
    tagHeaders() {
      return [
        {text: this.$t('general.id'), value: 'id', sortable: false},
        {text: this.$t('tags.name'), value: 'tag_name'},
        {text: this.$t('general.actions'), value: 'actions', sortable: false}
      ]
    },
  },

  methods: {
    async getInfo(itemID: string, index?: number, update?: boolean) {
      let history: NodeT[] | EdgeT[];
      if (this.type === 'node') {
        history = await this.$client.retrieveNodeHistory(this.containerID, itemID);
      } else { // assume type is edge
        history = await this.$client.retrieveEdgeHistory(this.containerID, itemID);
      }
      const indexExpression = index !== undefined ? index : (history.length - 1);
      let graphItem = history[indexExpression];

      // if there are more than one historical objects, ensure that the displayed object
      // existed at or before the given pointInTime
      // if an index is specified, assume the user wants to see that index, so skip this
      // if "update" is specified, assume there was a recent update and we need to use
      // the latest object
      if (history.length > 1 && index === undefined && !update) {
        for(const historicalItem of history) {
          if (new Date(historicalItem.created_at).getTime() <= this.pointInTime) {
            graphItem = historicalItem
          }
        }
      }

      this.displayedItem = {
        id: graphItem.id,
        container_id: this.containerID,
        data_source_id: graphItem.data_source_id,
        import_data_id: graphItem.import_data_id,
        type_mapping_transformation_id: graphItem.type_mapping_transformation_id,
        data_staging_id: graphItem.data_staging_id,
        properties: graphItem.properties ? graphItem.properties : [],
        created_by: graphItem.created_by,
        created_at: this.$utils.formatISODate(graphItem.created_at),
        modified_at: this.$utils.formatISODate(graphItem.modified_at),
        history,
        metadata_properties: graphItem.metadata_properties ?? null,
      }

      if (this.rawDataEnabled) {
        this.displayedItem.raw_data = graphItem['raw_data_properties' as keyof object];
      }

      if (this.type === 'node') {
        this.displayedItem.metatype = {
          id: (this.graphItem as NodeT).metatype_id || (this.graphItem as NodeT).metatype?.id,
          name: (this.graphItem as NodeT).metatype_name
        }
        this.displayedItem.ontology_name = (this.graphItem as NodeT).metatype_name;
      }

      if (this.type === 'edge') {
        this.displayedItem.metatype_relationship = {
          name: (this.graphItem as EdgeT).metatype_relationship_name,
          id: (this.graphItem as EdgeT).relationship_id
        }
        this.displayedItem.origin_id = (this.graphItem as EdgeT).origin_id
        this.displayedItem.destination_id = (this.graphItem as EdgeT).destination_id
        this.displayedItem.relationship_pair_id = (this.graphItem as EdgeT).relationship_pair_id
        this.displayedItem.ontology_name = (this.graphItem as EdgeT).metatype_relationship_name;
      }

      if (this.type === 'node') {
        this.$emit('resetNode', itemID);
      }

      this.loadTags();
    },
    getCreatedBy(item?: any) {
      const createdBy = item !== undefined ? item : this.displayedItem.created_by;
      const userName = (this.users.get(createdBy))?.display_name ?? '';
      return `${userName} (${createdBy})`;
    },
    async updateGraphItem() {
      await this.getInfo(this.displayedItem.id, undefined, true);
    },
    refreshFiles() {
      this.fileKey += 1;
    },
    deleteGraphItem(itemID: string) {
      const toDelete = {
        type: this.type,
        id: itemID
      }
      this.$emit('deleteGraphItem', toDelete);
    },
    async onGraphItemChange(item: NodeT | EdgeT) {
      this.openPanels = [0];
      await this.getInfo(item.id!);
    },
    copyID(id: string) {
      navigator.clipboard.writeText(id)
    },
    loadTags() {
      if (this.type === 'node') {
        this.loadNodeTags()
      } else if (this.type === 'edge') {
        this.loadEdgeTags()
      }
    },
    loadNodeTags() {
      this.$client.listTagsForNode(this.containerID, this.graphItem.id)
        .then((tags) => {
          this.tags = tags;
        })
        .catch(e => this.errorMessage = e)
    },
    loadEdgeTags() {
      this.$client.listTagsForEdge(this.containerID, this.graphItem.id)
        .then((tags) => {
          this.tags = tags;
        })
        .catch(e => this.errorMessage = e)
    }
  },

  async mounted() {
    // create a map of datasourceIDs and names
    const sources = await this.$client.listDataSources(this.containerID);

    for (const source of sources) {
      if (source.id !== undefined) {
        this.dataSources.set(source.id, source)
      }
    }

    // create a map of users
    const users = await this.$client.listUsersInContainer(this.containerID);

    for (const user of users) {
      if (user.id !== undefined) {
        this.users.set(user.id, user)
      }
    }

    await this.getInfo(this.graphItem.id!);

    this.loadTags();
  }
});
</script>

<style lang="scss" scoped>
.height-full {
  height: 100% !important;
}

$list-item-icon-margin: 0 px;

</style>