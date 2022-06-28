<template>
  <div v-if="container">
    <error-banner :message="errorMessage"></error-banner>
    <v-app-bar
      app
      color="secondary"
      flat
      dark
    >
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-title class="pl-0">{{componentName}}</v-toolbar-title>
      <v-spacer></v-spacer>

      <language-select class="pt-2" style="max-width:125px;"></language-select>
    </v-app-bar>
    <v-navigation-drawer
      v-model="drawer"
      app
      flat
      mobile-break-point="960"
      width="260"
      class="grey--text text--darken-2"
    >
      <div class="logo-div d-flex align-center pa-1">
        <v-avatar tile height="25" width="25">
          <img src="../assets/data-white.png">
        </v-avatar>
        <h1 class="text-h1 d-inline white--text">Deep Lynx</h1>
      </div>

      <v-list dense class="nav-drawer-accordion pa-0">
        <v-list-item
          link
          @click="setActiveComponent('dashboard')"
          :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("Dashboard")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-group :value="false" dense :ripple="{class:'list-ripple'}">
          <template v-slot:activator>
            <v-list-item-title>{{$t("home.taxonomy")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('metatypes')"
            :input-value="currentMainComponent === 'Metatypes'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.metatypes")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.metatypesDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('metatype-relationships')"
            :input-value="currentMainComponent === 'MetatypeRelationships'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.metatypeRelationships")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.metatypeRelationshipsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('metatype-relationship-pairs')"
            :input-value="currentMainComponent === 'MetatypeRelationshipPairs'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.metatypeRelationshipPairs")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.metatypeRelationshipPairsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID) && $store.getters.ontologyVersioningEnabled"
            @click="setActiveComponent('ontology-versioning')"
            :input-value="currentMainComponent === 'OntologyVersioning'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.ontologyVersioning")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.ontologyVersioningDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('ontology-update')"
            :input-value="currentMainComponent === 'OntologyUpdate'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.ontologyUpdate")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.ontologyUpdateDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

        </v-list-group>

        <v-list-group
          :value="false"
          dense
          :ripple="{class:'list-ripple'}"
        >
          <template v-slot:activator>
            <v-list-item-title>{{$t("home.data")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('data-query')"
            :input-value="currentMainComponent === 'DataQuery'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataQuery")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataQueryDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('data-sources')"
            :input-value="currentMainComponent === 'DataSources'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataSources")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataSourcesDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('data-management')"
            :input-value="currentMainComponent === 'DataManagement'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataManagement")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataManagementDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data', 'read', containerID)"
            @click="setActiveComponent('data-imports')"
            :input-value="currentMainComponent === 'DataImports'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataImports")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataImportsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data','write', containerID)"
            @click="setActiveComponent('data-mapping')"
            :input-value="currentMainComponent === 'DataMapping'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataMapping")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataMappingDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            two-line link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('data-export')"
            :input-value="currentMainComponent === 'DataExport'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataExport")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataExportDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

        </v-list-group>

        <v-list-group
          :value="false"
          v-if="$auth.Auth('users', 'read', containerID)"
          dense
          :ripple="{class:'list-ripple'}"
        >
          <template v-slot:activator>
            <v-list-item-title>{{$t("home.containerAdministration")}}</v-list-item-title>
          </template>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('users', 'write', containerID)"
            @click="setActiveComponent('container-users')"
            :input-value="currentMainComponent === 'ContainerUsers'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.containerUsers")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.containerUsersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('users', 'write', containerID)"
            @click="setActiveComponent('settings')"
            :input-value="currentMainComponent === 'Settings'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.settings")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.settingsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-group
          :value="false"
          v-if="$auth.IsAdmin()"
          :ripple="{class:'list-ripple'}"
        >   <!-- TODO: correct to use auth function -->
          <template v-slot:activator>
            <v-list-item-title >{{$t("home.administration")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            @click="setActiveComponent('containers')"
            :input-value="currentMainComponent === 'Containers'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.containers")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.containersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            @click="setActiveComponent('users')"
            :input-value="currentMainComponent === 'Users'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.users")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.usersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-group
          :value="false"
          :ripple="{class:'list-ripple'}"
        >
          <template v-slot:activator>
            <v-list-item-title >{{$t("home.accessManagement")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            @click="setActiveComponent('api-keys')"
            :input-value="currentMainComponent === 'ApiKeys'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.apiKeys")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.apiKeysDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
              two-line
              link
              @click="setActiveComponent('service-users')"
              :input-value="currentMainComponent === 'ServiceUsers'"
              :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("home.serviceUsers")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.serviceUsersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-item
          link
          @click="containerSelect"
          :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("home.changeContainer")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          link
          @click="logout"
          :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("home.logout")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <v-container class="pb-0">
          <v-card class=" pa-3 signed-in-info elevation-0">
            <div class="mb-3">
              <h2 class="d-block title">User</h2>
              <span class="d-block sub-title">{{user.display_name}}</span>
              <span class="d-block sub-title">{{user.email}}</span>
            </div>
            <div>
              <h2 class="d-block title">Current Container</h2>
              <span class="d-block sub-title">{{container.name}}, #{{container.id}}</span>
            </div>
          </v-card>
        </v-container>
        <v-container class="justify-end">
          <span class="d-block text-h6">&copy; {{ new Date().getFullYear() }} Idaho National Laboratory</span>
        </v-container>
      </template>
    </v-navigation-drawer>

    <container-alert-banner :containerID="containerID" :key="componentKey"></container-alert-banner>

    <v-main id="main-content-container">

      <!-- If Component: Dashboard Selected Component Page -->
      <v-container fluid v-if="currentMainComponent && currentMainComponent !== ''">
        <!-- we provide both containerID and container as some of the components require either/or or both -->
        <transition name="fade" mode="out-in">
          <component v-bind:is="currentMainComponent" :containerID="containerID" :container="container" :argument="argument"></component>
        </transition>
      </v-container>

      <!-- Else: Dashboard Landing Page -->
      <v-container fluid v-else>
        <v-row>

          <!-- Dashboard Landing Page Card: Welcome to Deep Lynx! -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('home.welcomeCardTitle')}}</v-card-title>
              <v-card-text>
                <p>{{$t('home.welcomeCardText')}}</p>
                <p><a :href="welcomeLink">{{$t('home.welcomeCardLinkText')}}</a></p>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Ontology -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('home.ontologyCardTitle')}}</v-card-title>

              <!-- If Condition: If Ontology is not populated, show default text -->
              <template v-if="!ontologyPopulated">
                <!-- <template> -->
                <v-card-text>
                  <p>{{$t('home.ontologyCardText')}}</p>
                  <p><a :href="ontologyLinkOne">{{$t('home.ontologyCardLinkText1')}}</a></p>
                </v-card-text>
              </template>

              <!-- Else Condition: If Ontology is populated, show Numbers of Metatypes and Relationships -->
              <template v-else>
                <v-card-text class="mt-4">
                  <v-row>
                    <v-col :cols="6" class="text-center">
                      <p class="text-h2 ma-2" style="line-height: unset">{{metatypesCount}}</p>
                      <h3 class="text-h3" style="line-height: unset">{{$t('home.metatypes')}}</h3>
                    </v-col>
                    <v-col :cols="6" class="text-center">
                      <p class="text-h2 ma-2" style="line-height: unset">{{relationshipCount}}</p>
                      <h3 class="text-h3" style="line-height: unset">{{$t('home.relationships')}}</h3>
                    </v-col>
                  </v-row>
                </v-card-text>
              <v-card-actions class="d-flex flex-grow-1 pa-4 justify-center align-end">
                  <v-btn color="primary" @click="currentMainComponent = 'Metatypes'">
                    {{$t('home.ontologyCardLinkText2')}}
                  </v-btn>
                </v-card-actions>
              </template>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Data Sources -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('home.setupDataSourceCardTitle')}}</v-card-title>
              <v-card-text v-if="dataSources.length <= 0">{{$t('home.setupDataSourceCardText')}}</v-card-text>
              <v-card-text v-else>
                <v-carousel
                    :cycle="true"
                    :continuous="true"
                    :hide-delimiters="true"
                    :next-icon="false"
                    :prev-icon="false"
                    :height="100"
                >
                  <v-carousel-item
                      v-for="(dataSource, i) in dataSources"
                      :key="i"
                  >
                    <h2>{{dataSource.name}}</h2>
                    <h3>{{$t('home.imported')}}</h3>
                    <p>{{dataSource.data_imported}}</p>
                  </v-carousel-item>
                </v-carousel>
              </v-card-text>
              <v-card-actions class="d-flex flex-grow-1 pa-4 justify-center align-end">
                <v-btn color="primary" @click="currentMainComponent='DataSources'">
                  {{$t('home.setupDataSourceCardLinkText')}}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Invite Users to Your Container -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('home.inviteUserCardTitle')}}</v-card-title>
              <v-card-text>{{$t('home.inviteUserCardText')}}</v-card-text>
              <v-card-actions class="d-flex flex-grow-1 pa-4 justify-center align-end">
                <v-btn color="primary" @click="currentMainComponent='ContainerUsers'">
                  {{$t('home.inviteUserCardLinkText')}}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import Metatypes from "@/views/Metatypes.vue"
import MetatypeRelationships from "@/views/MetatypeRelationships.vue"
import MetatypeRelationshipPairs from "@/views/MetatypeRelationshipPairs.vue"
import OntologyUpdate from "@/views/OntologyUpdate.vue"
import TaxonomyImport from "@/views/TaxonomyImport.vue"
import DataExplorer from "@/views/DataExplorer.vue"
import DataExport from "@/views/DataExport.vue"
import DataImports from "@/views/DataImports.vue"
import DataQuery from "@/views/DataQuery.vue"
import DataSources from "@/views/DataSources.vue"
import DataManagement from "@/views/DataManagement.vue"
import DataMapping from "@/views/DataMapping.vue"
import Settings from "@/views/Settings.vue"
import Users from "@/views/Users.vue"
import ContainerUsers from "@/views/ContainerUsers.vue"
import Containers from "@/views/Containers.vue"
import ApiKeys from "@/views/ApiKeys.vue";
import LanguageSelect from "@/components/general/languageSelect.vue";
import ContainerSelect from "@/components/ontology/containers/containerSelect.vue"
import {TranslateResult} from "vue-i18n";
import {UserT} from "@/auth/types";
import {ContainerT, DataSourceT} from "@/api/types";
import Config from "@/config";
import OntologyVersioning from "@/views/OntologyVersioning.vue";
import ContainerAlertBanner from "@/components/ontology/containers/containerAlertBanner.vue";
import ServiceUsers from "@/views/ServiceUsers.vue";

@Component({components: {
    ContainerSelect,
    ApiKeys,
    LanguageSelect,
    DataImports,
    Metatypes,
    MetatypeRelationships,
    MetatypeRelationshipPairs,
    OntologyUpdate,
    TaxonomyImport,
    DataExplorer,
    DataExport,
    DataQuery,
    DataSources,
    DataManagement,
    DataMapping,
    Settings,
    ContainerUsers,
    Users,
    Containers,
    OntologyVersioning,
    ContainerAlertBanner,
    ServiceUsers
  }})
export default class Home extends Vue {
  @Prop(String) readonly containerID: string | undefined
  @Prop(String) readonly view: string | undefined
  @Prop({default: ""}) readonly arguments!: string

  errorMessage = ""
  drawer = null
  user: UserT | null = null
  container: ContainerT | null = null
  currentMainComponent: string | null = ''
  componentName: string | TranslateResult = 'Home'
  argument: string = this.arguments
  componentKey = 0 // this is so we can force a re-render of certain components on component change - assign as key

  metatypesCount = 0
  relationshipCount = 0
  dataSources: DataSourceT[] = []

  beforeMount() {
    this.$store.dispatch('refreshCurrentOntologyVersions');
  }


  mounted() {
    this.user = this.$auth.CurrentUser();

    this.$client.retrieveContainer(this.containerID!)
        .then(container => {
          this.container = container
          this.$store.commit('setActiveContainer', this.container)

          if(this.view) {
            this.setActiveComponent(this.view)
          }
        })
        .catch(e =>this.$router.push({name: "ContainerSelect"})
)

    this.$client.listMetatypes(this.containerID as string, {
      count: true,
      ontologyVersion: this.$store.getters.currentOntologyVersionID
    })
        .then(metatypesCount => {
          this.metatypesCount = metatypesCount as number
        })

    this.$client.listMetatypeRelationshipPairs(this.containerID as string, {
      count: true,
      ontologyVersion: this.$store.getters.currentOntologyVersionID
    })
        .then(relationshipCount => {
          this.relationshipCount = relationshipCount as number
        })

    this.$client.listDataSources(this.containerID as string)
        .then(dataSources => {
          this.dataSources = dataSources

          this.dataSources.forEach((source, i) => {
            this.$client.countDataForSource(this.containerID as string, source.id as string)
            .then(count => {
              this.dataSources[i].data_imported = count
            })
          })
        })
  }

  setActiveComponent(menuIndex: string) {
    this.componentKey += 1 // increment so we force a re-render

    switch(menuIndex) {
      case "dashboard": {
        this.currentMainComponent = null
        this.componentName = this.$t('home.dashboard')
        this.$router.replace(`/containers/${this.containerID}`)
        break;
      }

      case "metatypes": {
        this.currentMainComponent = "Metatypes";
        this.componentName = this.$t('home.metatypes')
        this.$router.replace(`/containers/${this.containerID}/metatypes`)
        break;
      }

      case "metatype-relationships": {
        this.currentMainComponent = "MetatypeRelationships";
        this.componentName = this.$t('home.metatypeRelationships')
        this.$router.replace(`/containers/${this.containerID}/metatype-relationships`)
        break;
      }

      case "metatype-relationship-pairs": {
        this.currentMainComponent = "MetatypeRelationshipPairs";
        this.componentName = this.$t('home.metatypeRelationshipPairs')
        this.$router.replace(`/containers/${this.containerID}/metatype-relationship-pairs`)
        break;
      }

      case "ontology-update": {
        this.currentMainComponent = "OntologyUpdate";
        this.componentName = this.$t('home.ontologyUpdate')
        this.$router.replace(`/containers/${this.containerID}/ontology-update`)
        break;
      }

      case "taxonomy-import": {
        this.currentMainComponent = "TaxonomyImport";
        this.componentName = this.$t('home.import')
        this.$router.replace(`/containers/${this.containerID}/taxonomy-import`)
        break;
      }

      case "data-query": {
        this.currentMainComponent = "DataQuery";
        this.componentName = this.$t('home.dataQuery')
        this.$router.replace(`/containers/${this.containerID}/data-query`)
        break;
      }

      case "data-sources": {
        this.currentMainComponent = "DataSources";
        this.componentName = this.$t('home.dataSources')
        this.$router.replace(`/containers/${this.containerID}/data-sources`)
        break;
      }

      case "data-management": {
        this.currentMainComponent = "DataManagement";
        this.componentName = "Data Management"
        this.$router.replace(`/containers/${this.containerID}/data-management`)
        break;
      }

      case "data-export": {
        this.currentMainComponent = "DataExport";
        this.componentName = this.$t('home.dataExport')
        this.$router.replace(`/containers/${this.containerID}/data-export`)
        break;
      }

      case "data-explorer": {
        this.currentMainComponent = "DataExplorer";
        this.componentName = this.$t('home.dataExplorer')
        this.$router.replace(`/containers/${this.containerID}/data-explorer`)
        break;
      }

      case "data-mapping": {
        this.currentMainComponent = "DataMapping";
        this.componentName = this.$t('home.dataMapping')
        this.$router.replace(`/containers/${this.containerID}/data-mapping`)
        break;
      }

      case "data-imports": {
        this.currentMainComponent = "DataImports"
        this.componentName = this.$t('home.dataImports')
        this.$router.replace(`/containers/${this.containerID}/data-imports/${this.arguments}`)
        break;
      }

      case "settings": {
        this.currentMainComponent = "Settings";
        this.componentName = this.$t('home.settings')
        this.$router.replace(`/containers/${this.containerID}/settings`)
        break;
      }

      case "users": {
        this.currentMainComponent = "Users";
        this.componentName = this.$t('home.users')
        this.$router.replace(`/containers/${this.containerID}/users`)
        break;
      }

      case "container-users": {
        this.currentMainComponent = "ContainerUsers";
        this.componentName = this.$t('home.containerUsers')
        this.$router.replace(`/containers/${this.containerID}/container-users`)
        break;
      }

      case "containers": {
        this.currentMainComponent = "Containers"
        this.componentName = this.$t('home.containers')
        this.$router.replace(`/containers/${this.containerID}/containers`)
        break;
      }

      case "access-keys": {
        this.currentMainComponent = "AccessKeys"
        this.componentName = this.$t('home.accessKeys')
        this.$router.replace(`/containers/${this.containerID}/access-keys`)
        break;
      }

      case "api-keys": {
        this.currentMainComponent = "ApiKeys"
        this.componentName = this.$t('home.apiKeys')
        this.$router.replace(`/containers/${this.containerID}/api-keys`)
        break;
      }

      case "ontology-versioning": {
        this.currentMainComponent = "OntologyVersioning"
        this.componentName = this.$t('home.ontologyVersioning')
        this.$router.replace(`/containers/${this.containerID}/ontology-versioning`)
        break;
      }

      case "service-users": {
        this.currentMainComponent = "ServiceUsers"
        this.componentName = this.$t('home.serviceUsers')
        this.$router.replace(`/containers/${this.containerID}/service-users`)
        break;
      }

      default : {
        this.currentMainComponent = "";
        break;
      }
    }
  }

  logout() {
    this.$auth.Logout()
    window.location.href = `${Config.deepLynxApiUri}/logout?redirect_uri=${Config.appUrl}`
  }

  containerSelect() {
    this.$router.push({name: "ContainerSelect"})
  }

  get welcomeLink() {
    return this.$t('home.welcomeCardLink')
  }

  get ontologyLinkOne() {
    return this.$t('home.ontologyCardLink1')
  }

  get ontologyPopulated(): boolean {
    return this.metatypesCount > 0 && this.relationshipCount > 0
  }
}
</script>

<style lang="scss" scoped>
#main-content-container {
  max-width: 2000px;
  padding: 30px !important;
  margin: auto;
}

.fade {
  &-enter {
    opacity: 0;
    &-active {
      transition: opacity .3s;
    }
  }
  &-leave {
    &-active {
      transition: opacity .3s;
      opacity: 0;
    }
  }
}

.logo-div {
  height: 64px;
  background-color: $secondary;
}

.signed-in-info {
  background-color: lighten($lightgray, 5%);

  .sub-title {
    font-size: 0.85rem;
  }
}
.nav-drawer-accordion.v-list ::v-deep .theme--light {
  &.v-list-item:not(.v-list-item--active):not(.v-list-item--disabled) {
    color: darken($darkgray2, 20%);
    background-color: $lightgray;
    margin-bottom: 1px;
    transition: background-color .1s;
  }

  .list-ripple {
    color: $darkgray2;
  }

  .v-list-group__header__append-icon {
    svg {
      transition: fill .1s;
      fill: $darkgray2;
    }
  }

  &.v-list-item {
    &.v-list-item--active {
      background-color: lighten($darkgray2, 13%);
      transition: background-color .1s, color .1s;
      border-bottom: 1px solid white;

      .v-list-item__title, .v-list-item__subtitle {
        color: white;
      }

      &.v-list-group__header {
        background-color: $darkgray2;

        .v-list-group__header__append-icon {
          svg {
            transition: fill .1s;
            fill: white;
          }
        }
      }
    }
  }
}
</style>
