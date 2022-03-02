import Vue from 'vue';
import Vuex from 'vuex';
import {ChangelistT, ContainerT, OntologyVersionT} from '@/api/types';
import {Client} from '@/api/client';
import Config from '@/config';
import OntologyVersionToolbar from '@/components/ontology/ontologyVersionToolbar.vue';

Vue.use(Vuex);

const client = new Client({
    rootURL: Config.deepLynxApiUri,
    auth_method: Config.deepLynxApiAuth,
    username: Config.deepLynxApiAuthBasicUser,
    password: Config.deepLynxApiAuthBasicPass,
});

export default new Vuex.Store({
    state: {
        activeContainer: undefined,
        editMode: false,
        ontologyVersion: {
            id: '',
            name: 'Primary',
        },
        selectedPendingVersion: {},
    },
    mutations: {
        initializeStore(state) {
            const activeContainer = localStorage.getItem('activeContainer');
            const ontologyVersion = localStorage.getItem('ontologyVersion');
            const editMode = localStorage.getItem('editMode');
            const selectedPendingVersion = localStorage.getItem('selectedPendingVersion');

            if (activeContainer) state.activeContainer = JSON.parse(activeContainer);
            if (ontologyVersion) state.ontologyVersion = JSON.parse(ontologyVersion);
            if (editMode) state.editMode = JSON.parse(editMode);
            if (selectedPendingVersion) state.selectedPendingVersion = JSON.parse(selectedPendingVersion);
        },

        setActiveContainer(state, container) {
            state.activeContainer = container;
            localStorage.setItem('activeContainer', JSON.stringify(container));
        },

        setOntologyVersion(state, version) {
            state.ontologyVersion = version;
            localStorage.setItem('ontologyVersion', JSON.stringify(version));
        },

        setEditMode(state, mode) {
            state.editMode = mode;
            localStorage.setItem('editMode', JSON.stringify(mode));
        },

        setPendingOntologyVersion(state, version: OntologyVersionT) {
            state.selectedPendingVersion = version as any;
            localStorage.setItem('selectedPendingVersion', JSON.stringify(version));
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
    },
    modules: {},
    getters: {
        activeContainerID: (state) => {
            if (state.activeContainer) {
                const container = state.activeContainer as unknown as ContainerT;

                return container.id;
            }

            return '';
        },

        ontologyVersioningEnabled: (state) => {
            if (state.activeContainer) {
                const container = state.activeContainer as unknown as ContainerT;

                return container.config.ontology_versioning_enabled;
            }

            return false;
        },

        selectedOntologyVersionID: (state) => {
            if (state.ontologyVersion) return (state.ontologyVersion as OntologyVersionT).id;
            return undefined;
        },

        selectedPendingOntologyVersion: (state) => {
            if (state.selectedPendingVersion) return state.selectedPendingVersion;
            return undefined;
        },

        selectedPendingOntologyVersionID: (state) => {
            if (state.selectedPendingVersion) return (state.selectedPendingVersion as OntologyVersionT).id;
            return undefined;
        },

        isEditMode: (state) => {
            return state.editMode;
        },

        activeOntologyVersionID: (state) => {
            if (state.editMode) {
                return (state.selectedPendingVersion as OntologyVersionT).id;
            } else {
                return (state.ontologyVersion as OntologyVersionT).id;
            }
        },
    },
});
