import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SUBTRACTION, Brush, Evaluator, ADDITION } from "three-bvh-csg";

const evaluator = new Evaluator();

let scene, camera, renderer, controls;
let box; // Reference to the mesh
let cutouts = [];
let result;

// Default dimensions
let width = 600,
  length = 1500,
  depth = 25;
let radius = 6.26;

const container = document.getElementById("three-container");

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f2);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.001,
    1000
  );
  camera.position.set(10, 15, 20);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(-3, 10, -10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  updateMesh(); // Create the initial mesh

  window.addEventListener("resize", onWindowResize);
}

function updateMesh() {
  if (box) {
    scene.remove(box); // Remove existing mesh
  }

  if (result) {
    scene.remove(result); // Remove existing mesh
  }

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, width / 100);
  shape.lineTo(depth / 100, width / 100);
  shape.lineTo(depth / 100, 0.8 * (width / 100));
  shape.quadraticCurveTo(
    depth / 100 + radius * 0.55228,
    (0.5 * width) / 100,
    depth / 100,
    (0.2 * width) / 100
  );
  shape.lineTo(depth / 100, 0);
  shape.lineTo(0, 0);

  const extrudeSettings = {
    steps: 5,
    depth: length / 100,
    bevelEnabled: false,
    curveSegments: 200,
  };

  const boxGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const texture = new THREE.TextureLoader().load("/beuk_2.jpg");
  texture.colorSpace = THREE.SRGBColorSpace;

  const boxMat = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.2,
    roughness: 0.1,
  });

  box = new Brush(boxGeo, boxMat);
  box.position.set(-depth / 200, -width / 200, -extrudeSettings.depth / 2);

  box.updateMatrixWorld();

  const geometry = new THREE.CylinderGeometry(2, 2, 20, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const cylinder = new Brush(geometry, material);
  cylinder.rotation.set(0, 0, -Math.PI / 2);

  const cylinderClone = cylinder.clone(); // Clone to preserve original state
  cylinderClone.updateMatrixWorld();

  // Get all cutout entries
  const cutoutEntries = document.querySelectorAll("#cutout-list .row");
  cutoutEntries.forEach((entry) => {
    let x = parseFloat(entry.querySelector("input.form-control-1").value) || 0;
    let y = parseFloat(entry.querySelector("input.form-control-2").value) || 0;
    let diameter =
      parseFloat(entry.querySelector("select.form-select").value) || 30;

    let sphereGeo = new THREE.CylinderGeometry(0.4, 0.4, 20, 32);
    let sphereMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    let sphere = new Brush(sphereGeo, sphereMat);
    sphere.position.set(0, y / 100, x / 100);
    sphere.rotation.set(0, 0, -Math.PI / 2);
    sphere.updateMatrixWorld();

    const cloneHole = sphere.clone();

    result = evaluator.evaluate(box, cloneHole, SUBTRACTION);
  });

  // result = evaluator.evaluate(box, result, SUBTRACTION);

  if (cutoutEntries.length > 0) {
    scene.add(result);
  } else {
    scene.add(box);
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  renderer.render(scene, camera);
  controls.update();
}

renderer.setAnimationLoop(animate);

// Update mesh when inputs change
document.getElementById("widthInput").addEventListener("input", function () {
  width = parseInt(this.value) || 0;
  updateMesh();
});

document.getElementById("lengthInput").addEventListener("input", function () {
  length = parseInt(this.value) || 0;
  updateMesh();
});

document.getElementById("depthSelect").addEventListener("change", function () {
  depth = parseInt(this.value);
  updateMesh();
});

// Add and remove cutouts dynamically
document.getElementById("add-cutout").addEventListener("click", function () {
  let cutoutList = document.getElementById("cutout-list");
  let childCount = cutoutList.children.length;
  let newCutout = document.createElement("div");
  newCutout.classList.add("row", "g-2", "align-items-center", "mb-2");
  newCutout.innerHTML = `
        <div class="col"><input type="text" class="form-control-1" placeholder="100" value="100"></div>
        <div class="col"><input type="text" class="form-control-2" placeholder="100" value="100"></div>
        <div class="col">
            <select class="form-select">
                <option selected>30</option>
                <option>25</option>
                <option>20</option>
            </select>
        </div>
        <div class="col-auto">
            <button class="btn btn-danger remove-cutout">✖</button>
        </div>
    `;
  cutoutList.appendChild(newCutout);

  newCutout
    .querySelector(".remove-cutout")
    .addEventListener("click", function () {
      newCutout.remove();
      updateMesh(); // Update scene after removing cutout
    });

  updateMesh();
});

document.querySelectorAll(".remove-cutout").forEach((button) => {
  button.addEventListener("click", function () {
    button.parentElement.parentElement.remove();
  });
});
