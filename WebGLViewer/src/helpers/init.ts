// Helpers
import ParseWebGL from "./regex";
import ParseTag from "./tags";

// Axios
import axios from "axios";

// Store
import { appStateActions } from '../../app/store/index';
import { useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';

const dispatch = useAppDispatch();

async function GetTagID(host: string, container: string, token: string, tag: string) {
    await axios.get(`${host}/containers/${container}/graphs/tags`,
    {
    headers: {
        Authorization: `bearer ${token}`
        }
    }
    ).then((response: any) => {
    let tags = response.data.value;
    tags.forEach((record: any) => {
        if (record.tag_name == tag)
        {
            dispatch(appStateActions.setTagId(record.id));
        }
    })
    })
}

export function AttachDeepLynx() {

    // In local development, the 3D Model Viewer targets a development container in deeplynx.azuredev.inl.gov
    if(import.meta.env.MODE == "development") {

        const host: string = import.meta.env.VITE_DEEPLYNX_HOST
        dispatch(appStateActions.setHost(host));

        const token: string = import.meta.env.VITE_DEEPLYNX_TOKEN
        dispatch(appStateActions.setToken(token));

        const container: string = import.meta.env.VITE_DEEPLYNX_CONTAINER;
        dispatch(appStateActions.setContainer(container));

        // Fileset
        const fileset: any = JSON.parse(import.meta.env.VITE_DEEPLYNX_WEBGL_FILES);

        const metadata: any = ParseWebGL(fileset);
        const tag: string = ParseTag(metadata);

        dispatch(appStateActions.setMetadata(metadata));
        dispatch(appStateActions.setTagRefactor(tag));

        (async () => {
            await GetTagID(host, container, token, tag).then(() => {
            dispatch(appStateActions.setQuery(true));
        });
        })();
    }
    // In production, the 3D Model Viewer targets its container using variables DeepLynx put in localStorage
    else {
        dispatch(appStateActions.setHost(location.origin));
        dispatch(appStateActions.setToken(localStorage.getItem('user.token')!));
        dispatch(appStateActions.setContainer(localStorage.getItem('container')!));

        // Fileset
        let fileset = JSON.parse(import.meta.env.VITE_DEEPLYNX_WEBGL_FILES);

        const metadata = ParseWebGL(fileset);
        const tag = ParseTag(metadata);

        dispatch(appStateActions.setMetadata(metadata));
        dispatch(appStateActions.setTagRefactor(tag));
        dispatch(appStateActions.setQuery(true));
    }
}