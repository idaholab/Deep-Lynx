import Vue from 'vue'
import Vuex from 'vuex'
import {ContainerT} from "@/api/types";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        activeContainer: undefined,
        user: undefined,
        containers: []
    },
    mutations: {
        setActiveContainer(state, container) {
            state.activeContainer = container
        },
    },
    actions: {
    },
    modules: {
    },
    getters: {
        activeContainerID: state => {
            if(state.activeContainer) {
                const container = state.activeContainer as unknown as ContainerT

                return container.id
            }

            return ""
        }
    }
})
