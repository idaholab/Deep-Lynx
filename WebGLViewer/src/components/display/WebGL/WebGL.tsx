// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";

// Helpers
import ParseWebGL from "../../../helpers/regex";
import ParseTag from "../../../helpers/tags";

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

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const metadata: string = useAppSelector((state: any) => state.appState.metadata);
  const tag: string = useAppSelector((state: any) => state.appState.tag);
  const query: boolean = useAppSelector((state: any) => state.appState.query);

  // const [host, setHost] = useState<string>();
  // const [token, setToken] = useState<string>();
  // const [container, setContainer] = useState<string>();
  // const [webgl, setWebgl] = useState<object>();
  // const [tag, setTag] = useState<string>();
  
  // WebGL Urls
  const [loaderUrl, setLoaderUrl] = useState<URL>();
  const [dataUrl, setDataUrl] = useState<URL>();
  const [frameworkUrl, setFrameworkUrl] = useState<URL>();
  const [codeUrl, setCodeUrl] = useState<URL>();

  // Tag
  type webgl_tag = string;
  const webgl_tag: webgl_tag = useAppSelector((state: any) => state.appState.tag);

  useEffect(() => {
    async function query() {
      if(metadata) {
        let loaderUrl = new URL(`${host}/containers/${metadata.loader.container}/files/${metadata.loader.id}/download`);
        loaderUrl.searchParams.append("auth_token", token!);

        let dataUrl = new URL(`${host}/containers/${metadata.data.container}/files/${metadata.data.id}/download`);
        dataUrl.searchParams.append("auth_token", token!);

        let frameworkUrl = new URL(`${host}/containers/${metadata.framework.container}/files/${metadata.framework.id}/download`);
        frameworkUrl.searchParams.append("auth_token", token!);

        let codeUrl = new URL(`${host}/containers/${metadata.wasm.container}/files/${metadata.wasm.id}/download`);
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