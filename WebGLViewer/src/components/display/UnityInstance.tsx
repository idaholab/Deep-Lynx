// React
import React from "react";

// Hooks
import { useEffect, useState } from "react";
import { useAppSelector } from '../../../app/hooks/reduxTypescriptHooks';

// Styles
import '../../styles/App.scss';

// Unity
import { Unity, useUnityContext } from "react-unity-webgl";

// MUI Components
import {
  Box,
  Button,
} from "@mui/material";

function UnityInstance(props: any) {
  // Dynamic resizing
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  const { unityProvider, sendMessage } = useUnityContext({
    // These 4 compiled assets are the bundle that Unity generates when you build to WebGL
    loaderUrl: props.loaderUrl.href,
    dataUrl: props.dataUrl.href,
    frameworkUrl: props.frameworkUrl.href,
    codeUrl: props.codeUrl.href,
  });

  // Dynamic Resizing
  const updateDimensions = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  useEffect(() => {
    // Resize Callback
    window.addEventListener("resize", updateDimensions);

    async function init() {}
    init();
  }, [height, width]);

  type selectAssetOnScene = string;
  const selectAssetOnScene: selectAssetOnScene = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  useEffect(() => {
    sendMessage(selectAssetOnScene, "Select");
    console.log(selectAssetOnScene)
  }, [selectAssetOnScene]);

  type highlightAssetOnScene = string;
  const highlightAssetOnScene: highlightAssetOnScene = useAppSelector((state: any) => state.appState.highlightAssetOnScene);
  useEffect(() => {
    sendMessage(highlightAssetOnScene, "HighlightBlock", highlightAssetOnScene);
    console.log(highlightAssetOnScene)
  }, [highlightAssetOnScene]);

  function reset() {
    sendMessage("Main Camera", "Reset");
  };

  const style = { width: 200 };

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      { unityProvider ?
        <Unity
          className="webgl-canvas"
          unityProvider={unityProvider}
        />
      : null }
      <Button variant="contained" sx={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => reset()}>
        Reset
      </Button>
    </Box>
  );
}

export default UnityInstance;
