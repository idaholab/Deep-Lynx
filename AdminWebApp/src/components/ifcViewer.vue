<template>
  <v-dialog
      v-model="dialog" @click:outside="dialog = false;" width="80%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{$t("ifcViewer.IfcViewer")}}</v-btn>
    </template>
    <v-card>
      <v-container>
        <v-row>
          <v-alert v-if="!loaded" type="warning">
            {{$t('ifcViewer.loadWarning')}}
          </v-alert>

          <v-progress-linear indeterminate v-if="loading"></v-progress-linear>
          <v-col :cols="7">
            <h3 v-if="loaded">{{$t('ifcViewer.Model')}}</h3>
            <canvas v-show="!loading" :id="file.id" style="position: sticky; top: 0px;"></canvas>
          </v-col>
          <v-col :cols="5">
            <h3 v-if="loaded">{{$t('ifcViewer.Properties')}}</h3>

            <v-card v-if="loaded && selected">
              <div style="margin-left: 5px">
                <h4>{{$t('ifcViewer.name')}}</h4>
                <p>{{selected.Name.value}}</p>
                <h4>{{$t('ifcViewer.description')}}</h4>
                <p>{{selected.Description.value}}</p>
              </div>
              <h4 style="margin-left: 5px">{{$t('ifcViewer.rawProperties')}}</h4>
              <json-view v-if="selected" :max-depth="0" :data="selected" style="overflow-y: scroll"></json-view>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      <v-card-actions>
        <v-btn v-if="!loaded" @click="load()">{{$t('ifcViewer.loadModel')}}</v-btn>
        <v-btn v-if="loaded" @click="load()">{{$t('ifcViewer.resetModel')}}</v-btn>
        <v-btn v-if="loaded" @click="dialog = false">{{$t('ifcViewer.close')}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Config from "@/config";
import {Component, Prop, Vue} from "vue-property-decorator";
import {RetrieveJWT} from "@/auth/authentication_service";
import {
  Raycaster,
  Vector2
} from "three";

//@ts-ignore
import {disposeBoundsTree, computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh/build/index.module.js';
import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  MeshLambertMaterial,
} from "three";
import {
  OrbitControls
} from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import {FileT} from "@/api/types";

type SelectedItem = {
  Name: {
    type: number;
    value: string;
  };
  Description: {
    type: number;
    value: string;
  };
  GlobalID: {
    type: number;
    value: string;
  };
}

@Component
export default class IfcViewer extends Vue {
  @Prop({required: true})
  readonly file!: FileT

  @Prop({required: false})
  readonly icon!: boolean

  dialog = false
  selected: SelectedItem | null = null

  loading = false
  loaded = false

  load() {
    this.loading = true
    this.selected = null

    //Creates the Three.js scene
    const scene = new Scene();

    // viewport size
    const size = {
      width: 700,
      height: 600,
    };

    //Creates the camera (point of view of the user)
    // we offset it so that the user can see the axes helper
    const aspect = size.width / size.height;
    const camera = new PerspectiveCamera(75, aspect);
    camera.position.z = 15;
    camera.position.y = 13;
    camera.position.x = 8;

    //Creates the lights of the scene
    const lightColor = 0xffffff;

    const ambientLight = new AmbientLight(lightColor, 0.5);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(lightColor, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.target.position.set(-5, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    //Sets up the renderer, fetching the canvas
    const threeCanvas = document.getElementById(this.file.id);
    const renderer = new WebGLRenderer({
      canvas: threeCanvas as HTMLElement,
      alpha: true
    });

    renderer.setSize(size.width, size.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /*
    including this so you can see how to get a grid running if needed, must include the GridHelper from three.js

    const grid = new GridHelper(150, 60);
    scene.add(grid);
     */

    // renders a device to help the user see orientation
    const axes = new AxesHelper();
    //@ts-ignore
    axes.material.depthTest = false;
    axes.renderOrder = 1;
    scene.add(axes);

    //Creates the orbit controls (to navigate the scene)
    const controls = new OrbitControls(camera, threeCanvas as HTMLElement);
    controls.enableDamping = true;
    controls.target.set(-2, 0, 0);

    //Animation loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // material for highlighing an object when we mouse over it
    const preselectMat = new MeshLambertMaterial({
      transparent: true,
      opacity: 0.6,
      color: 0xff88ff,
      depthTest: false
    })

    // maintains a list of selected IFC models
    const ifcModels: any = [];

    // Sets up the IFC loading
    const ifcLoader = new IFCLoader();

    // bvh is a performance library, absolutely needed here
    ifcLoader.ifcManager.setupThreeMeshBVH(computeBoundsTree, disposeBoundsTree, acceleratedRaycast)

    // the web assembly package - must be served locally
    ifcLoader.ifcManager.setWasmPath("../files/");

    // without the authorization header you will fail when attempting to load the file from Deep Lynx
    ifcLoader.setRequestHeader({
      'Authorization': `Bearer ${RetrieveJWT()}`,
    })

    // this raycaster is for highlighting the elements we mouse over
    const raycaster = new Raycaster();
    // @ts-ignore
    raycaster.firstHitOnly = true;
    const mouse = new Vector2();

    ifcLoader.load(
        this.fileDownloadURL,
        (ifcModel) => {
          ifcModels.push(ifcModel.mesh)
          scene.add(ifcModel.mesh);
          this.loading = false;
          this.loaded = true;
        })

    // fires a ray and finds the intersecting object
    function cast(event: any) {
      // Computes the position of the mouse on the screen
      const bounds = threeCanvas!.getBoundingClientRect();

      const x1 = event.clientX - bounds.left;
      const x2 = bounds.right - bounds.left;
      mouse.x = (x1 / x2) * 2 - 1;

      const y1 = event.clientY - bounds.top;
      const y2 = bounds.bottom - bounds.top;
      mouse.y = -(y1 / y2) * 2 + 1;

      // Places it on the camera pointing to the mouse
      raycaster.setFromCamera(mouse, camera);

      // Casts a ray
      return raycaster.intersectObjects(ifcModels);
    }

    // selects the item under the mouse if exists - must pass the vue instance in so
    // we have access to the selected variable
    function pick(event: any, vue: Vue) {
      const found = cast(event)[0];
      if (found) {
        const index = found.faceIndex;
        //@ts-ignore
        const geometry = found.object.geometry;
        const ifc = ifcLoader.ifcManager;
        ifc.getExpressId(geometry, index as number)
        .then((id: any) => {
          //@ts-ignore
          ifc.getItemProperties(found.object.modelID, id, true)
          .then((properties) => {
            //@ts-ignore
            vue.selected = properties
          })
        })
      }
    }

    // set the listener
    if(threeCanvas){
      threeCanvas.ondblclick = (event) => pick(event, this)
    }

    const ifc = ifcLoader.ifcManager;

    // Reference to the previous selection
    const preselectModel = { id: - 1};

    // highlights an object that we've moused over if exists
    function highlight(event: any, material: any, model: any) {
      const found = cast(event)[0];
      if (found) {
        //@ts-ignore Gets model ID
        model.id = found.object.modelID;

        // Gets Express ID
        const index = found.faceIndex;
        //@ts-ignore
        const geometry = found.object.geometry;
        const ifc = ifcLoader.ifcManager;
        ifc.getExpressId(geometry, index as number)
        .then((id: any) => {
          // Creates subset
          ifcLoader.ifcManager.createSubset({
            modelID: model.id,
            ids: [id],
            material: material,
            scene: scene,
            removePrevious: true
          })
        })

      } else {
        // Removes previous highlight
        ifc.removeSubset(model.id, scene, material);
      }
    }

    window.onmousemove = (event: any) => highlight(
        event,
        preselectMat,
        preselectModel);


    // different material for selected item after double click
    const selectMat = new MeshLambertMaterial({
      transparent: true,
      opacity: 0.6,
      color: 0xff00ff,
      depthTest: false })

    const selectModel = { id: - 1};
    window.ondblclick = (event: any) => highlight(
        event,
        selectMat,
        selectModel );

  }

  get fileDownloadURL(): string {
    return `${Config.deepLynxApiUri}/containers/${this.file.container_id}/files/${this.file.id}/download`
  }
}
</script>