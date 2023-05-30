// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";

// Helpers
import ParseWebGL from "../../../../app/helpers/regex";
import ParseTag from "../../../../app/helpers/tags";

// Store
import { appStateActions } from '../../../../app/store/index';
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';

// Material
import {
  Box,
} from "@mui/material";

// Components 
import UnityInstance from "./UnityInstance";

// Axios
import axios from "axios";

export default function WebGL() {

  // Store
  const dispatch = useAppDispatch();

  // Logic
  const [query, setQuery] = useState<Boolean>(false);

  // DeepLynx
  const [host, setHost] = useState<string>();
  const [token, setToken] = useState<string>();
  const [container, setContainer] = useState<string>();
  const [webgl, setWebgl] = useState<object>();
  const [tag, setTag] = useState<string>();
  
  // WebGL Urls
  const [loaderUrl, setLoaderUrl] = useState<URL>();
  const [dataUrl, setDataUrl] = useState<URL>();
  const [frameworkUrl, setFrameworkUrl] = useState<URL>();
  const [codeUrl, setCodeUrl] = useState<URL>();

  // Tag
  type webgl_tag = string;
  const webgl_tag: webgl_tag = useAppSelector((state: any) => state.appState.tag);

  // Initialize React environment, setup to handle the webgl payload
  useEffect(() => {
    // In local development, the 3D Model Viewer targets a development container in deeplynx.azuredev.inl.gov
    if(import.meta.env.MODE == "development") {
      setHost(import.meta.env.VITE_DEEPLYNX_HOST);
      setToken(import.meta.env.VITE_DEEPLYNX_TOKEN);
      setContainer(import.meta.env.VITE_DEEPLYNX_CONTAINER);

      const metadata = JSON.parse(import.meta.env.VITE_DEEPLYNX_WEBGL_FILES);
      const fileset = ParseWebGL(metadata);
      setWebgl(fileset);

      const tag = ParseTag(fileset);
      setTag(tag);

      setQuery(true);
    }
    // In production, the envrionment is setup using variable DeepLynx put in localStorage
    else {
      setHost(location.origin);
      setToken(localStorage.getItem('user.token')!);
      setContainer(localStorage.getItem('container')!);

      const metadata = (JSON.parse(localStorage.getItem('webgl')!));
      const fileset = ParseWebGL(metadata);
      setWebgl(fileset);

      const tag = ParseTag(fileset);
      setTag(tag);

      setQuery(true);
    }

    dispatch(appStateActions.setTag(tag));
  }, [])

  useEffect(() => {
    async function query() {
      if(webgl) {
        let loaderUrl = new URL(`${host}/containers/${webgl.loader.container}/files/${webgl.loader.id}/download`);
        loaderUrl.searchParams.append("auth_token", token!);

        let dataUrl = new URL(`${host}/containers/${webgl.data.container}/files/${webgl.data.id}/download`);
        dataUrl.searchParams.append("auth_token", token!);

        let frameworkUrl = new URL(`${host}/containers/${webgl.framework.container}/files/${webgl.framework.id}/download`);
        frameworkUrl.searchParams.append("auth_token", token!);

        let codeUrl = new URL(`${host}/containers/${webgl.wasm.container}/files/${webgl.wasm.id}/download`);
        codeUrl.searchParams.append("auth_token", token!);

        setLoaderUrl(loaderUrl);
        setDataUrl(dataUrl);
        setFrameworkUrl(frameworkUrl);
        setCodeUrl(codeUrl);
      }
    }

    async function tag() {
      await axios.get(`${host}/containers/${container}/graphs/tags`,
      {
        headers: {
            Authorization: `bearer ${token}`
          }
        }
      ).then((response) => {
        let tags = response.data.value;
        tags.forEach((record: any) => {
          if (record.tag_name == tag)
          {
            dispatch(appStateActions.setTagId(record.id));
          }
        })
      })
    }

    // If the environment has been established, we're ready to query for filesets and the tag id
    if(query) {
      query();
      tag();
    }
    
  }, [query]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      { loaderUrl && dataUrl && frameworkUrl && codeUrl ?
        <UnityInstance
          loaderUrl={loaderUrl}
          dataUrl={dataUrl}
          frameworkUrl={frameworkUrl}
          codeUrl={codeUrl}
        />
      : null } 
    </Box>
  );
}