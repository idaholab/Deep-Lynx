// React
import React from "react";

// Hooks
import { useEffect, useState, useCallback, useRef } from "react";
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
import { ReactUnityEventParameter } from "react-unity-webgl/distribution/types/react-unity-event-parameters";

type Props = {
  handleLoadedState: (isLoaded: boolean) => void;
  loaderUrl: URL;
  dataUrl: URL;
  frameworkUrl: URL;
  codeUrl: URL;
};

const UnityInstance: React.FC<Props> = ({
  handleLoadedState,
  loaderUrl,
  dataUrl,
  frameworkUrl,
  codeUrl,
}) => {

  // Store
  const dispatch = useAppDispatch();

  // Dynamic resizing
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  // Unity
  const { unityProvider,
    isLoaded,
    sendMessage,
    addEventListener,
    removeEventListener
  } = useUnityContext({
    loaderUrl: loaderUrl.href,
    dataUrl: dataUrl.href,
    frameworkUrl: frameworkUrl.href,
    codeUrl: codeUrl.href,
  });

  // Variables
  const selectedScene: string = useAppSelector((state: any) => state.appState.selectedSceneObject);
  const selectedAssetOnScene: string = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  const highlightedGameObject: string = useAppSelector((state: any) => state.appState.highlightAssetOnScene);

  // Toggle loaded state in parent
  useEffect(() => {
    handleLoadedState(isLoaded);
    console.log("in unity instance", isLoaded)
  }, [isLoaded]);

  // Function Handlers
  const handleDimensions = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  // Update the type of the handleDataPanel function
  const handleDataPanel: (...parameters: ReactUnityEventParameter[]) => ReactUnityEventParameter = useCallback((...parameters) => {
    // Return a ReactUnityEventParameter as required by EventListeners
    return undefined as ReactUnityEventParameter;
  }, []);

  const handleNodes: (...parameters: ReactUnityEventParameter[]) => ReactUnityEventParameter = useCallback((...parameters) => {
    // similar to response = parameters[0]
    let [response] = parameters;
    let nodes = (response as string).split(",");
    dispatch(appStateActions.setUnityNodes(nodes));
    // Return a ReactUnityEventParameter as required by EventListeners
    return undefined as ReactUnityEventParameter;
  }, [selectedScene]);

  const handleScenes: (...parameters: ReactUnityEventParameter[]) => ReactUnityEventParameter = useCallback((...parameters) => {
    // similar to response = parameters[0]
    let [response] = parameters;
    let scenes = (response as string).split(",");
    dispatch(appStateActions.setSceneList(scenes));
    // Return a ReactUnityEventParameter as required by EventListeners
    return undefined as ReactUnityEventParameter;
  }, [selectedScene]);

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
        style={{ visibility: isLoaded ? "visible" : "hidden" }}
        className="webgl-canvas"
        unityProvider={unityProvider}
        tabIndex={0}
      />
      <Button variant="contained" sx={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => reset()}>
        Reset
      </Button>
    </Box>
  );
}

export default UnityInstance;
