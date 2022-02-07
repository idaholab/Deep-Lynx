import Vue from 'vue';
import Vuex from 'vuex';
import {ChangelistT, ContainerT, OntologyVersionT} from '@/api/types';
import {Client} from '@/api/client';
import Config from '@/config';

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
        activeChangelist: undefined,
    },
    mutations: {
        initializeStore(state) {
            const activeContainer = localStorage.getItem('activeContainer');
            const ontologyVersion = localStorage.getItem('ontologyVersion');
            const editMode = localStorage.getItem('editMode');
            const activeChangelist = localStorage.getItem('activeChangelist');

            if (activeContainer) state.activeContainer = JSON.parse(activeContainer);
            if (ontologyVersion) state.ontologyVersion = JSON.parse(ontologyVersion);
            if (editMode) state.editMode = JSON.parse(editMode);
            if (activeChangelist) state.activeChangelist = JSON.parse(activeChangelist);
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

        setActiveChangelist(state, changelist: ChangelistT) {
            state.activeChangelist = changelist as any;
            localStorage.setItem('activeChangelist', JSON.stringify(changelist));
        },
    },
    actions: {
        changeOntologyVersion({commit}, version) {
            commit('setOntologyVersion', version);
        },

        changeActiveChangelist({commit}, changelist) {
            commit('setActiveChangelist', changelist);
        },

        updateActiveChangelist({commit}, changelist: ChangelistT) {
            localStorage.setItem('activeChangelist', JSON.stringify(changelist));
            return client.updateChangelist(changelist.container_id, changelist.id!, changelist.changelist!);
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

        activeChangelist: (state) => {
            if (state.activeChangelist) return state.activeChangelist;
            return undefined;
        },

        isEditMode: (state) => {
            return state.editMode;
        },
    },
});
