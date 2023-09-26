<template>
  <DialogBasic
    ref="dialog"
    :icon-name="config.icon"
    :max-width="maxWidth"
    :icon="icon"
    :title="config.title"
    :button-title="config.button ?? config.title"
    :button-color="config.buttonColor ?? 'primary'"
    @closeDialog="resetDialog"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>
      <success-banner :message="successMessage"/>
      <template v-if="mode === 'edit'">
        <v-col :cols="12">
          <v-data-table
            :headers="headers()"
            :items="properties"
            :disable-pagination="true"
            :hide-default-footer="true"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat color="white">
                <v-toolbar-title>{{ $t('properties.properties') }}</v-toolbar-title>
                <v-divider class="mx-4" inset vertical/>
                <v-spacer></v-spacer>
                <PropertyActions
                  :keys="keys"
                  mode="add"
                  :icon="false"
                  @propertyAdded="addProperty"
                />
              </v-toolbar>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
              <PropertyActions
                :property="item"
                mode="edit"
                max-width="50%"
                @propertyEdited="editProperty"
              />
              <PropertyActions
                :property="item"
                mode="delete"
                @propertyDeleted="deleteProperty"
              />
            </template>
          </v-data-table>
        </v-col>
        <v-col :cols="12">
          <v-checkbox
            v-model="alterCreatedAt"
            :label="$t('general.alterCreatedAt')"
            v-observe-visibility="loadDatePickr"
          />
          <div  v-show="alterCreatedAt">
            <div class="d-block">
              <label for="createdAtDate" style="padding-right: 4px">{{$t('general.createdAt')}}: </label>
              <input type="text" :placeholder="$t('timeseries.selectDate')" id="createdAtDate" />
            </div>
          </div>
        </v-col>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">{{deleteWarning}}</v-alert>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <v-btn v-if="mode === 'edit'"
        color="primary" 
        text 
        @click="updateItem"
      >{{ $t('general.save') }}</v-btn>

      <v-btn v-if="mode === 'delete'"
        color="primary"
        text
        @click="deleteItem"
      >{{ $t('general.delete') }}</v-btn>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import flatpickr from 'flatpickr';
  import { EdgeT, MetatypeKeyT, MetatypeRelationshipKeyT, NodeT, PropertyT } from '@/api/types';
  import PropertyActions from './PropertyActions.vue';

  interface GraphItemActionsModel {
    config: {
      icon?: string
      title?: string
      button?: string
      buttonColor?: string
    }
    errorMessage: string
    successMessage: string
    alterCreatedAt: boolean;
    createdAtDate: string;
    properties: PropertyT[];
    addPropertyDialog: boolean;
    newProperty: PropertyT;
    keys: MetatypeKeyT[] | MetatypeRelationshipKeyT[];
    propsToSave: {[key: string]: any};
    toSave: {[key: string]: any};
  }

  export default Vue.extend({
    name: 'GraphItemActions',

    components: {
      DialogBasic,
      PropertyActions
    },

    props: {
      type: {type: String, required: true},
      containerID: {type: String, required: true},
      maxWidth: {type: String, required: false, default: '80%'},
      icon: {type: Boolean, required: false, default: true},
      graphItem: {type: Object as PropType<NodeT | EdgeT>, required: true},
      mode: {type: String, required: true},
    },

    data: (): GraphItemActionsModel => ({
      config: {},
      errorMessage: "",
      successMessage: "",
      alterCreatedAt: false,
      createdAtDate: new Date().toISOString(),
      properties: [],
      addPropertyDialog: false,
      newProperty: {key: '', value: '', type: ''},
      keys: [],
      propsToSave: {},
      toSave: {},
    }),

    watch: {
      graphItem: {
        handler: 'loadDialog', 
        immediate: true, 
        deep: true}
    },

    computed: {
      displayName() {
        let itemName = this.graphItem.id;
        if (this.graphItem.properties && (this.graphItem.properties as any).name) {
          itemName = (this.graphItem.properties as any).name;
        }
        const ontologyName = this.type === 'node'
          ? (this.graphItem as NodeT).metatype?.name
          : (this.graphItem as EdgeT).metatype_relationship?.name;

        return `${itemName} (${ontologyName})`;
      },
      deleteWarning() {
        let warning = '';
        if (this.type === 'node') {
          warning = this.$t('warnings.deleteNode');
        } else if (this.type === 'edge') {
          warning = this.$t('warnings.deleteEdge');
        }
        return warning;
      }
    },

    methods: {
      headers() {
        return  [
          { text: this.$t('general.name'), value: 'key'},
          { text: this.$t('general.value'), value: 'value'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      loadDatePickr() {
        const createdAtPickr = flatpickr('#createdAtDate', {
          altInput: true,
          altFormat: 'F j, y h:i:S K',
          dateFormat: 'Z',
          enableTime: true,
          enableSeconds: true,
          allowInput: true,
        }) as flatpickr.Instance;

        (createdAtPickr as flatpickr.Instance).config.onChange.push((selectedDates, dateStr) => {
          this.createdAtDate = dateStr;
        });
        (createdAtPickr as flatpickr.Instance).setDate(this.createdAtDate);
      },
      addProperty(property: PropertyT) {
        this.properties.push(property)
      },
      editProperty(property: PropertyT) {
        this.properties = this.properties.map((p: PropertyT) => {
          return p.key === property.key ? property : p;
        });
      },
      deleteProperty(property: PropertyT) {
        this.properties = this.properties.filter(( p: PropertyT ) => {
          return p.key !== property.key && p.value !== property.value;
        });
      },
      setProperties() {
        this.propsToSave = {};
        const entries: {[key: string]: any} = {};

        this.properties.forEach((property: any) => {
          let propType = '';
          // look at supplied data type to determine property value changes
          // types: ['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean', 'enumeration', 'file', 'list', 'unknown']
          const key = (this.keys as any[]).filter((k) => {
            return k.property_name === property.key
          });
          if (key.length > 0) {propType = key[0].data_type;}

          if (propType === 'boolean') {
            if (String(property.value).toLowerCase() === 'true') {
              property.value = true;
            } else if (String(property.value).toLowerCase() === 'false') {
              property.value = false;
            } else if (String(property.value) === "" || String(property.value) === "null") {
              property.value = undefined;
            }
          } else if (propType === 'number' || propType === 'number64') {
            property.value = parseInt(property.value);
          } else if (propType === 'float' || propType === 'float64') {
            property.value = parseFloat(property.value);
          } else if (propType === 'list') {
            property.value = property.value.split(',');
          }

          entries[property.key] = property.value;
        });

        this.propsToSave = entries;
      },
      deleteItem() {
        this.$emit('deleteGraphItem', this.graphItem.id);
      },
      updateItem() {
        this.setProperties();
        this.toSave = {
          "id": this.graphItem.id,
          "container_id": this.containerID,
          "data_source_id": this.graphItem.data_source_id,
          "import_data_id": this.graphItem.import_data_id,
          "type_mapping_transformation_id": this.graphItem.type_mapping_transformation_id,
          "data_staging_id": this.graphItem.data_staging_id,
          "metadata": this.graphItem.metadata,
          "properties": this.propsToSave,
        }
        if (this.alterCreatedAt) this.toSave.created_at = this.createdAtDate;

        if (this.type === 'node') {
          this.updateNode()
        } else if (this.type === 'edge') {
          this.updateEdge()
        }
      },
      updateNode() {
        this.toSave.original_data_id = (this.graphItem as NodeT).original_data_id;
        this.toSave.metatype_id = (this.graphItem as NodeT).metatype_id ?? (this.graphItem as NodeT).metatype!.id;

        this.$client.createOrUpdateNode(this.containerID, this.toSave)
          .then((results: NodeT[]) => {
            this.closeDialog();
            const emitNode = results[0];
            emitNode.metatype_id = (this.graphItem as NodeT).metatype_id ?? (this.graphItem as NodeT).metatype!.id;
            emitNode.metatype_name = (this.graphItem as NodeT).metatype_name ?? (this.graphItem as NodeT).metatype!.name;
            this.$emit('updated', emitNode);
          })
          .catch(e => this.errorMessage = this.$t('errors.errorsCommunicating') as string + e);
      },
      updateEdge() {
        this.toSave.metatype_relationship = (this.graphItem as EdgeT).metatype_relationship;
        this.toSave.relationship_pair_id = (this.graphItem as EdgeT).relationship_pair_id;
        this.toSave.origin_id = (this.graphItem as EdgeT).origin_id;
        this.toSave.destination_id = (this.graphItem as EdgeT).destination_id;
        this.toSave.relationship_id = (this.graphItem as EdgeT).relationship_id ?? (this.graphItem as EdgeT).metatype_relationship!.id;
        this.toSave.relationship_name = (this.graphItem as EdgeT).metatype_relationship_name ?? (this.graphItem as EdgeT).metatype_relationship!.name;

        this.$client.createEdge(this.containerID, this.toSave)
          .then((results: EdgeT[]) => {
            this.closeDialog();
            const emitEdge = results[0];
            emitEdge.relationship_id = (this.graphItem as EdgeT).relationship_id ?? (this.graphItem as EdgeT).metatype_relationship!.id;
            emitEdge.metatype_relationship_name = (this.graphItem as EdgeT).metatype_relationship_name ?? (this.graphItem as EdgeT).metatype_relationship!.name;
            this.$emit('updated', emitEdge);
          });
      },
      async refreshKeys() {
        if (this.type === 'node' && (this.graphItem as NodeT).metatype && (this.graphItem as NodeT).metatype!.id) {
          this.keys = await this.$client.listMetatypeKeys(this.containerID, (this.graphItem as NodeT).metatype!.id!);
        } else if (this.type === 'edge' && (this.graphItem as EdgeT).metatype_relationship && (this.graphItem as EdgeT).metatype_relationship!.id) {
          this.keys = await this.$client.listMetatypeRelationshipKeys(this.containerID, (this.graphItem as EdgeT).metatype_relationship!.id!);
        }
      },
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) {dialogInstance.close()}
      },
      openDialog() {
        this.$nextTick(() => {
          this.resetDialog();
        });
      },
      resetDialog() {
        this.errorMessage = "";
        this.successMessage = "";
        this.refreshKeys();
        this.toSave = {};
        this.propsToSave = {};
      },
      loadDialog() {
        if (this.mode === 'edit') {
          this.config.title = `${this.$t('general.edit')} ${this.displayName}`;
          if (this.type === 'node') {
            this.config.button = this.$t('nodes.edit');
          } else if (this.type === 'edge') {
            this.config.button = this.$t('edges.edit');
          }

          this.properties = Object.keys(this.graphItem.properties).map((k) => {
            return {key: k, type: '', value: this.graphItem.properties[k as keyof object]}
          });
        } else if (this.mode === 'delete') {
          this.config.title = `${this.$t('general.delete')} ${this.displayName}`;
          if (this.type === 'node') {
            this.config.button = this.$t('nodes.delete');
          } else if (this.type === 'edge') {
            this.config.button = this.$t('edges.delete');
          }
          this.config.buttonColor = 'error';
        }
      }
    },

    beforeMount() {
      this.loadDialog()
    }
  })
</script>