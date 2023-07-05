// Types
import { WebGLFile, WebGLFileset } from './types';

// Helpers
import { ParseWebGL, ParseTag } from './webgl';

// Axios
import axios from 'axios';

// Store
import { appStateActions } from '../../app/store/index';
import { useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';

export async function AttachDeepLynx() {
  /**
   * Attach the 3D Model Viewer to DeepLynx
   */

  const dispatch = useAppDispatch();

  // In local development, the 3D Model Viewer targets a development container in deeplynx.azuredev.inl.gov
  if (import.meta.env.MODE == 'development') {
    const host: string = import.meta.env.VITE_DEEPLYNX_HOST;
    dispatch(appStateActions.setHost(host));

    const token: string = import.meta.env.VITE_DEEPLYNX_TOKEN;
    dispatch(appStateActions.setToken(token));
    const container: string = import.meta.env.VITE_DEEPLYNX_CONTAINER;
    dispatch(appStateActions.setContainer(container));

    // Fileset
    const fileset: any = JSON.parse(import.meta.env.VITE_DEEPLYNX_WEBGL_FILES);

    const metadata: WebGLFileset = ParseWebGL(fileset);
    console.log(metadata);

    const tag: string = ParseTag(metadata);
    dispatch(appStateActions.setMetadata(metadata));
    dispatch(appStateActions.setTagRefactor(tag));

    await axios
      .get(`${host}/containers/${container}/graphs/tags`, {
        headers: {
          Authorization: `bearer ${token}`,
        },
      })
      .then((response: any) => {
        let tags = response.data.value;
        tags.forEach((record: any) => {
          if (record.tag_name == tag) {
            dispatch(appStateActions.setTagId(record.id));
          }
        });
      });
  }
  // In production, the 3D Model Viewer targets its container using variables DeepLynx put in localStorage
  else {
    const host = location.origin;
    dispatch(appStateActions.setHost(host));

    const token = localStorage.getItem('user.token')!;
    dispatch(appStateActions.setToken(token));

    const container = localStorage.getItem('container')!;
    dispatch(appStateActions.setContainer(container));

    // Fileset
    let fileset = JSON.parse(localStorage.getItem('webgl')!);

    const metadata = ParseWebGL(fileset);
    const tag = ParseTag(metadata);

    dispatch(appStateActions.setMetadata(metadata));
    dispatch(appStateActions.setTagRefactor(tag));

    await axios
      .get(`${host}/containers/${container}/graphs/tags`, {
        headers: {
          Authorization: `bearer ${token}`,
        },
      })
      .then((response: any) => {
        let tags = response.data.value;
        tags.forEach((record: any) => {
          if (record.tag_name == tag) {
            dispatch(appStateActions.setTagId(record.id));
          }
        });
      });
  }
}
