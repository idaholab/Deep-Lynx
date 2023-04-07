// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Helpers
import regex from "../../../app/helpers/regex";
import regexTag from "../../../app/helpers/tags";

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Components
import {
  Box,
} from "@mui/material";

// Custom Components 
import UnityInstance from "./UnityInstance";

// Axios
import axios from "axios";

export default function WebGL() {
  // Store
  const dispatch = useAppDispatch();

  // LocalStorage
  const token = localStorage.getItem('user.token');
  const containerId = localStorage.getItem('container');
  const files = JSON.parse(localStorage.getItem('webgl')!);
  
  // WebGL Urls
  const [loaderUrl, setLoaderUrl] = useState<URL>();
  const [dataUrl, setDataUrl] = useState<URL>();
  const [frameworkUrl, setFrameworkUrl] = useState<URL>();
  const [codeUrl, setCodeUrl] = useState<URL>();

  // Tag
  type webgl_tag = string;
  const webgl_tag: webgl_tag = useAppSelector((state: any) => state.appState.tag);

  useEffect(() => {
    async function get() {
      const webgl = regex(files);
      const tag = regexTag(webgl);
      
      dispatch(appStateActions.setTag(tag));

      let loaderUrl = new URL(`${location.origin}/containers/${webgl.loader.container}/files/${webgl.loader.id}/download`);
      loaderUrl.searchParams.append("auth_token", token!);

      let dataUrl = new URL(`${location.origin}/containers/${webgl.data.container}/files/${webgl.data.id}/download`);
      dataUrl.searchParams.append("auth_token", token!);

      let frameworkUrl = new URL(`${location.origin}/containers/${webgl.framework.container}/files/${webgl.framework.id}/download`);
      frameworkUrl.searchParams.append("auth_token", token!);

      let codeUrl = new URL(`${location.origin}/containers/${webgl.wasm.container}/files/${webgl.wasm.id}/download`);
      codeUrl.searchParams.append("auth_token", token!);

      setLoaderUrl(loaderUrl);
      setDataUrl(dataUrl);
      setFrameworkUrl(frameworkUrl);
      setCodeUrl(codeUrl);
    }

    get();
    
  }, []);

  useEffect(() => {

    async function getTagId()
    {
      await axios.get(`${location.origin}/containers/${containerId}/graphs/tags`,
      {
        headers: {
            Authorization: `bearer ${token}`
          }
        }
      ).then((response) => {
        console.log(response.data);
        let tags = response.data.value;
        tags.forEach((tag: any) => {
          if (tag.tag_name == webgl_tag)
          {
            dispatch(appStateActions.setTagId(tag.id));
          }
        })
      })
    }

    if(webgl_tag != "") getTagId();
  }, [webgl_tag])

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