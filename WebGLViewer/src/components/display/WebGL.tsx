// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Helpers
import regex from "../../../app/helpers/regex";

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Components
import {
  Box,
} from "@mui/material";

// Custom Components 
import UnityInstance from "./UnityInstance";

export default function WebGL() {
  const dispatch = useAppDispatch();

  // WebGL Urls
  const [loaderUrl, setLoaderUrl] = useState<URL>();
  const [dataUrl, setDataUrl] = useState<URL>();
  const [frameworkUrl, setFrameworkUrl] = useState<URL>();
  const [codeUrl, setCodeUrl] = useState<URL>();

  useEffect(() => {

    async function get() {
      const files = JSON.parse(localStorage.getItem('webgl')!);
      // const token = 'bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6Ik5hdGhhbiBMLiBXb29kcnVmZiIsImVtYWlsIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJhZG1pbiI6ZmFsc2UsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxOSIsImtleSI6Ik16SXlNVFJoTm1JdE9EYzNNaTAwWWpjMExXRmxaRFF0TkdOaE16VmlOR0l6TVdaaiIsInNlY3JldCI6IiQyYSQxMCRJREg5WXpGM2RmeXVpNDA2ZVFVSWhPU3Y1djQ2czNMaTlGTERJVlc4a2NpeERnZThNclpiMiIsIm5vdGUiOiJBZGFtIiwiaWQiOiIxOSIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wOC0xOFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTA4LTE4VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTY3ODkxMzA5OCwiZXhwIjoxNzEwNDcwNjk4fQ.6ex5ftZOQlOEkCev-G54qPE2waN3HZeDsMpK4ssPa_fEamUhd7-qt56OcM87VUSMNEDRYVPw74WF9PhyBUf2n4EslunCUZLYYpW1RdrQViDcbi6zHPlfMe0KrRwTsu4YobAVEMvEYkpA_wW0u0O4YfemEZdrqORYxMONHfmqCC_tA4FODi5hrv9ln3xH3DpmUaVXlvRzzFvPH5bE-jKV_gdmeunkFyfVuE1wuUx7I0jF6ZpUj1u09bikdvTo-FmchkRRGyYKKsbu5H3DZsr7JoT_tAnS_Z5O9MBeHu8uqciAc2esElkq3t_cpxi5yLriIx5mSEI6b7Fb6UEClVP5XA';
      const token = localStorage.getItem('user.token');
      const webglRawData = [files];
        // {
        //     "file_id": "13",
        //     "file_name": "sandbox.data",
        //     "file_size": 7333.997,
        //     "file_modified_at": "2023-03-27T21:10:59.012Z",
        //     "file_created_at": "2023-03-27T21:10:59.012Z",
        //     "id": "2",
        //     "tag_name": "Sandbox",
        //     "container_id": "2",
        //     "metadata": {
        //         "webgl": true
        //     },
        //     "created_at": "2023-03-27T21:10:58.648Z",
        //     "modified_at": "2023-03-27T21:10:58.648Z",
        //     "deleted_at": null,
        //     "created_by": "0",
        //     "modified_by": null
        // },
        // {
        //     "file_id": "14",
        //     "file_name": "sandbox.loader.js",
        //     "file_size": 18.894,
        //     "file_modified_at": "2023-03-27T21:10:59.028Z",
        //     "file_created_at": "2023-03-27T21:10:59.028Z",
        //     "id": "2",
        //     "tag_name": "Sandbox",
        //     "container_id": "2",
        //     "metadata": {
        //         "webgl": true
        //     },
        //     "created_at": "2023-03-27T21:10:58.648Z",
        //     "modified_at": "2023-03-27T21:10:58.648Z",
        //     "deleted_at": null,
        //     "created_by": "0",
        //     "modified_by": null
        // },
        // {
        //     "file_id": "15",
        //     "file_name": "sandbox.framework.js",
        //     "file_size": 369.719,
        //     "file_modified_at": "2023-03-27T21:10:59.030Z",
        //     "file_created_at": "2023-03-27T21:10:59.030Z",
        //     "id": "2",
        //     "tag_name": "Sandbox",
        //     "container_id": "2",
        //     "metadata": {
        //         "webgl": true
        //     },
        //     "created_at": "2023-03-27T21:10:58.648Z",
        //     "modified_at": "2023-03-27T21:10:58.648Z",
        //     "deleted_at": null,
        //     "created_by": "0",
        //     "modified_by": null
        // },
        // {
        //     "file_id": "16",
        //     "file_name": "sandbox.wasm",
        //     "file_size": 14707.975,
        //     "file_modified_at": "2023-03-27T21:10:59.790Z",
        //     "file_created_at": "2023-03-27T21:10:59.790Z",
        //     "id": "2",
        //     "tag_name": "Sandbox with Scenes",
        //     "container_id": "2",
        //     "metadata": {
        //         "webgl": true
        //     },
        //     "created_at": "2023-03-27T21:10:58.648Z",
        //     "modified_at": "2023-03-27T21:10:58.648Z",
        //     "deleted_at": null,
        //     "created_by": "0",
        //     "modified_by": null
        // }
      // ];
      const webgl: any = regex(webglRawData);

      // let loaderUrl = new URL(`http://localhost:8090/containers/${webgl.loader.container}/files/${webgl.loader.id}/download`);
      // // loaderUrl.searchParams.append("auth_token", token!);

      // let dataUrl = new URL(`http://localhost:8090/containers/${webgl.data.container}/files/${webgl.data.id}/download`);
      // // dataUrl.searchParams.append("auth_token", token!);

      // let frameworkUrl = new URL(`http://localhost:8090/containers/${webgl.framework.container}/files/${webgl.framework.id}/download`);
      // // frameworkUrl.searchParams.append("auth_token", token!);

      // let codeUrl = new URL(`http://localhost:8090/containers/${webgl.wasm.container}/files/${webgl.wasm.id}/download`);
      // // codeUrl.searchParams.append("auth_token", token!);

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
      const fileSetId: any = webglRawData[0].id;
      dispatch(appStateActions.setWebGLFileSetId(fileSetId))
    }

    get();
    
  }, []);

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