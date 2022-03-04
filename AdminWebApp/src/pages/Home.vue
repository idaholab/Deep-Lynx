<template>
  <div v-if="container">
    <error-banner :message="errorMessage"></error-banner>
    <v-navigation-drawer
        v-model="drawer"
        app
        class="grey--text text--darken-2 d-flex"
    >
      <div class="mt-4">
        <v-avatar tile height="25" width="25" class="mt-n1">
          <img src="../assets/data-orange.png">
        </v-avatar>
        <h1 class="text-h1 d-inline">Deep Lynx</h1>
      </div>
      <div class="mx-3">
        <v-divider class="my-4"></v-divider>
        <h2 class="text-h5 pb-0" style="line-height: 1rem">Current Container</h2>
        <p>{{container.name}}</p>
        <p>{{$t('home.id')}}# {{container.id}}</p>
        <v-divider class="my-4"></v-divider>
        <span class="d-block">{{user.display_name}}</span>
        <span class="d-block text-h6" style="line-height: .875rem">{{user.email}}</span>
      </div>
      <v-list dense class="nav-drawer-accordion mt-2">
        <v-list-item link @click="setActiveComponent('dashboard')">
          <v-list-item-content>
            <v-list-item-title>{{$t("Dashboard")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-group :value="false" dense>
          <template v-slot:activator>
            <v-list-item-title>{{$t("home.taxonomy")}}</v-list-item-title>
          </template>

          <v-list-item two-line link
                       v-if="$auth.Auth('ontology', 'read', containerID)"
                       @click="setActiveComponent('metatypes')"
                       :input-value="currentMainComponent === 'Metatypes'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.metatypes")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.metatypesDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item two-line link
                       v-if="$auth.Auth('ontology', 'read', containerID)"
                       @click="setActiveComponent('metatype-relationships')"
                       :input-value="currentMainComponent === 'MetatypeRelationships'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.metatypeRelationships")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.metatypeRelationshipsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item two-line link
                       v-if="$auth.Auth('ontology', 'read', containerID)"
                       @click="setActiveComponent('metatype-relationship-pairs')"
                       :input-value="currentMainComponent === 'MetatypeRelationshipPairs'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.metatypeRelationshipPairs")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.metatypeRelationshipPairsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item two-line link
                       v-if="$auth.Auth('ontology', 'read', containerID) && $store.getters.ontologyVersioningEnabled"
                       @click="setActiveComponent('ontology-versioning')"
                       :input-value="currentMainComponent === 'OntologyVersioning'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.ontologyVersioning")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.ontologyVersioningDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item two-line link
                       v-if="$auth.Auth('ontology', 'read', containerID)"
                       @click="setActiveComponent('ontology-update')"
                       :input-value="currentMainComponent === 'OntologyUpdate'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.ontologyUpdate")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.ontologyUpdateDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

        </v-list-group>

        <v-list-group :value="false" dense>
          <template v-slot:activator>
            <v-list-item-title>{{$t("home.data")}}</v-list-item-title>
          </template>

          <v-list-item two-line link
                       v-if="$auth.Auth('data', 'write', containerID)"
                       @click="setActiveComponent('data-query')"
                       :input-value="currentMainComponent === 'DataQuery'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataQuery")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataQueryDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item two-line link
                       v-if="$auth.Auth('data', 'write', containerID)"
                       @click="setActiveComponent('data-sources')"
                       :input-value="currentMainComponent === 'DataSources'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataSources")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataSourcesDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item two-line link
                       v-if="$auth.Auth('data', 'write', containerID)"
                       @click="setActiveComponent('data-test-creation')"
                       :input-value="currentMainComponent === 'DataTestCreation'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataTest")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataTestDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item two-line link
                       v-if="$auth.Auth('data', 'read', containerID)"
                       @click="setActiveComponent('data-imports')"
                       :input-value="currentMainComponent === 'DataImports'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataImports")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataImportsDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item two-line link
                       v-if="$auth.Auth('data','write', containerID)"
                       @click="setActiveComponent('data-mapping')"
                       :input-value="currentMainComponent === 'DataMapping'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataMapping")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataMappingDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item two-line link
                       v-if="$auth.Auth('data', 'write', containerID)"
                       @click="setActiveComponent('data-export')"
                       :input-value="currentMainComponent === 'DataExport'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.dataExport")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.dataExportDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

        </v-list-group>

        <v-list-group :value="false" v-if="$auth.Auth('users', 'read', containerID)" dense>
          <template v-slot:activator>
            <v-list-item-title>{{$t("home.containerAdministration")}}</v-list-item-title>
          </template>
          <v-list-item two-line link
                       v-if="$auth.Auth('users', 'write', containerID)"
                       @click="setActiveComponent('container-users')"
                       :input-value="currentMainComponent === 'ContainerUsers'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.containerUsers")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("home.containerUsersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-group :value="false" v-if="$auth.IsAdmin()">   <!-- TODO: correct to use auth function -->
          <template v-slot:activator>
            <v-list-item-title >{{$t("home.administration")}}</v-list-item-title>
          </template>

          <v-list-item  two-line link @click="setActiveComponent('containers')" :input-value="currentMainComponent === 'Metatypes'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.containers")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.containersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item  two-line link @click="setActiveComponent('users')" :input-value="currentMainComponent === 'Metatypes'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.users")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.usersDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-group :value="false" >
          <template v-slot:activator>
            <v-list-item-title >{{$t("home.accessManagement")}}</v-list-item-title>
          </template>

          <v-list-item  two-line link @click="setActiveComponent('api-keys')" :input-value="currentMainComponent === 'ApiKeys'">
            <v-list-item-content>
              <v-list-item-title>{{$t("home.apiKeys")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("home.apiKeysDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-item link @click="containerSelect">
          <v-list-item-content>
            <v-list-item-title>{{$t("home.changeContainer")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <!--
        <v-list-item link @click="setActiveComponent('settings')" :input-value="currentMainComponent === 'Settings'">
          <v-list-item-content>
            <v-list-item-title>{{$t("home.settings")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        -->

        <v-list-item link @click="logout">
          <v-list-item-content>
            <v-list-item-title>{{$t("home.logout")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <template v-slot:append>
        <v-container class="justify-end">
          <span class="d-block text-h6">&copy; 2021 Idaho National Laboratory</span>
        </v-container>
      </template>
    </v-navigation-drawer>

    <v-app-bar
        app
        color="secondary"
        dark
    >
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-title class="pl-0">{{componentName}}</v-toolbar-title>
      <v-spacer></v-spacer>

      <language-select class="pt-2" style="max-width:125px;"></language-select>
    </v-app-bar>

    <container-alert-banner :containerID="containerID"></container-alert-banner>

    <v-main style="padding: 64px 0px 36px 36px">
      <v-container v-if="currentMainComponent && currentMainComponent !== ''">
        <!-- we provide both containerID and container as some of the components require either/or or both -->
        <component v-bind:is="currentMainComponent" :containerID="containerID" :container="container" :argument="argument"></component>
      </v-container>
      <v-container v-else>
        <v-row>
          <v-col :lg="6" :md="6">
            <v-card>
              <v-card-title>{{$t('home.welcomeCardTitle')}}</v-card-title>
              <v-card-text>{{$t('home.welcomeCardText')}}</v-card-text>
              <v-card-actions><p><a :href="welcomeLink">{{$t('home.welcomeCardLinkText')}}</a></p></v-card-actions>
            </v-card>
          </v-col>
          <v-col :lg="6" :md="6">
            <v-card>
              <v-card-title>{{$t('home.ontologyCardTitle')}}</v-card-title>
              <v-card-text v-if="!ontologyPopulated">{{$t('home.ontologyCardText')}}</v-card-text>
              <v-card-actions v-if="!ontologyPopulated">
                <p><a :href="ontologyLinkOne">{{$t('home.ontologyCardLinkText1')}}</a></p>
              </v-card-actions>

              <v-card-text v-if="ontologyPopulated">
                <v-row>
                  <v-col :cols="12">
                    <h3>{{$t('home.metatypes')}}</h3>
                    <p>{{metatypesCount}}</p>
                  </v-col>
                  <v-col :cols="12">
                    <h3>{{$t('home.relationships')}}</h3>
                    <p>{{relationshipCount}}</p>
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions>

                <p><a @click="currentMainComponent = 'Metatypes'">{{$t('home.ontologyCardLinkText2')}}</a></p>
              </v-card-actions>
            </v-card>
          </v-col>
          <v-col :lg="6" :md="6">
            <v-card>
              <v-card-title>{{$t('home.setupDataSourceCardTitle')}}</v-card-title>
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
              <v-card-actions><p><a @click="currentMainComponent='DataSources'">{{$t('home.setupDataSourceCardLinkText')}}</a></p></v-card-actions>
            </v-card>
          </v-col>
          <v-col :lg="6" :md="6">
            <v-card>
              <v-card-title>{{$t('home.inviteUserCardTitle')}}</v-card-title>
              <v-card-text>{{$t('home.inviteUserCardText')}}</v-card-text>
              <v-card-actions><p><a @click="currentMainComponent='ContainerUsers'">{{$t('home.inviteUserCardLinkText')}}</a></p></v-card-actions>
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
import DataTestCreation from "@/views/DataTestCreation.vue"
import DataMapping from "@/views/DataMapping.vue"
import Settings from "@/views/Settings.vue"
import Users from "@/views/Users.vue"
import ContainerUsers from "@/views/ContainerUsers.vue"
import Containers from "@/views/Containers.vue"
import ApiKeys from "@/views/ApiKeys.vue";
import LanguageSelect from "@/components/languageSelect.vue";
import ContainerSelect from "@/components/containerSelect.vue"
import {TranslateResult} from "vue-i18n";
import {UserT} from "@/auth/types";
import {ContainerT, DataSourceT} from "@/api/types";
import Config from "@/config";
import OntologyVersioning from "@/views/OntologyVersioning.vue";
import ContainerAlertBanner from "@/components/containerAlertBanner.vue";

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
    DataTestCreation,
    DataMapping,
    Settings,
    ContainerUsers,
    Users,
    Containers,
    OntologyVersioning,
    ContainerAlertBanner
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

  metatypesCount = 0
  relationshipCount = 0
  dataSources: DataSourceT[] = []

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
        .catch(e => this.errorMessage = e)

    this.$client.listMetatypes(this.containerID as string, {
      count: true,
    })
        .then(metatypesCount => {
          this.metatypesCount = metatypesCount as number
        })

    this.$client.listMetatypeRelationshipPairs(this.containerID as string, {
      count: true,
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

       case "data-test-creation": {
        this.currentMainComponent = "DataTestCreation";
        this.componentName = "Test Data"
        this.$router.replace(`/containers/${this.containerID}/data-test-creation`)
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

<style lang="scss">
.nav-drawer-accordion.v-list {
  .theme--light.v-list-item:not(.v-list-item--active):not(.v-list-item--disabled) {
    color: darken($darkgray, 25%)!important;
    background-color: $lightgray!important;
    margin-bottom: 1px;
    transition: background-color .1s;

    .theme--light.v-icon {
      color: darken($darkgray, 25%)!important;

    }
  }

  .theme--light.v-list-item .v-list-item__subtitle {
    color: unset!important;
  }

  &-group__items {
    margin:10px;

    .theme--light.v-list-item:not(.v-list-item--active):not(.v-list-item--disabled) {
      color: darken($darkgray, 25%)!important;
      background-color: white!important;
      transition: background-color .1s, color .1s;

      .v-list-item__subtitle {
        color: darken($lightgray, 15%)!important;
        transition: color .1s;
      }
    }
  }

  .theme--light.v-list-item--active,
  .theme--light.v-list-item--active:hover,
  .theme--light.v-list-item--active:before,
  .theme--light.v-list-item--active:hover:before,
  .theme--light.v-list-item--active::before,
  .theme--light.v-list-item--active:hover::before,
  &-item--link:active,
  &-item--link:active:before,
  &-group__header.v-list-item--active:not(:hover):not(:focus) {
    color: white;
    background-color: $darkgray;
    transition: background-color .1s, color .1s;

    & > .v-list-item__subtitle {
      color: white;
      transition: color .1s;
    }
  }

  &-item--active .v-icon {
    color: white!important;

  }
}
</style>
