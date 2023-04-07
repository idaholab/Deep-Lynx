// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";

// Helpers
import regex from "../../../app/helpers/regex";

// MUI Components
import {
  Box,
} from "@mui/material";

// Custom Components 
import UnityInstance from "./UnityInstance";

export default function WebGL() {

  // WebGL Urls
  const [loaderUrl, setLoaderUrl] = useState<URL>();
  const [dataUrl, setDataUrl] = useState<URL>();
  const [frameworkUrl, setFrameworkUrl] = useState<URL>();
  const [codeUrl, setCodeUrl] = useState<URL>();

  useEffect(() => {

    async function get() {
      // const files = JSON.parse(localStorage.getItem('webgl')!);
      // const token = localStorage.getItem('user.token');
      // const webgl = regex(files);

      // let loaderUrl = new URL(`${location.origin}/containers/${webgl.loader.container}/files/${webgl.loader.id}/download`);
      // loaderUrl.searchParams.append("auth_token", token!);

      // let dataUrl = new URL(`${location.origin}/containers/${webgl.data.container}/files/${webgl.data.id}/download`);
      // dataUrl.searchParams.append("auth_token", token!);

      // let frameworkUrl = new URL(`${location.origin}/containers/${webgl.framework.container}/files/${webgl.framework.id}/download`);
      // frameworkUrl.searchParams.append("auth_token", token!);

      // let codeUrl = new URL(`${location.origin}/containers/${webgl.wasm.container}/files/${webgl.wasm.id}/download`);
      // codeUrl.searchParams.append("auth_token", token!);

      // setLoaderUrl(loaderUrl);
      // setDataUrl(dataUrl);
      // setFrameworkUrl(frameworkUrl);
      // setCodeUrl(codeUrl);
    }

    get();
    
  }, []);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* { loaderUrl && dataUrl && frameworkUrl && codeUrl ? */}
        <UnityInstance
          loaderUrl={loaderUrl}
          dataUrl={dataUrl}
          frameworkUrl={frameworkUrl}
          codeUrl={codeUrl}
        />
      {/* : null } */}
    </Box>
  );
}