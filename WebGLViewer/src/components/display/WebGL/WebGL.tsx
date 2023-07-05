// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";

// Store
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';

// Material
import {
  Box,
  CircularProgress,
  Typography
} from "@mui/material";

// Components 
import UnityInstance from "./UnityInstance";

// Types
import { WebGLFile, WebGLFileset } from '../../../helpers/types';

export default function WebGL() {

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const metadata: WebGLFileset = useAppSelector((state: any) => state.appState.metadata);
  const query: boolean = useAppSelector((state: any) => state.appState.query);

  // Loaded State for Progress Loader
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadedState = (isLoaded: boolean) => {
    setIsLoaded(isLoaded);
    console.log("in webgl", isLoaded)
  } 
  
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
      console.log(metadata);
      if(metadata) {
        let loaderUrl = new URL(`${host}/containers/${metadata.loader.container_id}/files/${metadata.loader.file_id}/download`);
        loaderUrl.searchParams.append("auth_token", token!);

        let dataUrl = new URL(`${host}/containers/${metadata.data.container_id}/files/${metadata.data.file_id}/download`);
        dataUrl.searchParams.append("auth_token", token!);

        let frameworkUrl = new URL(`${host}/containers/${metadata.framework.container_id}/files/${metadata.framework.file_id}/download`);
        frameworkUrl.searchParams.append("auth_token", token!);

        let codeUrl = new URL(`${host}/containers/${metadata.wasm.container_id}/files/${metadata.wasm.file_id}/download`);
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
      {!isLoaded &&
        <Box sx={{ position: 'relative', display: 'inline-flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <CircularProgress size={150} sx={{ position: 'absolute', zIndex: 1 }} />
          <Typography sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>Loading<br />Unity Files</Typography>
        </Box>
      }
      {(loaderUrl && dataUrl && frameworkUrl && codeUrl) && (
        <UnityInstance
          handleLoadedState={handleLoadedState}
          loaderUrl={loaderUrl}
          dataUrl={dataUrl}
          frameworkUrl={frameworkUrl}
          codeUrl={codeUrl}
        />
      )}
    </Box>
  );
}