// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";

// Store
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';

// Material
import {
  Box,
} from "@mui/material";

// Components 
import UnityInstance from "./UnityInstance";

export default function WebGL() {

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const metadata: string = useAppSelector((state: any) => state.appState.metadata);
  const query: boolean = useAppSelector((state: any) => state.appState.query);
  
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

    // If the environment has been established, we're ready to query for filesets and the tag id
    if(query) {
      query();
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