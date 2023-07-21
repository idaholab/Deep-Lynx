<template>
  <div>
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
      mobile-breakpoint="960"
      width="260"
      class="grey--text text--darken-2"
    >
      <div class="logo-div" style="display: flex; padding: 8px 12px;" @click="containerSelect">
        <img style="max-width:100%;" src="../assets/lynx-white.png">
      </div>

      <v-list dense class="nav-drawer-accordion pa-0">
        <v-list-item
          link
          @click="setActiveComponent('dashboard')"
          :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("general.dashboard")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
            link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('data-query')"
            :input-value="currentMainComponent === 'ViewDataQuery'"
            :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("query.viewer")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-group :value="false" dense :ripple="{class:'list-ripple'}">
          <template v-slot:activator>
            <v-list-item-title>{{$t("ontology.ontology")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('metatypes')"
            :input-value="currentMainComponent === 'ViewMetatypes'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("classes.classes")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("classes.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('metatype-relationships')"
            :input-value="currentMainComponent === 'ViewMetatypeRelationships'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("relationshipTypes.relTypes")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("relationshipTypes.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('metatype-relationship-pairs')"
            :input-value="currentMainComponent === 'ViewMetatypeRelationshipPairs'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("relationships.relationships")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("relationships.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID) && $store.getters.ontologyVersioningEnabled"
            @click="setActiveComponent('ontology-versioning')"
            :input-value="currentMainComponent === 'ViewOntologyVersioning'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("ontology.versioningTitle")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("ontology.versioningSubtitle")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('ontology-update')"
            :input-value="currentMainComponent === 'ViewOntologyUpdate'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("ontology.updateTitle")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("ontology.updateDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

        </v-list-group>

        <v-list-group
          :value="false"
          dense
          :ripple="{class:'list-ripple'}"
        >
          <template v-slot:activator>
            <v-list-item-title>{{$t("general.dataManagement")}}</v-list-item-title>
          </template>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('data-sources')"
            :input-value="currentMainComponent === 'DataSources'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("dataSources.dataSources")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("dataSources.description")}}</v-list-item-subtitle>
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
              <v-list-item-title>{{$t("imports.data")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("imports.description")}}</v-list-item-subtitle>
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
              <v-list-item-title>{{$t("typeMappings.typeMappings")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("typeMappings.description")}}</v-list-item-subtitle>
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
              <v-list-item-title>{{$t("exports.graph")}}-<small>{{$t("general.beta")}}</small></v-list-item-title>
              <v-list-item-subtitle>{{$t("exports.graphDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            two-line
            link
            v-if="$auth.Auth('data', 'write', containerID)"
            @click="setActiveComponent('event-actions')"
            :input-value="currentMainComponent === 'ViewEventSystem'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("events.title")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("events.actionDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
              two-line
              link
              v-if="$auth.Auth('data', 'write', containerID)"
              @click="setActiveComponent('file-manager')"
              :input-value="currentMainComponent === 'ViewFileManager'"
              :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("modelExplorer.title")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("modelExplorer.description")}}</v-list-item-subtitle>
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
            <v-list-item-title>{{$t("containers.administration")}}</v-list-item-title>
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
              <v-list-item-title>{{$t("users.containerTitle")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("users.containerDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'read', containerID)"
            @click="setActiveComponent('container-export')"
            :input-value="currentMainComponent === 'ContainerExport'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("containers.export")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("exports.containerDescription")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('ontology', 'write', containerID)"
            @click="setActiveComponent('container-import')"
            :input-value="currentMainComponent === 'ContainerImport'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("containers.import")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("imports.containerTitle")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            v-if="$auth.Auth('users', 'write', containerID)"
            @click="setActiveComponent('settings')"
            :input-value="currentMainComponent === 'ViewSettings'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("general.settings")}}</v-list-item-title>
              <v-list-item-subtitle>{{$t("containers.settings")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-group
          :value="false"
          v-if="$auth.IsAdmin()"
          :ripple="{class:'list-ripple'}"
        >
          <template v-slot:activator>
            <v-list-item-title >{{$t("general.deepLynxAdministration")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            @click="setActiveComponent('containers')"
            :input-value="currentMainComponent === 'Containers'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("containers.containers")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("containers.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            two-line
            link
            @click="setActiveComponent('users')"
            :input-value="currentMainComponent === 'ViewUsers'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("users.users")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("users.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-group
          :value="false"
          :ripple="{class:'list-ripple'}"
        >
          <template v-slot:activator>
            <v-list-item-title >{{$t("general.accessManagement")}}</v-list-item-title>
          </template>

          <v-list-item
            two-line
            link
            @click="setActiveComponent('api-keys')"
            :input-value="currentMainComponent === 'ApiKeys'"
            :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("apiKeys.personalKeys")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("apiKeys.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
              two-line
              link
              @click="setActiveComponent('service-users')"
              :input-value="currentMainComponent === 'ViewServiceUsers'"
              :ripple="{class:'list-ripple'}"
          >
            <v-list-item-content>
              <v-list-item-title>{{$t("serviceUsers.title")}}</v-list-item-title>
              <v-list-item-subtitle >{{$t("serviceUsers.description")}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>

        <v-list-item
          link
          @click="containerSelect"
          :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("containers.change")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          link
          @click="logout"
          :ripple="{class:'list-ripple'}"
        >
          <v-list-item-content>
            <v-list-item-title>{{$t("general.logout")}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <v-container class="pb-0">
          <v-card class=" pa-3 signed-in-info elevation-0">
            <div class="mb-3">
              <h2 class="d-block title">User</h2>
              <span class="d-block sub-title">{{user?.display_name}}</span>
              <span class="d-block sub-title">{{user?.email}}</span>
            </div>
            <div>
              <h2 class="d-block title">Current Container</h2>
              <span class="d-block sub-title">{{container.name}}, #{{container.id}}</span>
            </div>
          </v-card>
        </v-container>
        <v-container class="justify-end">
          <span class="d-block text-h6" style="margin-bottom: 10px">{{$t('help.foundBugs')}} <a :href="emailLink()">{{$t('help.tellUs')}}</a> </span>
          <span class="d-block text-h6" style="margin-bottom: 10px">{{$t('help.needHelp')}} <a :href="helpLink()">{{$t('general.wiki')}}</a> </span>
          <span class="d-block text-h6" style="margin-bottom: 10px">&copy; {{ new Date().getFullYear() }} {{$t('general.inl')}}</span>
          <span class="d-block text-h6" v-if="$auth.IsAdmin() && stats ">{{ stats.version }}</span>
        </v-container>
      </template>
    </v-navigation-drawer>

    <container-alert-banner :containerID="containerID" :key="componentKey"></container-alert-banner>

    <v-main id="main-content-container">

      <!-- If Component: Dashboard Selected Component Page -->
      <v-container fluid v-if="currentMainComponent && currentMainComponent !== ''">
        <!-- we provide both containerID and container as some of the components require either/or or both -->
        <transition name="fade" mode="out-in">
          <component
            :is="currentMainComponent"
            :containerID="containerID"
            :container="container"
            :argument="argument"
            :class="{
              'main-content-component-constrained':(currentMainComponent !== 'ViewDataQuery'),
              'main-content-component-unconstrained':(currentMainComponent === 'ViewDataQuery')
            }"
          />
        </transition>
      </v-container>

      <!-- Else: Dashboard Landing Page -->
      <v-container fluid v-else>
        <overview-graph :container="container"></overview-graph>

        <v-row v-if="$auth.IsAdmin() && stats !== null">
          <!-- DeepLynx Admin Statistics (only include if admin and exists) -->
          <v-col :cols="12" :md="6" :lg="6" v-if="$auth.IsAdmin() && stats.statistics?.migrations">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('statistics.migrations')}}</v-card-title>
              <v-card-text>
                <v-col :cols="12"><json-viewer :value="stats.statistics.migrations"></json-viewer></v-col>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col :cols="12" :md="6" :lg="6" v-if="$auth.IsAdmin() && stats.statistics">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('statistics.recordCounts')}}</v-card-title>
              <v-card-text>
                <v-list disabled>
                  <v-list-item-group
                    color="primary"
                  >
                    <v-list-item
                      v-for="(value, name, index) in stats.statistics"
                      :key="index"
                    >
                      <v-list-item-content v-if="name !== 'migrations'">
                        <p style="line-height: 1.5">
                          <strong style="">{{name}}</strong>
                          <br />
                          {{value}}
                        </p>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list-item-group>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col :cols="12" :md="6" :lg="6" v-if="$auth.IsAdmin() && stats.long_running_transactions">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('statistics.longRunningTransactions')}}</v-card-title>
              <v-data-table
                :headers="transactionHeaders()"
                :items="stats.long_running_transactions"
              ></v-data-table>
              <v-card-text>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col :cols="12" :md="6" :lg="6" v-if="$auth.IsAdmin() && stats.mean_execution_time">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('statistics.meanExecutionTime')}}</v-card-title>
              <v-data-table
                :headers="meanExecHeaders()"
                :items="stats.mean_execution_time"
              ></v-data-table>
              <v-card-text>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Welcome to DeepLynx! -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('general.welcome')}}</v-card-title>
              <v-card-text>
                <p>{{$t('help.welcomeCard')}}</p>
                <p><a :href="welcomeLink">{{$t('general.wiki')}}</a></p>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Ontology -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('ontology.ontology')}}</v-card-title>

              <!-- If Condition: If Ontology is not populated, show default text -->
              <template v-if="!ontologyPopulated">
                <!-- <template> -->
                <v-card-text>
                  <p>{{$t('ontology.description')}}</p>
                  <p><a :href="ontologyLink">{{$t('ontology.loading')}}</a></p>
                </v-card-text>
              </template>

              <!-- Else Condition: If Ontology is populated, show Numbers of Metatypes and Relationships -->
              <template v-else>
                <v-card-text class="mt-4">
                  <v-row>
                    <v-col :cols="6" class="text-center">
                      <p class="text-h2 ma-2" style="line-height: unset">{{metatypesCount}}</p>
                      <h3 class="text-h3" style="line-height: unset">{{$t('classes.classes')}}</h3>
                    </v-col>
                    <v-col :cols="6" class="text-center">
                      <p class="text-h2 ma-2" style="line-height: unset">{{relationshipCount}}</p>
                      <h3 class="text-h3" style="line-height: unset">{{$t('relationships.relationships')}}</h3>
                    </v-col>
                  </v-row>
                </v-card-text>
              <v-card-actions class="d-flex flex-grow-1 pa-4 justify-center align-end">
                  <v-btn color="primary" @click="currentMainComponent = 'Metatypes'">
                    {{$t('ontology.manage')}}
                  </v-btn>
                </v-card-actions>
              </template>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Data Sources -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('dataSources.dataSources')}}</v-card-title>
              <v-card-text v-if="dataSources.length <= 0">{{$t('help.dataSourceCard')}}</v-card-text>
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
                    <p class="text-h4">{{dataSource.name}} {{$t('events.dataImported')}}</p>
                    <p>{{dataSource.data_imported}}</p>
                  </v-carousel-item>
                </v-carousel>
              </v-card-text>
              <v-card-actions class="d-flex flex-grow-1 pa-4 justify-center align-end">
                <v-btn color="primary" @click="currentMainComponent='DataSources'">
                  {{$t('dataSources.description')}}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- Dashboard Landing Page Card: Invite Users to Your Container -->
          <v-col cols="12" :md="6" :lg="6">
            <v-card class="d-flex flex-column height-full">
              <v-card-title class="text-h3 ma-0 pb-1" style="line-height: unset;">{{$t('containers.inviteUsers')}}</v-card-title>
              <v-card-text>{{$t('containers.inviteUsers')}}</v-card-text>
              <v-card-actions class="d-flex flex-grow-1 pa-4 justify-center align-end">
                <v-btn color="primary" @click="currentMainComponent='ContainerUsers'">
                  {{$t('users.manage')}}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
    <div v-else>
      <v-container>
        <v-layout align-center justify-center column fill-height>
          <v-flex row align-center>
            <v-progress-circular indeterminate :size="150"  style="margin-top: 200px" color="primary" class=""></v-progress-circular>

          </v-flex>
          <v-flex row align-center>
            <div class="align-self-center ma-auto">
              <v-img max-height="250" max-width="250" src="../assets/lynx.png"></v-img>
            </div>
          </v-flex>
        </v-layout>
      </v-container>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import ViewMetatypes from "@/views/ViewMetatypes.vue"
  import ViewMetatypeRelationships from "@/views/ViewMetatypeRelationships.vue"
  import ViewMetatypeRelationshipPairs from "@/views/ViewMetatypeRelationshipPairs.vue"
  import DataExport from "@/views/DataExport.vue"
  import DataImports from "@/views/DataImports.vue"
  import ViewDataQuery from "@/views/ViewDataQuery.vue"
  import DataSources from "@/views/DataSources.vue"
  import DataMapping from "@/views/DataMapping.vue"
  import ViewEventSystem from "@/views/ViewEventSystem.vue"
  import ViewSettings from "@/views/ViewSettings.vue"
  import ViewUsers from "@/views/ViewUsers.vue"
  import ContainerUsers from "@/views/ContainerUsers.vue"
  import Containers from "@/views/Containers.vue"
  import ApiKeys from "@/views/ApiKeys.vue";
  import LanguageSelect from "@/components/general/languageSelect.vue";
  import ContainerSelect from "@/components/ontology/containers/containerSelect.vue"
  import {TranslateResult} from "vue-i18n";
  import {UserT} from "@/auth/types";
  import {ContainerT, DataSourceT, FullStatistics} from "@/api/types";
  import Config from "@/config";
  import ViewOntologyUpdate from "@/views/ViewOntologyUpdate.vue"
  import ViewOntologyVersioning from "@/views/ViewOntologyVersioning.vue";
  import ContainerAlertBanner from "@/components/ontology/containers/containerAlertBanner.vue";
  import ViewServiceUsers from "@/views/ViewServiceUsers.vue";
  import ContainerExport from "@/views/ContainerExport.vue";
  import ContainerImport from "@/views/ContainerImport.vue";
  import ViewFileManager from "@/views/ViewFileManager.vue";
  import OverviewGraph from "@/views/OverviewGraph.vue";

  interface HomeModel {
    errorMessage: string
    drawer: boolean
    user: UserT | null
    container: ContainerT | null
    currentMainComponent: string | null
    componentName: string | TranslateResult
    argument: string | null
    componentKey: number
    stats: FullStatistics | null
    metatypesCount: number,
    relationshipCount: number,
    dataSources: DataSourceT[]
  }

  export default Vue.extend ({
    name: 'HomePage',

    components: { ContainerSelect, ApiKeys, LanguageSelect, DataImports, ViewMetatypes, ViewMetatypeRelationships, ViewMetatypeRelationshipPairs, DataExport, ViewDataQuery, DataSources, DataMapping, ViewEventSystem, ViewSettings, ContainerUsers, ViewUsers, Containers, ViewOntologyUpdate, ViewOntologyVersioning, ContainerAlertBanner, ViewServiceUsers, ContainerExport, ContainerImport, ViewFileManager, OverviewGraph },

    props: {
      containerID: {
        type: String,
        default: undefined,
      },
      view: {
        type: String,
        default: undefined,
      },
      arguments: {default: ""}, // as PropType<string>
    },

    computed: {
      ontologyPopulated(): boolean {
        return this.metatypesCount > 0 && this.relationshipCount > 0
      }
    },

    data: (): HomeModel => ({
      errorMessage: '',
      drawer: true,
      user: null,
      container: null,
      currentMainComponent: '',
      componentName: 'HomePage',
      argument: null,
      componentKey: 0, // this is so we can force a re-render of certain components on component change - assign as key
      stats: null,

      metatypesCount: 0,
      relationshipCount: 0,
      dataSources: [],
    }),

    methods: {
      transactionHeaders() {
        return [
          {text: this.$t('statistics.pid'), value: 'pid'},
          {text: this.$t('statistics.username'), value: 'usename'},
          {text: this.$t('general.database'), value: 'datname'},
          {text: this.$t('query.query'), value: 'query'},
          {text: this.$t('statistics.duration'), value: 'duration.milliseconds'},
        ]
      },
      meanExecHeaders() {
        return [
          {text: this.$t('users.id'), value: 'user_id'},
          {text: this.$t('statistics.dbID'), value: 'dbid'},
          {text: this.$t('query.query'), value: 'query'},
          {text: this.$t('statistics.meanExecutionTime'), value: 'mean_exec_time'},
        ]
      },
      setActiveComponent(menuIndex: string) {
        this.componentKey += 1 // increment so we force a re-render
        this.argument = this.arguments

        switch(menuIndex) {
          case "dashboard": {
            this.currentMainComponent = null
            this.componentName = this.$t('general.dashboard')
            this.$router.replace(`/containers/${this.containerID}`)
            break;
          }

          case "metatypes": {
            this.currentMainComponent = "ViewMetatypes";
            this.componentName = this.$t('classes.classes')
            this.$router.replace(`/containers/${this.containerID}/metatypes`)
            break;
          }

          case "metatype-relationships": {
            this.currentMainComponent = "ViewMetatypeRelationships";
            this.componentName = this.$t('relationshipTypes.relTypes')
            this.$router.replace(`/containers/${this.containerID}/metatype-relationships`)
            break;
          }

          case "metatype-relationship-pairs": {
            this.currentMainComponent = "ViewMetatypeRelationshipPairs";
            this.componentName = this.$t('relationships.relationships')
            this.$router.replace(`/containers/${this.containerID}/metatype-relationship-pairs`)
            break;
          }

          case "data-query": {
            this.currentMainComponent = "ViewDataQuery";
            this.componentName = this.$t('query.viewer')
            this.$router.replace(`/containers/${this.containerID}/data-query`)
            break;
          }

          case "data-sources": {
            this.currentMainComponent = "DataSources";
            this.componentName = this.$t('dataSources.dataSources')
            this.$router.replace(`/containers/${this.containerID}/data-sources/${this.arguments}`)
            break;
          }

          case "data-export": {
            this.currentMainComponent = "DataExport";
            this.componentName = this.$t('exports.graph')
            this.$router.replace(`/containers/${this.containerID}/data-export`)
            break;
          }

          case "file-manager": {
            this.currentMainComponent = "ViewFileManager";
            this.componentName = this.$t('modelExplorer.title')
            this.$router.replace(`/containers/${this.containerID}/file-manager`)
            break;
          }

          case "data-mapping": {
            this.currentMainComponent = "DataMapping";
            this.componentName = this.$t('typeMappings.typeMappings')
            this.$router.replace(`/containers/${this.containerID}/data-mapping`)
            break;
          }

          case "data-imports": {
            this.currentMainComponent = "DataImports"
            this.componentName = this.$t('imports.data')
            this.$router.replace(`/containers/${this.containerID}/data-imports/${this.arguments}`)
            break;
          }

          case "settings": {
            this.currentMainComponent = "ViewSettings";
            this.componentName = this.$t('general.settings')
            this.$router.replace(`/containers/${this.containerID}/settings`)
            break;
          }

          case "users": {
            this.currentMainComponent = "ViewUsers";
            this.componentName = this.$t('users.users')
            this.$router.replace(`/containers/${this.containerID}/users`)
            break;
          }

          case "container-users": {
            this.currentMainComponent = "ContainerUsers";
            this.componentName = this.$t('users.containerTitle')
            this.$router.replace(`/containers/${this.containerID}/container-users`)
            break;
          }

          case "containers": {
            this.currentMainComponent = "Containers"
            this.componentName = this.$t('containers.containers')
            this.$router.replace(`/containers/${this.containerID}/containers`)
            break;
          }

          case "api-keys": {
            this.currentMainComponent = "ApiKeys"
            this.componentName = this.$t('apiKeys.personalKeys')
            this.$router.replace(`/containers/${this.containerID}/api-keys`)
            break;
          }

          case "ontology-update": {
            this.currentMainComponent = "ViewOntologyUpdate";
            this.componentName = this.$t('ontology.updateTitle')
            this.$router.replace(`/containers/${this.containerID}/ontology-update`)
            break;
          }

          case "ontology-versioning": {
            this.currentMainComponent = "ViewOntologyVersioning"
            this.componentName = this.$t('ontology.versioningTitle')
            this.$router.replace(`/containers/${this.containerID}/ontology-versioning`)
            break;
          }

          case "service-users": {
            this.currentMainComponent = "ViewServiceUsers"
            this.componentName = this.$t('serviceUsers.title')
            this.$router.replace(`/containers/${this.containerID}/service-users`)
            break;
          }

          case "container-export": {
            this.currentMainComponent = "ContainerExport"
            this.componentName = this.$t('containers.export')
            this.$router.replace(`/containers/${this.containerID}/container-export`)
            break;
          }

          case "container-import": {
            this.currentMainComponent = "ContainerImport"
            this.componentName = this.$t('containers.import')
            this.$router.replace(`/containers/${this.containerID}/container-import`)
            break;
          }

          case "event-actions": {
            this.currentMainComponent = "ViewEventSystem";
            this.componentName = this.$t('events.title')
            this.$router.replace(`/containers/${this.containerID}/event-actions`)
            break;
          }

          default : {
            this.currentMainComponent = "";
            break;
          }
        }
      },
      logout() {
        this.$auth.Logout()
        window.location.href = `${Config.deepLynxApiUri}/logout?redirect_uri=${Config.appUrl}`
      },
      containerSelect() {
        this.$router.push({name: "ContainerSelect"})
      },
      helpLink() {
        // Use the $t function to get the translated value
        const translatedLink = this.$t('links.wiki');
        
        // Ensure it's a string before returning
        if (typeof translatedLink === 'string') {
          return translatedLink;
        }
        
        // Return a default value or handle the error as per requirements
        return '';
      },
      emailLink() {
        // Use the $t function to get the translated value
        const translatedLink = this.$t('links.email');
        
        // Ensure it's a string before returning
        if (typeof translatedLink === 'string') {
          return translatedLink;
        }
        
        // Return a default value or handle the error as per requirements
        return '';
      },
      welcomeLink() {
        // Use the $t function to get the translated value
        const translatedLink = this.$t('links.wiki');
        
        // Ensure it's a string before returning
        if (typeof translatedLink === 'string') {
          return translatedLink;
        }
        
        // Return a default value or handle the error as per requirements
        return '';
      },
      ontologyLink() {
        // Use the $t function to get the translated value
        const translatedLink = this.$t('links.createOntology');
        
        // Ensure it's a string before returning
        if (typeof translatedLink === 'string') {
          return translatedLink;
        }
        
        // Return a default value or handle the error as per requirements
        return '';
      },
    },

    created() {
      if (typeof this.arguments !== 'undefined') {
        this.argument = this.arguments;
      }
    },

    beforeMount() {
      this.$store.dispatch('refreshCurrentOntologyVersions');

      if(this.$auth.IsAdmin()) {
        this.$client.retrieveStats()
            .then(stats => this.stats = stats)
            .catch(e => this.errorMessage = e)
      }
    },

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
          .catch(() =>this.$router.push({name: "ContainerSelect"})
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
  });
</script>

<style lang="scss" scoped>
#main-content-container {
  padding: 30px !important;
}

.main-content-component-constrained {
  max-width: 2000px;
  margin: auto;
}

.main-content-component-unconstrained {
  width: 100%;
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
.nav-drawer-accordion.v-list :deep(.theme--light) {
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