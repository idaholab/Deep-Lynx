<template>
  <DialogBasic
    ref="dialog"
    :max-width="maxWidth"
    :icon-name="config.icon"
    :icon="icon"
    :title="config.title"
    @closeDialog="resetDialog"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"/>
      <success-banner :message="successMessage"/>
      <template v-if="(mode === 'add' || mode === 'edit')">
        <v-row>
          <v-col :cols="4" v-if="mode === 'add'">
            <v-autocomplete
              v-model="newProperty.key"
              :items="keys"
              item-text="name"
              item-value="property_name"
              :label="$t('general.key')"
              @change="getKey"
            />
          </v-col>

          <v-col :cols="2" v-if="mode === 'add'">
            <v-text-field
              v-model="newProperty.type"
              :label="$t('general.type')"
              disabled
            />
          </v-col>

          <v-col :cols="valueCols">
            <v-text-field
              v-model="newProperty.value"
              :label="$t('general.value')"
            />
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">{{ $t('warnings.deleteProperty') }}</v-alert>
          </v-col>
        </v-row>
      </template>
    </template>

    <template #actions>
      <v-btn v-if="mode === 'add'" 
        color="primary" 
        text 
        @click="addProperty"
      >{{ $t('general.save') }}</v-btn>

      <v-btn v-if="mode === 'edit'" 
        color="primary" 
        text 
        @click="editProperty"
      >{{ $t('general.save') }}</v-btn>

      <v-btn v-if="mode === 'delete'"
        color="primary"
        text
        @click="deleteProperty"
      >{{ $t('general.delete') }}</v-btn>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import { MetatypeKeyT, MetatypeRelationshipKeyT, PropertyT } from '@/api/types';

  interface PropertyActionsModel {
    config: {
      icon?: string;
      title?: string;
    }
    errorMessage: string;
    successMessage: string;
    newProperty: PropertyT;
    valueCols: number;
  }

  export default Vue.extend({
    name: 'PropertyActions',

    components: {DialogBasic},

    props: {
      property: {type: Object as PropType<PropertyT>, required: false},
      keys: {
        type: Array as PropType<MetatypeKeyT[] | MetatypeRelationshipKeyT[]>, 
        required: false
      },
      mode: {type: String, required: true},
      icon: {type: Boolean, required: false, default: true},
      maxWidth: {type: String, required: false, default: '50%'},
    },

    data: (): PropertyActionsModel => ({
      errorMessage: "",
      successMessage: "",
      newProperty: {key: '', type: '', value: ''},
      config: {},
      valueCols: 6
    }),

    methods: {
      getKey(key: string) {
        const filtered = (this.keys as any[]).filter((k) => {
          return k.property_name === key;
        });
        if (filtered.length > 0) this.newProperty.type = filtered[0].data_type
      },
      addProperty() {
        this.$emit('propertyAdded', this.newProperty);
        this.closeDialog();
      },
      editProperty() {
        this.$emit('propertyEdited', this.newProperty);
        this.closeDialog();
      },
      deleteProperty() {
        this.$emit('propertyDeleted', this.property);
        this.closeDialog();
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
        this.newProperty = {key: '', type: '', value: ''};
        if (this.mode === 'edit') {
          this.newProperty = JSON.parse(JSON.stringify(this.property));
          this.valueCols = 12;
        }
      }
    },

    beforeMount() {
      switch(this.mode) {
        case 'add': {
          this.config.title = this.$t('properties.add');
          break;
        }
        case 'edit': {
          this.config.title = `${this.$t('properties.edit')} ${this.property.key}`;
          this.config.icon = 'mdi-pencil';
          break;
        }
        case 'delete': {
          this.config.title = this.$t('properties.delete');
          this.config.icon = 'mdi-delete';
          break;
        }
        default: {
          break;
        }
      }
    }
  })
</script>