// React
import React from "react";

// Hooks
import { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Styles
import '../../styles/App.scss';

// Unity
import { Unity, useUnityContext } from "react-unity-webgl";

// MUI Components
import {
  Box,
  Button,
} from "@mui/material";
import { appStateActions } from "../../../app/store";

function UnityInstance(props: any) {

  // Store
  const dispatch = useAppDispatch();

  const { unityProvider,
    sendMessage,
    addEventListener,
    removeEventListener,
    isLoaded, } = useUnityContext({
    // These 4 compiled assets are the bundle that Unity generates when you build to WebGL
    loaderUrl: 'webgl/sandbox.loader.js',
    dataUrl: 'webgl/sandbox.data',
    frameworkUrl: 'webgl/sandbox.framework.js',
    codeUrl: 'webgl/sandbox.wasm',
  });

  // Dynamic resizing
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

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
  }, []);

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
  type selectedAssetOnScene = string;
  const selectedAssetOnScene: selectedAssetOnScene = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  useEffect(() => {
    if(selectedAssetOnScene) handleLookAt(selectedAssetOnScene);
  }, [selectedAssetOnScene]);

  // Highlight
  type highlightedGameObject = string;
  const highlightedGameObject: highlightedGameObject = useAppSelector((state: any) => state.appState.highlightAssetOnScene);
  useEffect(() => {
    if(highlightedGameObject) handleHighlight(highlightedGameObject);
  }, [highlightedGameObject]);

  // Switch Scene
  type selectedScene = string;
  const selectedScene: selectedScene = useAppSelector((state: any) => state.appState.selectedSceneObject);
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
