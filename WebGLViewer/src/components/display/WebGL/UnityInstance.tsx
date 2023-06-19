// React
import React from "react";

// Hooks
import { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';

// Styles
import '../../../styles/App.scss';

// Unity
import { Unity, useUnityContext } from "react-unity-webgl";

// Material
import {
  Box,
  Button,
} from "@mui/material";
import { appStateActions } from "../../../../app/store";

function UnityInstance(props: any) {

  // Store
  const dispatch = useAppDispatch();

  // Dynamic resizing
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  // Unity
  const { unityProvider,
    sendMessage,
    addEventListener,
    removeEventListener } = useUnityContext({
    loaderUrl: props.loaderUrl.href,
    dataUrl: props.dataUrl.href,
    frameworkUrl: props.frameworkUrl.href,
    codeUrl: props.codeUrl.href,
  });

  // Variables
  type selectedScene = string;
  const selectedScene: selectedScene = useAppSelector((state: any) => state.appState.selectedSceneObject);
  type selectedAssetOnScene = string;
  const selectedAssetOnScene: selectedAssetOnScene = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  type highlightedGameObject = string;
  const highlightedGameObject: highlightedGameObject = useAppSelector((state: any) => state.appState.highlightAssetOnScene);

  // Function Handlers
  const handleDimensions = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  const handleDataPanel = useCallback((target: string) => {
      // TimeSeries
    },
    []
  );

  const handleNodes = useCallback((response: string) => {
    let nodes = response.split(",");
    dispatch(appStateActions.setUnityNodes(nodes));
  }, [selectedScene]);

  const handleScenes = useCallback((response: string) => {
    let scenes = response.split(",");
    dispatch(appStateActions.setSceneList(scenes));
  }, []);

  function handleSceneSelection(scene: string) {
    console.log("Selecting: " + scene);
    sendMessage("SceneManager", "OpenScene", scene);
  }

  function handleLookAt(target: string) {
    console.log("Looking at: " + target);
    sendMessage(target, "Snap", target);
  }

  function handleHighlight(target: string) {
    console.log("Highlighting: " + target);
    sendMessage(target, "HighlightBlock", target);
  }

  // Unity Functions
  function reset() {
    sendMessage("Main Camera", "Reset");
  }

  function listUnityNodes() {
    sendMessage("SceneManager", "RetrieveNodes");
  }

  function listUnityScenes() {
    sendMessage("SceneManager", "RetrieveScenes");
  }

  // Event Listeners
  useEffect(() => {
    window.addEventListener("resize", handleDimensions);
    addEventListener("OpenDataPanel", handleDataPanel);
    addEventListener("SendNodes", handleNodes);
    addEventListener("SendScenes", handleScenes);
    return () => {
      window.removeEventListener("resize", handleDimensions);
      removeEventListener("OpenDataPanel", handleDataPanel);
      removeEventListener("SendNodes", handleNodes);
      addEventListener("SendScenes", handleScenes);
    };
  }, [
    addEventListener,
    removeEventListener,
    handleDataPanel,
    handleNodes,
    handleScenes,
  ]);

  // Look At
  useEffect(() => {
    if(selectedAssetOnScene) handleLookAt(selectedAssetOnScene);
  }, [selectedAssetOnScene]);

  // Highlight
  useEffect(() => {
    if(highlightedGameObject) handleHighlight(highlightedGameObject);
  }, [highlightedGameObject]);

  // Switch Scene
  useEffect(() => {
    if(selectedScene) handleSceneSelection(selectedScene);
  }, [selectedScene]);
  
  // Rendering
  useEffect(() => {
      // Retrieve Scenes and Nodes from the WebGL Build;
      listUnityScenes();
      // listUnityNodes() is what takes GameObjects from Unity and will enable us to "link" them to the graph
      listUnityNodes(); 
  }, [selectedScene]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Unity
          className="webgl-canvas"
          unityProvider={unityProvider}
        />
      <Button variant="contained" sx={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => reset()}>
        Reset
      </Button>
    </Box>
  );
}

export default UnityInstance;