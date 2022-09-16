import Vue from 'vue';
import Vuex from 'vuex';
import {ChangelistT, ContainerT, OntologyVersionT} from '@/api/types';
import Config from '@/config';
import {Client} from '@/api/client';
import VuexPersistence from 'vuex-persist';

Vue.use(Vuex);

const client = new Client({
    rootURL: Config.deepLynxApiUri,
    auth_method: Config.deepLynxApiAuth,
    username: Config.deepLynxApiAuthBasicUser,
    password: Config.deepLynxApiAuthBasicPass,
});

type State = {
    activeContainer: ContainerT | undefined;
    inEditMode: boolean;

    // this is the most recent, published ontology. This generally determines which ontology version the various search
    // components and listing components are using to find results
    currentOntologyVersion: OntologyVersionT | undefined;

    // all currently published ontology versions
    publishedOntologyVersions: OntologyVersionT[];

    // this is  the ontology version selected in the ontology versioning toolbar. This determines what shows up when
    // listing ontology portions when in view mode - this does not affect the various search and listing components however
    // as those will always default to the currently published ontology version
    selectedOntologyVersion: OntologyVersionT | undefined;

    // a list of all the changelists that a user created - this might need to be updated or expanded so that an admin
    // can review all changelists
    ownedCurrentChangelists: ChangelistT[];

    // selected changelist refers to the current changelist selected by the user
    selectedChangelist: ChangelistT | undefined;
};

const vuexLocal = new VuexPersistence<State>({
    storage: window.localStorage,
});

export default new Vuex.Store<State>({
    state: {
        activeContainer: undefined,
        inEditMode: false,
        publishedOntologyVersions: [],
        currentOntologyVersion: undefined,
        selectedOntologyVersion: undefined,
        ownedCurrentChangelists: [],
        selectedChangelist: undefined,
    },
    mutations: {
        setActiveContainer(state, container) {
            state.activeContainer = container;
        },

        setCurrentOntologyVersion(state, version) {
            state.currentOntologyVersion = version;
        },

        setPublishedOntologyVersions(state, versions) {
            state.publishedOntologyVersions = versions;
        },

        selectOntologyVersion(state, version) {
            state.selectedOntologyVersion = version;
        },

        setOwnedCurrentChangelists(state, changelists) {
            state.ownedCurrentChangelists = changelists;
        },

        selectChangelist(state, changelist) {
            state.selectedChangelist = changelist;
        },

        setEditMode(state, mode) {
            state.inEditMode = mode;
        },

        toggleEditMode(state) {
            state.inEditMode = !state.inEditMode;
        },
    },
    actions: {
        changeOntologyVersion({commit}, version) {
            commit('setOntologyVersion', version);
            commit('setEditMode', false);
            commit('setPendingOntologyVersion', undefined);
        },

        changePendingOntologyVersion({commit}, version) {
            commit('setPendingOntologyVersion', version);
        },

        refreshCurrentOntologyVersions({commit, getters, state}) {
            commit('setPublishedOntologyVersions', []);
            commit('setCurrentOntologyVersion', undefined);
            commit('selectOntologyVersion', undefined);

            return new Promise((resolve, reject) => {
                client
                    .listOntologyVersions(getters.activeContainerID, {status: 'published'})
                    .then((results) => {
                        if (results.length > 0) {
                            commit('setPublishedOntologyVersions', results);
                            commit('setCurrentOntologyVersion', results[0]);
                        }

                        if (!state.selectedOntologyVersion) {
                            commit('selectOntologyVersion', results[0]);
                        }

                        // @ts-ignore
                        resolve();
                    })
                    .catch((e: any) => reject(e));
            });
        },

        refreshOwnedCurrentChangelists({commit, getters, state}, currentUserID) {
            const oldSelectedChangelistID = state.selectedChangelist?.id;
            commit('setOwnedCurrentChangelists', []);

            const config: {[key: string]: any} = {createdBy: currentUserID};
            return new Promise((resolve, reject) => {
                client
                    .listOntologyVersions(getters.activeContainerID, config)
                    .then((results) => {
                        if (results.length > 0) {
                            commit(
                                'setOwnedCurrentChangelists',
                                results.filter((c) => c.status === 'ready' || c.status === 'generating'),
                            );
                        }

                        if (!oldSelectedChangelistID || results.filter((v) => v.id === oldSelectedChangelistID).length <= 0) {
                            commit(
                                'selectChangelist',
                                results.find((c) => c.status === 'ready'),
                            );
                        }

                        // @ts-ignore
                        resolve();
                    })
                    .catch((e: any) => reject(e));
            });
        },
    },
    modules: {},
    getters: {
        isEditMode: (state) => {
            return state.inEditMode;
        },

        activeContainer: (state) => {
            return state.activeContainer;
        },

        activeContainerID: (state) => {
            if (state.activeContainer) {
                const container = state.activeContainer as unknown as ContainerT;

                return container.id;
            }

            return undefined;
        },

        ontologyVersioningEnabled: (state) => {
            if (state.activeContainer) {
                const container = state.activeContainer as unknown as ContainerT;

                return container.config.ontology_versioning_enabled;
            }

            return false;
        },

        currentOntologyVersionID: (state) => {
            if (state.currentOntologyVersion) {
                return state.currentOntologyVersion.id;
            }

            return undefined;
        },

        selectedChangelistID: (state) => {
            if (state.selectedChangelist) {
                return state.selectedChangelist.id;
            }

            return undefined;
        },

        // this determines whether to return the currently published ontology version, or the selected changelist
        // depending on if the user is in edit mode. This is used primarily  to ensure that the ontology listing functions
        // in the various ontology views are returning the right results dependent on mode and current selection
        activeOntologyVersionID: (state) => {
            if (state.activeContainer && state.activeContainer.config.ontology_versioning_enabled) {
                if (state.inEditMode && state.selectedChangelist) {
                    return state.selectedChangelist.id;
                } else if (state.inEditMode && !state.selectedChangelist) {
                    return '0'; // this should ensure we're not loading erroneous ontologies when in edit mode
                } else {
                    return state.currentOntologyVersion?.id;
                }
            } else {
                return state.currentOntologyVersion?.id;
            }
        },
    },
    plugins: [vuexLocal.plugin],
});
