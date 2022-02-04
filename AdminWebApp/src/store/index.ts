import Vue from 'vue';
import Vuex from 'vuex';
import {ContainerT, OntologyVersionT} from '@/api/types';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        activeContainer: undefined,
        editMode: false,
        ontologyVersion: {
            id: '',
            name: 'Primary',
        },
    },
    mutations: {
        setActiveContainer(state, container) {
            state.activeContainer = container;
        },

        setOntologyVersion(state, version) {
            state.ontologyVersion = version;
        },

        setEditMode(state, mode) {
            state.editMode = mode;
        },
    },
    actions: {
        changeOntologyVersion({commit}, version) {
            commit('setOntologyVersion', version);
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

        isEditMode: (state) => {
            return state.editMode;
        },
    },
});
