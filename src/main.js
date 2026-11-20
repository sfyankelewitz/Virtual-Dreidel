import "./style.css";
import "@babylonjs/loaders/glTF";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import {
  Engine, Scene, ArcRotateCamera, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, PointLight, MeshBuilder, PBRMaterial,
  StandardMaterial, DynamicTexture, TransformNode, ShadowGenerator,
  GlowLayer, Texture, Scalar, CubeTexture, SceneLoader
} from "@babylonjs/core";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.075, 0.078, 0.095, 1);
scene.environmentTexture = CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/environmentSpecular.env", scene);
scene.environmentIntensity = 1.0;

// Replace the generic studio reflections with a real warm living-room HDRI.
// The compact 1K CC0 panorama gives the walnut, brass and polished wood a
// coherent photographic reflection source. The Babylon studio map remains
// active until the HDR file finishes loading, and remains the fallback on error.
try {
  const warmRoomHDR = new HDRCubeTexture(
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/lebombo/lebombo_1k.hdr",
    scene, 256, false, true, false, true,
    () => {
      scene.environmentTexture = warmRoomHDR;
      scene.environmentIntensity = 0.72;
      console.info("Virtual Dreidel: warm Poly Haven room HDRI loaded (CC0).");
    },
    (message, error) => console.warn("Virtual Dreidel: using studio reflections; room HDRI unavailable.", message, error)
  );
} catch (error) {
  console.warn("Virtual Dreidel: using studio reflections; room HDRI could not be initialized.", error);
}

const camera = new ArcRotateCamera("camera", -Math.PI / 2.25, 1.34, 19.0, new Vector3(0, 0.05, 0), scene);
camera.attachControl(canvas, true);
// Keep the camera inside a deliberate cinematic viewing arc. This prevents
// orbiting through the walls and keeps the table framed during play.
camera.lowerRadiusLimit = 16.5;
camera.upperRadiusLimit = 23.5;
camera.lowerBetaLimit = 1.18;
camera.upperBetaLimit = 1.48;
camera.lowerAlphaLimit = -2.05;
camera.upperAlphaLimit = -0.72;
camera.checkCollisions = false;
scene.collisionsEnabled = false;
camera.wheelPrecision = 65;
camera.panningSensibility = 0;
camera.inertia = 0.72;
let desiredCameraRadius = camera.radius;
let returnCameraRadius = camera.radius;

const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.68;
hemi.diffuse = new Color3(1, 0.88, 0.72);
hemi.groundColor = new Color3(0.18, 0.15, 0.13);
const key = new DirectionalLight("warmKey", new Vector3(-5, -9, 6), scene);
key.position = new Vector3(5, 10, -5);
key.intensity = 1.45;
key.diffuse = new Color3(1, 0.82, 0.61);
key.specular = new Color3(1, 0.9, 0.72);
const tableFill = new PointLight("tableSoftboxFill", new Vector3(-1.5, 7.5, -1.2), scene);
tableFill.diffuse = new Color3(1, 0.84, 0.66);
tableFill.intensity = 0.32;
tableFill.range = 15;
const turnSpot = new PointLight("activePlayerSpotlight", new Vector3(0, 4.2, -5.5), scene);
turnSpot.diffuse = new Color3(1, 0.77, 0.43); turnSpot.intensity = 0.42; turnSpot.range = 7;
const coolRim = new PointLight("coolRoomRim", new Vector3(6.5, 5.2, 2.5), scene);
coolRim.diffuse = new Color3(0.62, 0.74, 1);
coolRim.intensity = 0.28;
coolRim.range = 13;
const fill = new DirectionalLight("coolFill", new Vector3(4, -5, -3), scene);
fill.position = new Vector3(-6, 5, 4);
fill.intensity = 0.8;
fill.diffuse = new Color3(0.65, 0.76, 1);

const shadows = new ShadowGenerator(2048, key);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 32;
shadows.usePercentageCloserFiltering = true;
shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
shadows.setDarkness(0.36);
shadows.bias = 0.0005;
shadows.normalBias = 0.025;
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.exposure = 1.08;
scene.imageProcessingConfiguration.contrast = 1.22;

// Cinematic presentation pass: cleaner edges, controlled highlight bloom and
// HDR tone mapping. Keep the effect restrained so brass and flames glow softly
// without making the whole room look synthetic or overexposed.
const renderPipeline = new DefaultRenderingPipeline(
  "familyRoomCinematicPipeline", true, scene, [camera]
);
renderPipeline.samples = 4;
renderPipeline.fxaaEnabled = true;
renderPipeline.imageProcessingEnabled = true;
renderPipeline.bloomEnabled = true;
renderPipeline.bloomThreshold = 0.92;
renderPipeline.bloomWeight = 0.035;
renderPipeline.bloomKernel = 48;
renderPipeline.bloomScale = 0.5;

const glow = new GlowLayer("subtleGlow", scene);
glow.intensity = 0.08;
scene.ambientColor = new Color3(0.16, 0.14, 0.12);

function pbr(name, color, metallic = 0, roughness = 0.55) {
  const mat = new PBRMaterial(name, scene);
  mat.albedoColor = Color3.FromHexString(color);
  mat.metallic = metallic;
  mat.roughness = roughness;
  return mat;
}


// High-frequency surface detail. These grayscale maps feed the PBR normal
// channel so light catches grain, woven fibers and tiny plaster irregularities
// instead of leaving every object looking like smooth colored plastic.
function microSurfaceTexture(name, style = "wood", size = 512) {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  if (style === "wood") {
    for (let i = 0; i < 420; i++) {
      const y = Math.random() * size;
      const amplitude = 1 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 12) {
        ctx.lineTo(x, y + Math.sin(x / (18 + Math.random() * 10) + i) * amplitude);
      }
      ctx.strokeStyle = i % 5 ? "rgba(35,25,18,.24)" : "rgba(245,220,185,.28)";
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.stroke();
    }
    for (let i = 0; i < 36; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(x, y, 12 + Math.random() * 30, 3 + Math.random() * 7, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(35,22,12,.24)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (style === "fabric") {
    for (let i = 0; i < size; i += 3) {
      ctx.strokeStyle = i % 6 ? "rgba(35,35,35,.22)" : "rgba(245,245,245,.28)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    for (let i = 0; i < 5200; i++) {
      const v = Math.random() > .5 ? 255 : 30;
      ctx.fillStyle = "rgba(" + v + "," + v + "," + v + ",.12)";
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.2, 1.2);
    }
  } else if (style === "stone") {
    for (let i = 0; i < 14000; i++) {
      const v = Math.random() > .5 ? 245 : 28;
      ctx.fillStyle = "rgba(" + v + "," + v + "," + v + ",.13)";
      const r = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * size, Math.random() * size, r, r);
    }
  }
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.uScale = 2.5;
  tex.vScale = 2.5;
  tex.anisotropicFilteringLevel = 8;
  return tex;
}

function wovenTexture(name, base, thread, spacing = 8) {
  const tex = new DynamicTexture(name, { width: 512, height: 512 }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 512; i += spacing) {
    ctx.strokeStyle = thread; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
  }
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.035)";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  tex.update(); tex.wrapU = Texture.WRAP_ADDRESSMODE; tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

function plasterTexture() {
  const tex = new DynamicTexture("subtlePlaster", { width: 512, height: 512 }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = "#b9a48a"; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const tone = i % 2 ? "rgba(255,245,225,.06)" : "rgba(65,45,30,.035)";
    ctx.fillStyle = tone; ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  tex.update(); tex.wrapU = Texture.WRAP_ADDRESSMODE; tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

function hardwoodTexture() {
  const tex = new DynamicTexture("livingRoomHardwood", { width: 1024, height: 1024 }, scene, false);
  const ctx = tex.getContext();
  const boards = ["#6d4b35", "#79563d", "#68462f", "#815d42", "#735039"];
  const rowHeight = 128;
  for (let row = 0; row < 8; row++) {
    let x = row % 2 ? -150 : 0;
    while (x < 1024) {
      const width = 220 + ((Math.floor((x + 150) / 220) + row * 3) % 3) * 70;
      ctx.fillStyle = boards[(row * 2 + Math.floor((x + 150) / 180)) % boards.length];
      ctx.fillRect(x + 2, row * rowHeight + 2, width - 4, rowHeight - 4);
      ctx.strokeStyle = "rgba(35,20,12,.55)"; ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, row * rowHeight + 2, width - 4, rowHeight - 4);
      for (let grain = 0; grain < 9; grain++) {
        const gy = row * rowHeight + 18 + grain * 12 + Math.random() * 5;
        ctx.strokeStyle = grain % 3 ? "rgba(225,180,125,.09)" : "rgba(30,17,10,.13)";
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 12, gy);
        ctx.bezierCurveTo(x + width * .3, gy - 4, x + width * .7, gy + 5, x + width - 12, gy);
        ctx.stroke();
      }
      x += width;
    }
  }
  tex.update(); tex.wrapU = Texture.WRAP_ADDRESSMODE; tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

function woodTexture() {
  const tex = new DynamicTexture("walnutGrain", { width: 1024, height: 1024 }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = "#68452d";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 190; i++) {
    const y = Math.random() * 1024;
    const wave = Math.random() * 9 + 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 24) ctx.lineTo(x, y + Math.sin(x / 70 + i) * wave + Math.sin(x / 19 + i) * 1.5);
    ctx.strokeStyle = i % 5 === 0 ? "rgba(35,17,10,.13)" : "rgba(215,163,104,.055)";
    ctx.lineWidth = i % 7 === 0 ? 3 : 1;
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    ctx.beginPath(); ctx.ellipse(x, y, 35 + Math.random() * 55, 5 + Math.random() * 12, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(31,15,8,.10)"; ctx.lineWidth = 2; ctx.stroke();
  }
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

const tableMat = pbr("walnutTable", "#805536", 0.05, 0.36);
tableMat.albedoTexture = woodTexture();
tableMat.bumpTexture = microSurfaceTexture("walnutTableNormal", "wood");
tableMat.bumpTexture.level = 0.035;
tableMat.clearCoat.isEnabled = true;
tableMat.clearCoat.intensity = 0.48;
tableMat.clearCoat.roughness = 0.24;
const darkWood = pbr("darkTableEdge", "#38251b", 0.12, 0.32);
darkWood.bumpTexture = microSurfaceTexture("darkWalnutNormal", "wood");
darkWood.bumpTexture.level = 0.025;
darkWood.clearCoat.isEnabled = true;
darkWood.clearCoat.intensity = 0.28;
darkWood.clearCoat.roughness = 0.3;
const brass = pbr("agedBrass", "#b88b4d", 0.88, 0.2);
brass.bumpTexture = microSurfaceTexture("brushedBrassNormal", "wood");
brass.bumpTexture.level = 0.055;
const felt = pbr("tableInlay", "#203a31", 0.02, 0.96);
 felt.albedoTexture = wovenTexture("tableFeltTexture", "#203a31", "rgba(190,210,185,.075)", 5);
felt.bumpTexture = microSurfaceTexture("tableFeltNormal", "fabric");
felt.bumpTexture.level = 0.035;
const coinMat = pbr("coinGold", "#e5b957", 0.88, 0.22);
const coinFaceMat = pbr("coinFaceGold", "#f5d783", 0.9, 0.2);
const coinMintTexture = new DynamicTexture("coinMintStamp", { width: 256, height: 256 }, scene, true);
const coinCtx = coinMintTexture.getContext();
coinCtx.fillStyle = "#f4d98e"; coinCtx.fillRect(0, 0, 256, 256);
coinCtx.strokeStyle = "#9c6d2e"; coinCtx.lineWidth = 8;
coinCtx.beginPath(); coinCtx.arc(128, 128, 100, 0, Math.PI * 2); coinCtx.stroke();
coinCtx.strokeStyle = "#9c6d2e"; coinCtx.lineWidth = 13;
coinCtx.beginPath();
coinCtx.moveTo(128, 42); coinCtx.lineTo(203, 174); coinCtx.lineTo(53, 174); coinCtx.closePath(); coinCtx.stroke();
coinCtx.beginPath();
coinCtx.moveTo(128, 214); coinCtx.lineTo(53, 82); coinCtx.lineTo(203, 82); coinCtx.closePath(); coinCtx.stroke();
coinMintTexture.update();
coinFaceMat.albedoTexture = coinMintTexture;
coinMat.bumpTexture = microSurfaceTexture("mintedCoinMetalNormal", "wood");
coinMat.bumpTexture.level = 0.045;
coinFaceMat.bumpTexture = microSurfaceTexture("coinFaceReliefNormal", "stone");
coinFaceMat.bumpTexture.level = 0.035;
coinMat.clearCoat.isEnabled = true;
coinMat.clearCoat.intensity = 0.32;
coinMat.clearCoat.roughness = 0.18;
const darkMat = pbr("darkMetal", "#302b2a", 0.8, 0.3);
const roomWall = pbr("warmPlaster", "#b9a48a", 0.02, 0.92);
const wallTrim = pbr("paintedTrim", "#e2d2b8", 0.04, 0.68);
const upholstery = pbr("deepOliveVelvet", "#536052", 0.02, 0.96);
const upholsteryLight = pbr("cushionVelvet", "#78816d", 0.02, 0.98);
const rugMat = pbr("wovenRug", "#6d5142", 0.0, 1);
const cabinetMat = pbr("sideboardWalnut", "#4b3023", 0.08, 0.42);
const creamMat = pbr("lampLinen", "#e9d7b5", 0.0, 0.9);
const windowGlass = pbr("eveningWindowGlass", "#536c78", 0.22, 0.22);
const curtainMat = pbr("heavyCurtain", "#8a6b55", 0.0, 0.96);
// Keep the plaster color calm at game-camera distance; the old dense pixel texture read as visual noise.
roomWall.bumpTexture = microSurfaceTexture("plasterNormal", "stone");
roomWall.bumpTexture.level = 0.012;
upholstery.albedoTexture = wovenTexture("oliveVelvetWeave", "#536052", "rgba(220,225,200,.06)", 5);
upholstery.bumpTexture = microSurfaceTexture("velvetNormal", "fabric");
upholstery.bumpTexture.level = 0.045;
upholsteryLight.albedoTexture = wovenTexture("cushionWeave", "#78816d", "rgba(245,240,215,.08)", 6);
upholsteryLight.bumpTexture = microSurfaceTexture("cushionNormal", "fabric");
upholsteryLight.bumpTexture.level = 0.04;
curtainMat.albedoTexture = wovenTexture("curtainLinenWeave", "#8a6b55", "rgba(235,205,170,.08)", 7);
curtainMat.bumpTexture = microSurfaceTexture("linenNormal", "fabric");
curtainMat.bumpTexture.level = 0.05;
tableMat.roughness = 0.3;
tableMat.metallic = 0.08;
tableMat.clearCoat.isEnabled = true;
tableMat.clearCoat.intensity = 0.32;
tableMat.clearCoat.roughness = 0.28;
let selectedTableFinish = "walnut";
const ownedTableFinishes = new Set(["walnut"]);
try {
  const saved = JSON.parse(localStorage.getItem("virtualDreidelTableFinishes") || "[]");
  if (Array.isArray(saved)) saved.forEach(finish => ownedTableFinishes.add(finish));
} catch { /* Keep the default walnut tabletop. */ }
function setTableFinish(finish) {
  selectedTableFinish = finish;
  if (finish === "ebony") tableMat.albedoColor = Color3.FromHexString("#51402f");
  else if (finish === "honey") tableMat.albedoColor = Color3.FromHexString("#d1a06b");
  else tableMat.albedoColor = Color3.FromHexString("#ffffff");
  document.querySelectorAll(".table-finish-option").forEach(button => {
    button.classList.toggle("active", button.dataset.finish === finish);
  });
  try { localStorage.setItem("virtualDreidelSelectedTableFinish", finish); } catch { /* Current selection still applies. */ }
}
try {
  const savedTableFinish = localStorage.getItem("virtualDreidelSelectedTableFinish");
  if (savedTableFinish && ownedTableFinishes.has(savedTableFinish)) setTableFinish(savedTableFinish);
} catch { /* Use the walnut table by default. */ }


// A warm, enclosed living-room backdrop gives the table a real sense of place.
const roomFloor = MeshBuilder.CreateGround("livingRoomFloor", { width: 34, height: 30 }, scene);
roomFloor.position.set(0, -1.72, 0);
const roomFloorMat = pbr("roomFloorMat", "#76563d", 0.02, 0.58);
roomFloorMat.albedoTexture = hardwoodTexture();
roomFloorMat.bumpTexture = microSurfaceTexture("floorOakNormal", "wood");
roomFloorMat.bumpTexture.level = 0.025;
roomFloor.material = roomFloorMat;
roomFloor.receiveShadows = true;
roomFloor.checkCollisions = true;
const backWall = MeshBuilder.CreateBox("livingRoomBackWall", { width: 30, height: 12, depth: 0.35 }, scene);
backWall.position.set(0, 4.2, 11.8); backWall.material = roomWall;
backWall.checkCollisions = true; backWall.isPickable = false;
const leftWall = MeshBuilder.CreateBox("livingRoomLeftWall", { width: 0.35, height: 12, depth: 24 }, scene);
leftWall.position.set(-14.8, 4.2, 0); leftWall.material = roomWall;
leftWall.checkCollisions = true; leftWall.isPickable = false;

// A built-in walnut bookcase adds lived-in detail to the side of the room.
const bookcaseBack = MeshBuilder.CreateBox("bookcaseBack", { width: 0.22, height: 5.8, depth: 6.5 }, scene);
bookcaseBack.position.set(-14.48, 1.18, 0.6); bookcaseBack.material = cabinetMat;
for (const z of [-2.55, 3.75]) {
  const post = MeshBuilder.CreateBox("bookcaseSide", { width: 0.72, height: 5.9, depth: 0.24 }, scene);
  post.position.set(-14.05, 1.18, z); post.material = darkWood;
}
const shelfLevels = [-1.45, -0.12, 1.21, 2.54, 3.87];
for (const y of shelfLevels) {
  const shelf = MeshBuilder.CreateBox("bookcaseShelf", { width: 0.82, height: 0.15, depth: 6.45 }, scene);
  shelf.position.set(-14.04, y, 0.6); shelf.material = darkWood;
}
const bookColors = ["#6d3028", "#31483f", "#283d55", "#8b673d", "#5a3c62", "#9a7b4e", "#3e4845"];
const bookMaterials = bookColors.map((color, i) => pbr("bookSpine" + i, color, 0.02, 0.78));
shelfLevels.slice(0, 4).forEach((y, row) => {
  for (let i = 0; i < 13; i++) {
    const h = 0.72 + ((i * 7 + row * 3) % 5) * 0.055;
    const book = MeshBuilder.CreateBox("libraryBook", { width: 0.25, height: h, depth: 0.27 }, scene);
    book.position.set(-13.68, y + 0.075 + h / 2, -2.25 + i * 0.47);
    book.rotation.x = (i % 4 === 0 ? -0.035 : 0.015);
    book.material = bookMaterials[(i + row) % bookMaterials.length];
  }
});

const rightWall = MeshBuilder.CreateBox("livingRoomRightWall", { width: 0.35, height: 12, depth: 24 }, scene);
rightWall.position.set(14.8, 4.2, 0); rightWall.material = roomWall;
rightWall.checkCollisions = true; rightWall.isPickable = false;

// Tall window, divided into elegant panes, with heavy warm-toned curtains.
const windowFrame = MeshBuilder.CreateBox("livingRoomWindowFrame", { width: 0.2, height: 4.5, depth: 6.4 }, scene);
windowFrame.position.set(14.48, 4.25, 0.4); windowFrame.material = cabinetMat;
const windowPane = MeshBuilder.CreateBox("livingRoomWindowPane", { width: 0.08, height: 4.15, depth: 6.05 }, scene);
windowPane.position.set(14.34, 4.25, 0.4);
const nightTexture = new DynamicTexture("eveningWindowView", { width: 512, height: 512 }, scene, false);
const nightCtx = nightTexture.getContext();
const nightGradient = nightCtx.createLinearGradient(0, 0, 0, 512);
nightGradient.addColorStop(0, "#192c46"); nightGradient.addColorStop(1, "#b47a58");
nightCtx.fillStyle = nightGradient; nightCtx.fillRect(0, 0, 512, 512);
nightCtx.fillStyle = "#f2d6a2"; nightCtx.beginPath(); nightCtx.arc(380, 112, 36, 0, Math.PI * 2); nightCtx.fill();
for (let i = 0; i < 70; i++) {
  nightCtx.fillStyle = "rgba(255,238,200,.7)";
  nightCtx.fillRect((i * 83) % 512, (i * 137) % 290, 2, 2);
}
nightCtx.fillStyle = "#202a35";
for (let i = 0; i < 15; i++) {
  const x = i * 38 - 10, h = 65 + (i * 47) % 110;
  nightCtx.fillRect(x, 512 - h, 28, h);
  nightCtx.fillStyle = "#d8a96d";
  for (let y = 512 - h + 12; y < 500; y += 18) nightCtx.fillRect(x + 7, y, 4, 5);
  nightCtx.fillStyle = "#202a35";
}
nightTexture.update();
const windowViewMat = pbr("nightWindowView", "#ffffff", 0.02, 0.4);
windowViewMat.albedoTexture = nightTexture;
windowViewMat.emissiveTexture = nightTexture;
windowViewMat.emissiveColor = new Color3(0.32, 0.3, 0.28);
windowPane.material = windowViewMat;
for (const z of [-1.55, 0.4, 2.35]) {
  const mullion = MeshBuilder.CreateBox("windowMullion", { width: 0.1, height: 4.1, depth: 0.11 }, scene);
  mullion.position.set(14.25, 4.25, z); mullion.material = brass;
}
const windowCrossbar = MeshBuilder.CreateBox("windowCrossbar", { width: 0.1, height: 0.12, depth: 6.0 }, scene);
windowCrossbar.position.set(14.25, 4.25, 0.4); windowCrossbar.material = brass;
for (const z of [-3.0, 3.8]) {
  const curtain = MeshBuilder.CreateBox("windowCurtain", { width: 0.34, height: 4.9, depth: 0.85 }, scene);
  curtain.position.set(14.18, 4.2, z); curtain.material = curtainMat;
  for (let fold = 0; fold < 7; fold++) {
    const pleat = MeshBuilder.CreateBox("curtainPleat", { width: 0.37, height: 4.75, depth: 0.045 }, scene);
    pleat.position.set(13.98, 4.2, z - 0.34 + fold * 0.11);
    pleat.material = curtainMat;
  }
}
for (const x of [-13.7, 13.7]) {
  const trim = MeshBuilder.CreateBox("wallBaseboard", { width: 0.16, height: 0.38, depth: 23.5 }, scene);
  trim.position.set(x, -1.48, 0); trim.material = wallTrim;
}
const backBaseboard = MeshBuilder.CreateBox("backWallBaseboard", { width: 29, height: 0.38, depth: 0.16 }, scene);
backBaseboard.position.set(0, -1.48, 11.55); backBaseboard.material = wallTrim;
for (const y of [ -1.24, -1.08 ]) {
  const wallMoulding = MeshBuilder.CreateBox("backWallMoulding", { width: 29, height: 0.045, depth: 0.09 }, scene);
  wallMoulding.position.set(0, y, 11.42); wallMoulding.material = brass;
}

// A walnut console and a nine-branch brass menorah bring a warm Chanukah
// detail into the living room, behind the sofa.
const consoleTop = MeshBuilder.CreateBox("walnutConsoleTop", { width: 6.2, height: 0.18, depth: 0.78 }, scene);
consoleTop.position.set(0, -0.42, 10.55); consoleTop.material = cabinetMat;
for (const x of [-2.75, 2.75]) {
  for (const z of [10.28, 10.82]) {
    const leg = MeshBuilder.CreateBox("consoleLeg", { width: 0.16, height: 1.15, depth: 0.16 }, scene);
    leg.position.set(x, -1.08, z); leg.material = darkWood;
  }
}
const menorahBase = MeshBuilder.CreateCylinder("menorahBase", { diameter: 0.9, height: 0.12, tessellation: 48 }, scene);
menorahBase.position.set(0, -0.27, 10.5); menorahBase.material = brass;
const menorahStem = MeshBuilder.CreateCylinder("menorahCenterStem", { diameter: 0.11, height: 1.45, tessellation: 32 }, scene);
menorahStem.position.set(0, 0.49, 10.5); menorahStem.material = brass;
const menorahCandleWax = pbr("menorahIvoryWax", "#f0dfbd", 0.0, 0.72);
const flameMat = new StandardMaterial("menorahFlameMaterial", scene);
flameMat.diffuseColor = new Color3(1, 0.42, 0.08);
flameMat.emissiveColor = new Color3(1, 0.28, 0.035);
const menorahFlames = [];
const menorahOffsets = [-1.45, -1.08, -0.72, -0.36, 0, 0.36, 0.72, 1.08, 1.45];
menorahOffsets.forEach((offset, index) => {
  const height = index === 4 ? 1.38 : 0.72 + (1 - Math.abs(offset) / 1.45) * 0.18;
  if (offset !== 0) {
    const branch = MeshBuilder.CreateCylinder("menorahBranch", { diameter: 0.075, height: Math.abs(offset), tessellation: 24 }, scene);
    branch.position.set(offset / 2, height - 0.18, 10.5);
    branch.rotation.z = offset > 0 ? Math.PI / 2 : -Math.PI / 2;
    branch.material = brass;
  }
  const candleCup = MeshBuilder.CreateCylinder("menorahCandleCup", { diameter: 0.19, height: 0.12, tessellation: 32 }, scene);
  candleCup.position.set(offset, height - 0.08, 10.5); candleCup.material = brass;
  const candle = MeshBuilder.CreateCylinder("menorahCandle", { diameter: 0.105, height: 0.34, tessellation: 24 }, scene);
  candle.position.set(offset, height + 0.13, 10.5); candle.material = menorahCandleWax;
  const flame = MeshBuilder.CreateSphere("menorahFlame", { diameter: 0.13, segments: 16 }, scene);
  flame.position.set(offset, height + 0.37, 10.5); flame.scaling.y = 1.45; flame.material = flameMat;
  menorahFlames.push(flame);
});
const menorahGlow = new PointLight("menorahWarmGlow", new Vector3(0, 1.15, 10.25), scene);
menorahGlow.diffuse = new Color3(1, 0.46, 0.16); menorahGlow.intensity = 0.75; menorahGlow.range = 8;


// Large framed artwork, kept abstract so it reads as room decor rather than game UI.
const artFrame = MeshBuilder.CreateBox("wallArtFrame", { width: 4.2, height: 2.8, depth: 0.16 }, scene);
artFrame.position.set(0, 4.25, 11.48); artFrame.material = brass;
const artCanvas = MeshBuilder.CreateBox("wallArtCanvas", { width: 3.9, height: 2.5, depth: 0.08 }, scene);
artCanvas.position.set(0, 4.25, 11.36);
const artTexture = new DynamicTexture("livingRoomLandscapeArt", { width: 768, height: 512 }, scene, false);
const artCtx = artTexture.getContext();
const artGradient = artCtx.createLinearGradient(0, 0, 0, 512);
artGradient.addColorStop(0, "#344b50"); artGradient.addColorStop(0.58, "#b47f5b"); artGradient.addColorStop(1, "#273d37");
artCtx.fillStyle = artGradient; artCtx.fillRect(0, 0, 768, 512);
artCtx.fillStyle = "#e5bd83"; artCtx.beginPath(); artCtx.arc(555, 150, 62, 0, Math.PI * 2); artCtx.fill();
artCtx.fillStyle = "#293c3a"; artCtx.beginPath(); artCtx.moveTo(0, 380); artCtx.lineTo(180, 190); artCtx.lineTo(340, 380); artCtx.lineTo(500, 220); artCtx.lineTo(768, 410); artCtx.lineTo(768, 512); artCtx.lineTo(0, 512); artCtx.fill();
artCtx.fillStyle = "#6b6a4f"; artCtx.beginPath(); artCtx.moveTo(0, 430); artCtx.lineTo(230, 300); artCtx.lineTo(420, 430); artCtx.lineTo(620, 315); artCtx.lineTo(768, 430); artCtx.lineTo(768, 512); artCtx.lineTo(0, 512); artCtx.fill();
artTexture.update();
const artMaterial = pbr("artCanvasMaterial", "#ffffff", 0, 0.9);
artMaterial.albedoTexture = artTexture;
artCanvas.material = artMaterial;
const artSun = MeshBuilder.CreateDisc("artSun", { radius: 0.72, tessellation: 64 }, scene);
artSun.position.set(0, 4.35, 11.29); artSun.rotation.y = Math.PI; artSun.material = brass;

// A low, generously cushioned sofa sits against the back wall.
const sofaBase = MeshBuilder.CreateBox("sofaBase", { width: 7.5, height: 0.72, depth: 1.65 }, scene);
sofaBase.position.set(0, -1.28, 8.9); sofaBase.material = upholstery;
const sofaBack = MeshBuilder.CreateSphere("sofaBack", { diameter: 1, segments: 32 }, scene);
sofaBack.scaling.set(3.75, 0.9, 0.36);
sofaBack.position.set(0, -0.58, 9.48); sofaBack.material = upholstery;
for (const x of [-2.85, -1.42, 0, 1.42, 2.85]) {
  const backSeam = MeshBuilder.CreateBox("sofaBackSeam", { width: 0.018, height: 1.45, depth: 0.018 }, scene);
  backSeam.position.set(x, -0.55, 9.16); backSeam.material = upholsteryLight;
}
for (const x of [-3.65, 3.65]) {
  const arm = MeshBuilder.CreateSphere("sofaArm", { diameter: 1, segments: 24 }, scene);
  arm.scaling.set(0.38, 0.63, 0.9);
  arm.position.set(x, -1.12, 8.9); arm.material = upholstery;
}
for (const x of [-2.45, -0.85, 0.85, 2.45]) {
  const cushion = MeshBuilder.CreateSphere("sofaCushion", { diameter: 1, segments: 24 }, scene);
  cushion.scaling.set(0.78, 0.18, 0.67);
  cushion.position.set(x, -0.84, 8.55); cushion.material = upholsteryLight;
  const piping = MeshBuilder.CreateBox("sofaCushionPiping", { width: 1.42, height: 0.025, depth: 0.025 }, scene);
  piping.position.set(x, -0.75, 7.94); piping.material = creamMat;
}
// Soft accent pillows make the sofa feel lived-in.
for (const [x, color] of [[-2.65, "#b58b68"], [2.65, "#9b7964"]]) {
  const pillowMat = pbr("sofaAccentPillow", color, 0, 1);
  const pillow = MeshBuilder.CreateSphere("sofaAccentPillow", { diameter: 1, segments: 24 }, scene);
  pillow.scaling.set(0.48, 0.43, 0.19);
  pillow.position.set(x, -0.35, 9.02); pillow.rotation.z = x < 0 ? -0.12 : 0.12; pillow.material = pillowMat;
}

// Three upholstered armchairs complete the family seating around the table;
// the sofa serves as the fourth place in this cozy living-room arrangement.
function makeArmchair(x, z, angle) {
  const root = new TransformNode("livingRoomArmchair", scene);
  root.position.set(x, 0, z);
  root.rotation.y = angle;
  const seat = MeshBuilder.CreateBox("armchairSeat", { width: 2.45, height: 0.34, depth: 2.0 }, scene);
  seat.parent = root; seat.position.set(0, -0.95, 0); seat.material = upholstery;
  const cushion = MeshBuilder.CreateSphere("armchairSeatCushion", { diameter: 1, segments: 24 }, scene);
  cushion.parent = root; cushion.scaling.set(1.08, 0.18, 0.86);
  cushion.position.set(0, -0.66, -0.03); cushion.material = upholsteryLight;
  const back = MeshBuilder.CreateSphere("armchairBack", { diameter: 1, segments: 28 }, scene);
  back.parent = root; back.scaling.set(1.23, 0.84, 0.22);
  back.position.set(0, 0.08, -0.82); back.material = upholstery;
  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateSphere("armchairArm", { diameter: 1, segments: 24 }, scene);
    arm.parent = root; arm.scaling.set(0.24, 0.43, 0.92);
    arm.position.set(side * 1.04, -0.23, 0.02); arm.material = upholstery;
    const leg = MeshBuilder.CreateBox("armchairLeg", { width: 0.16, height: 0.9, depth: 0.16 }, scene);
    leg.parent = root; leg.position.set(side * 0.95, -1.24, 0.72); leg.material = cabinetMat;
    const rearLeg = MeshBuilder.CreateBox("armchairLeg", { width: 0.16, height: 0.9, depth: 0.16 }, scene);
    rearLeg.parent = root; rearLeg.position.set(side * 0.95, -1.24, -0.72); rearLeg.material = cabinetMat;
  }
  return root;
}
makeArmchair(0, -9.0, 0);
makeArmchair(-8.0, 0, Math.PI / 2);
makeArmchair(8.0, 0, -Math.PI / 2);
// Soft seat pads and small brass feet add depth to the armchairs.
for (const [x, z] of [[0, -9.0], [-8.0, 0], [8.0, 0]]) {
  const seatPad = MeshBuilder.CreateBox("armchairSeatPad", { width: 1.72, height: 0.12, depth: 1.35 }, scene);
  seatPad.position.set(x, -0.65, z); seatPad.material = upholsteryLight;
}
const rugTexture = new DynamicTexture("wovenRugTexture", { width: 512, height: 512 }, scene, false);
const rugCtx = rugTexture.getContext();
rugCtx.fillStyle = "#6d5142"; rugCtx.fillRect(0, 0, 512, 512);
for (let i = 0; i < 512; i += 7) {
  rugCtx.strokeStyle = i % 14 === 0 ? "rgba(225,190,145,.16)" : "rgba(25,17,14,.13)";
  rugCtx.lineWidth = 2;
  rugCtx.beginPath(); rugCtx.moveTo(0, i); rugCtx.lineTo(512, i); rugCtx.stroke();
  rugCtx.beginPath(); rugCtx.moveTo(i, 0); rugCtx.lineTo(i, 512); rugCtx.stroke();
}
rugTexture.update();
rugMat.albedoTexture = rugTexture;
const rug = MeshBuilder.CreateBox("livingRoomRug", { width: 17, height: 0.08, depth: 13 }, scene);
rug.position.set(0, -1.64, -0.1); rug.material = rugMat;
const rugBorderMat = pbr("rugBorder", "#a88a63", 0.02, 0.9);
for (const x of [-8.35, 8.35]) {
  const border = MeshBuilder.CreateBox("rugBorder", { width: 0.08, height: 0.025, depth: 12.45 }, scene);
  border.position.set(x, -1.585, -0.1); border.material = rugBorderMat;
}
for (const z of [-6.25, 6.05]) {
  const border = MeshBuilder.CreateBox("rugBorder", { width: 16.7, height: 0.025, depth: 0.08 }, scene);
  border.position.set(0, -1.585, z); border.material = rugBorderMat;
}

// A pair of side tables and lamps add warm residential scale to the background.
for (const x of [-8.0, 8.0]) {
  const sideTop = MeshBuilder.CreateBox("sideTableTop", { width: 1.55, height: 0.16, depth: 1.35 }, scene);
  sideTop.position.set(x, -0.05, 8.55); sideTop.material = cabinetMat;
  for (const dx of [-0.58, 0.58]) {
    const leg = MeshBuilder.CreateBox("sideTableLeg", { width: 0.12, height: 1.55, depth: 0.12 }, scene);
    leg.position.set(x + dx, -0.87, 8.55); leg.material = cabinetMat;
  }
  const lampBase = MeshBuilder.CreateCylinder("lampBase", { diameter: 0.42, height: 0.16, tessellation: 32 }, scene);
  lampBase.position.set(x, 0.1, 8.55); lampBase.material = brass;
  const lampStem = MeshBuilder.CreateCylinder("lampStem", { diameter: 0.09, height: 0.75, tessellation: 24 }, scene);
  lampStem.position.set(x, 0.55, 8.55); lampStem.material = darkMat;
  const lampShade = MeshBuilder.CreateCylinder("lampShade", { diameterTop: 0.85, diameterBottom: 1.2, height: 0.72, tessellation: 48 }, scene);
  lampShade.position.set(x, 1.25, 8.55); lampShade.material = creamMat;
  const lampGlow = new PointLight("warmLampGlow", new Vector3(x, 1.05, 8.55), scene);
  lampGlow.diffuse = new Color3(1, 0.68, 0.36); lampGlow.intensity = 0.45; lampGlow.range = 7;
}

// CINEMATIC LIVING ROOM ART DIRECTION
// A hand-composed 3D-animated-style environment replaces the primitive room set.
// The game table, dreidel, coins and player pieces remain fully interactive 3D.
const cinematicRoom = MeshBuilder.CreatePlane("cinematicHanukkahRoom", {
  width: 36, height: 20.25, sideOrientation: MeshBuilder.DOUBLESIDE
}, scene);
cinematicRoom.position.set(0, 4.25, 11.25);
const cinematicRoomMaterial = new StandardMaterial("cinematicRoomArtwork", scene);
cinematicRoomMaterial.disableLighting = true;
cinematicRoomMaterial.backFaceCulling = false;
cinematicRoomMaterial.emissiveTexture = new Texture(
  "/hanukkah-living-room-style.png", scene, true, false, Texture.TRILINEAR_SAMPLINGMODE
);
cinematicRoomMaterial.diffuseColor = Color3.White();
cinematicRoom.material = cinematicRoomMaterial;
cinematicRoom.isPickable = false;

// Hide the old primitive room set. Do not hide the actual game table or game pieces.
const oldRoomSet = /^(livingRoomFloor|livingRoomBackWall|livingRoomLeftWall|livingRoomRightWall|bookcaseBack|bookcaseSide|bookcaseShelf|libraryBook|livingRoomWindowFrame|livingRoomWindowPane|windowMullion|windowCrossbar|windowCurtain|curtainPleat|wallBaseboard|backWallBaseboard|backWallMoulding|walnutConsoleTop|consoleLeg|menorahBase|menorahCenterStem|menorahBranch|menorahCandleCup|menorahCandle|menorahFlame|wallArtFrame|wallArtCanvas|artSun|sofaBase|sofaBack|sofaBackSeam|sofaArm|sofaCushion|sofaCushionPiping|sofaAccentPillow|armchairSeat|armchairSeatCushion|armchairBack|armchairArm|armchairLeg|armchairSeatPad|livingRoomRug|rugBorder|sideTableTop|sideTableLeg|lampBase|lampStem|lampShade)$/i;
scene.meshes.forEach(mesh => {
  if (oldRoomSet.test(mesh.name)) mesh.setEnabled(false);
});

// Firelight and menorah light animate against the illustrated environment.
const cinematicFireGlow = new PointLight("cinematicFireGlow", new Vector3(0, 4.1, 10.7), scene);
cinematicFireGlow.diffuse = new Color3(1, 0.38, 0.12);
cinematicFireGlow.intensity = 1.15;
cinematicFireGlow.range = 12;
const cinematicMenorahGlow = new PointLight("cinematicMenorahGlow", new Vector3(0, 11.3, 10.7), scene);
cinematicMenorahGlow.diffuse = new Color3(1, 0.62, 0.25);
cinematicMenorahGlow.intensity = 0.55;
cinematicMenorahGlow.range = 8;

// The table is built as real Babylon meshes, with layered walnut and brass details.
const tableBase = MeshBuilder.CreateCylinder("tableBase", { diameter: 12.9, height: 0.52, tessellation: 128 }, scene);
tableBase.position.y = -0.28;
tableBase.material = darkWood;
tableBase.receiveShadows = true;
const tableTop = MeshBuilder.CreateCylinder("walnutTabletop", { diameter: 12.65, height: 0.16, tessellation: 128 }, scene);
tableTop.position.y = 0.04;
tableTop.material = tableMat;
tableTop.receiveShadows = true;
const outerEdgeTrim = MeshBuilder.CreateTorus("tableOuterBrassEdge", { diameter: 12.82, thickness: 0.045, tessellation: 128 }, scene);
outerEdgeTrim.position.y = -0.005; outerEdgeTrim.material = brass;
for (const [diameter, thickness, y] of [[12.76, 0.035, -0.12], [12.55, 0.025, -0.36]]) {
  const edgeBead = MeshBuilder.CreateTorus("walnutTableEdgeBead", { diameter, thickness, tessellation: 128 }, scene);
  edgeBead.position.y = y; edgeBead.material = brass;
}
const tableRivetRadius = 6.02;
for (let i = 0; i < 48; i++) {
  const angle = (i / 48) * Math.PI * 2;
  const rivet = MeshBuilder.CreateSphere("tableBrassRivet", { diameter: 0.105, segments: 12 }, scene);
  rivet.position.set(Math.cos(angle) * tableRivetRadius, 0.145, Math.sin(angle) * tableRivetRadius);
  rivet.material = brass;
}

shadows.addShadowCaster(tableBase);
shadows.addShadowCaster(tableTop);

// A carved central pedestal makes the round table feel grounded and substantial.
const pedestal = MeshBuilder.CreateCylinder("tablePedestal", { diameter: 1.75, height: 1.08, tessellation: 64 }, scene);
pedestal.position.y = -1.02; pedestal.material = darkWood;
const pedestalFoot = MeshBuilder.CreateCylinder("pedestalFoot", { diameter: 3.35, height: 0.2, tessellation: 96 }, scene);
pedestalFoot.position.y = -1.58; pedestalFoot.material = darkWood;
const pedestalFootTrim = MeshBuilder.CreateTorus("pedestalFootBrass", { diameter: 3.22, thickness: 0.035, tessellation: 96 }, scene);
pedestalFootTrim.position.y = -1.47; pedestalFootTrim.material = brass;
for (const y of [-1.18, -0.94, -0.7]) {
  const carvedBand = MeshBuilder.CreateTorus("pedestalCarvedBand", { diameter: 1.78, thickness: 0.025, tessellation: 64 }, scene);
  carvedBand.position.y = y; carvedBand.material = brass;
}

const pedestalNeck = MeshBuilder.CreateCylinder("pedestalNeck", { diameterTop: 2.05, diameterBottom: 1.7, height: 0.18, tessellation: 64 }, scene);
pedestalNeck.position.y = -0.48; pedestalNeck.material = brass;
shadows.addShadowCaster(pedestal);
shadows.addShadowCaster(pedestalFoot);

for (const [diameter, tube, y] of [[12.72, 0.055, 0.12], [12.25, 0.028, 0.125], [7.45, 0.025, 0.126]]) {
  const ring = MeshBuilder.CreateTorus("brassTableInlay", { diameter, thickness: tube, tessellation: 128 }, scene);
  ring.position.y = y;
  ring.material = brass;
}
const centerFelt = MeshBuilder.CreateCylinder("centerFelt", { diameter: 7.35, height: 0.012, tessellation: 96 }, scene);
centerFelt.position.y = 0.125;
centerFelt.material = felt;
const feltStitch = MeshBuilder.CreateTorus("feltOuterStitch", { diameter: 7.22, thickness: 0.018, tessellation: 128 }, scene);
feltStitch.position.y = 0.135; feltStitch.material = brass;
const centerMedallion = MeshBuilder.CreateCylinder("tableCenterMedallion", { diameter: 0.72, height: 0.025, tessellation: 64 }, scene);
centerMedallion.position.y = 0.145; centerMedallion.material = brass;
const centerMedallionInset = MeshBuilder.CreateCylinder("tableCenterMedallionInset", { diameter: 0.56, height: 0.028, tessellation: 64 }, scene);
centerMedallionInset.position.y = 0.17; centerMedallionInset.material = darkWood;

// The communal pot is represented by real, individually modeled coins.
// Coins are added and removed as the pot changes, so the table always reflects the score.
const potCoinMeshes = [];
const potCoinSpots = [
  [-1.42, 0.62], [1.42, -0.62], [0.0, 1.55],
  [-1.48, -0.9], [1.48, 0.9], [0.0, -1.55]
];
function createCoin(name) {
  const coin = MeshBuilder.CreateCylinder(name, { diameterTop: 0.43, diameterBottom: 0.46, height: 0.065, tessellation: 64 }, scene);
  coin.material = coinMat;
  coin.rotation.z = (Math.random() - 0.5) * 0.025;
  const rim = MeshBuilder.CreateTorus(name + "Rim", { diameter: 0.34, thickness: 0.018, tessellation: 48 }, scene);
  rim.parent = coin; rim.position.y = 0.034; rim.material = brass;
  const lowerRim = MeshBuilder.CreateTorus(name + "LowerRim", { diameter: 0.35, thickness: 0.012, tessellation: 48 }, scene);
  lowerRim.parent = coin; lowerRim.position.y = -0.034; lowerRim.material = brass;
  const medallion = MeshBuilder.CreateCylinder(name + "Medallion", { diameter: 0.24, height: 0.008, tessellation: 48 }, scene);
  medallion.parent = coin; medallion.position.y = 0.034; medallion.material = coinFaceMat;
  for (let ray = 0; ray < 6; ray++) {
    const mark = MeshBuilder.CreateBox(name + "MintMark", { width: 0.018, height: 0.006, depth: 0.085 }, scene);
    mark.parent = coin; mark.position.y = 0.04; mark.rotation.y = ray * Math.PI / 3; mark.material = brass;
  }
  shadows.addShadowCaster(coin);
  return coin;
}
function updatePotCoins() {
  while (potCoinMeshes.length < Math.min(pot, 60)) potCoinMeshes.push(createCoin("potCoin"));
  while (potCoinMeshes.length > Math.min(pot, 60)) potCoinMeshes.pop().dispose();
  potCoinMeshes.forEach((coin, i) => {
    const spot = potCoinSpots[i % potCoinSpots.length];
    const level = Math.floor(i / potCoinSpots.length);
    coin.position.set(spot[0], 0.205 + level * 0.069, spot[1]);
    coin.rotation.y = ((i * 37) % 11) * 0.025;
  });
}
const potRing = MeshBuilder.CreateTorus("potMarker", { diameter: 3.0, thickness: 0.03, tessellation: 96 }, scene);
potRing.position.y = 0.15;
potRing.material = brass;
const celebrationMaterial = new StandardMaterial("potCelebrationMaterial", scene);
celebrationMaterial.diffuseColor = new Color3(1, 0.75, 0.32);
celebrationMaterial.emissiveColor = new Color3(1, 0.56, 0.12);
celebrationMaterial.alpha = 0.85;
const celebrationRing = MeshBuilder.CreateTorus("potCelebrationRing", { diameter: 3.1, thickness: 0.11, tessellation: 96 }, scene);
celebrationRing.position.y = 0.22; celebrationRing.material = celebrationMaterial;
celebrationRing.isVisible = false;
let celebrationElapsed = 0;

// Four understated seat markers help establish the multiplayer table layout.
const seatPositions = [
  new Vector3(0, 0.15, -4.55), new Vector3(4.55, 0.15, 0),
  new Vector3(0, 0.15, 4.55), new Vector3(-4.55, 0.15, 0)
];
const seatMaterials = ["#b98b4d", "#bb8291", "#789bbd", "#82a78d"].map((c, i) => pbr("seat" + i, c, 0.25, 0.4));
const seatMarkers = [];
const seatNameTextures = [];
seatPositions.forEach((pos, i) => {
  const disc = MeshBuilder.CreateCylinder("playerSeatMarker", { diameter: 1.0, height: 0.045, tessellation: 48 }, scene);
  disc.position.copyFrom(pos);
  disc.material = seatMaterials[i];
  seatMarkers.push(disc);
  const inner = MeshBuilder.CreateTorus("seatRing", { diameter: 1.08, thickness: 0.035, tessellation: 48 }, scene);
  inner.position.set(pos.x, 0.19, pos.z);
  inner.material = brass;

  const plaque = MeshBuilder.CreateBox("playerNamePlaque", { width: 1.7, height: 0.5, depth: 0.11 }, scene);
  const nameRadius = 5.02;
  const nameDirection = new Vector3(pos.x, 0, pos.z).normalize();
  plaque.position.set(nameDirection.x * nameRadius, 0.66, nameDirection.z * nameRadius);
  // The front face points outward toward the player, never upward like a tabletop label.
  plaque.rotation.set(0, Math.atan2(nameDirection.x, nameDirection.z), 0);
  const plaqueStand = MeshBuilder.CreateBox("playerNamePlaqueStand", { width: 0.16, height: 0.34, depth: 0.14 }, scene);
  plaqueStand.position.set(nameDirection.x * nameRadius, 0.27, nameDirection.z * nameRadius);
  plaqueStand.rotation.y = plaque.rotation.y;
  plaqueStand.material = brass;
  plaque.material = darkWood;
  const plaqueRim = MeshBuilder.CreateBox("playerNamePlaqueRim", { width: 1.78, height: 0.56, depth: 0.055 }, scene);
  plaqueRim.position.set(0, 0, -0.055);
  plaqueRim.rotation.set(0, 0, 0);
  plaqueRim.material = brass;
  plaqueRim.parent = plaque;
  const texture = new DynamicTexture("playerNameTexture" + i, { width: 512, height: 128 }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = "#2b2119"; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#c39a5e"; ctx.lineWidth = 7; ctx.strokeRect(5, 5, 502, 118);
  ctx.fillStyle = "#f3dfb9"; ctx.font = "bold 58px Georgia, serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(["YOU", "SARAH", "DAVID", "MOISHE"][i], 256, 66);
  texture.update();
  const label = MeshBuilder.CreatePlane("playerNameLabel" + i, { width: 1.58, height: 0.34, sideOrientation: MeshBuilder.DOUBLESIDE }, scene);
  label.position.set(0, 0, 0.052);
  label.parent = plaque;
  label.rotation.y = 0;
  const labelMat = new StandardMaterial("playerNameLabelMat" + i, scene);
  labelMat.diffuseTexture = texture; labelMat.emissiveColor = new Color3(0.25, 0.2, 0.13);
  labelMat.backFaceCulling = false; labelMat.emissiveColor = new Color3(0.12, 0.09, 0.05); label.material = labelMat;
  seatNameTextures.push({ texture, ctx });
});

// Each player's reserve is visible as a little stack of coins at their seat.
// One rendered coin represents ten game coins, keeping the table readable.
const playerCoinMeshes = [[], [], [], []];
const playerCoinSpots = [[1.35, -3.9], [3.9, 1.35], [-1.35, 3.9], [-3.9, -1.35]];
function updatePlayerCoinStacks() {
  balances.forEach((balance, playerIndex) => {
    const visibleCount = Math.min(12, Math.ceil(balance / 10));
    const pile = playerCoinMeshes[playerIndex];
    while (pile.length < visibleCount) {
      const coin = MeshBuilder.CreateCylinder("playerReserveCoin", { diameterTop: 0.235, diameterBottom: 0.25, height: 0.045, tessellation: 48 }, scene);
      coin.material = coinMat;
      const coinRim = MeshBuilder.CreateTorus("playerReserveCoinRim", { diameter: 0.19, thickness: 0.012, tessellation: 32 }, scene);
      coinRim.parent = coin; coinRim.position.y = 0.024; coinRim.material = brass;
      const coinFace = MeshBuilder.CreateCylinder("playerReserveCoinFace", { diameter: 0.15, height: 0.006, tessellation: 40 }, scene);
      coinFace.parent = coin; coinFace.position.y = 0.025; coinFace.material = coinFaceMat;
      shadows.addShadowCaster(coin);
      pile.push(coin);
    }
    while (pile.length > visibleCount) pile.pop().dispose();
    pile.forEach((coin, i) => {
      coin.position.set(playerCoinSpots[playerIndex][0] + (i >= 6 ? 0.28 : 0), 0.205 + (i % 6) * 0.048, playerCoinSpots[playerIndex][1]);
      coin.rotation.y = playerIndex * 0.35 + i * 0.08;
    });
  });
}

const coinFlights = [];
function animateCoinTransfer(playerIndex, towardPlayer, amount) {
  const startSpot = playerCoinSpots[playerIndex];
  const endSpot = towardPlayer ? playerCoinSpots[towardPlayer.index] : [0, 0];
  const count = Math.min(8, Math.max(1, Math.ceil(amount / 3)));
  for (let i = 0; i < count; i++) {
    const mesh = createCoin("flyingGameCoin");
    mesh.scaling.setAll(0.58);
    const from = towardPlayer ? new Vector3(0, 0.55 + i * 0.035, 0) : new Vector3(startSpot[0], 0.32 + i * 0.025, startSpot[1]);
    const to = towardPlayer ? new Vector3(endSpot[0], 0.34, endSpot[1]) : new Vector3(0, 0.42, 0);
    mesh.position.copyFrom(from);
    coinFlights.push({ mesh, from, to, age: 0, duration: 0.72 + Math.random() * 0.22, arc: 0.8 + Math.random() * 0.45 });
  }
}
function updateCoinFlights(dt) {
  for (let i = coinFlights.length - 1; i >= 0; i--) {
    const flight = coinFlights[i];
    flight.age += dt;
    const t = Math.min(flight.age / flight.duration, 1);
    const eased = t * t * (3 - 2 * t);
    Vector3.LerpToRef(flight.from, flight.to, eased, flight.mesh.position);
    flight.mesh.position.y += Math.sin(t * Math.PI) * flight.arc;
    flight.mesh.rotation.z += dt * 13;
    flight.mesh.rotation.x += dt * 9;
    if (t >= 1) {
      flight.mesh.dispose();
      coinFlights.splice(i, 1);
    }
  }
}

// Procedural lettering texture: each Hebrew character is painted into its own face texture.
function letterMaterial(letter, name) {
  const texture = new DynamicTexture(name + "LetterTexture", { width: 512, height: 512 }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "#f0d5a1";
  ctx.font = "bold 390px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#fff0c8";
  ctx.shadowBlur = 10;
  ctx.fillText(letter, 256, 265);
  texture.update();
  const mat = new StandardMaterial(name + "LetterMat", scene);
  mat.diffuseTexture = texture;
  mat.opacityTexture = texture;
  mat.emissiveColor = new Color3(0.22, 0.16, 0.08);
  mat.backFaceCulling = false;
  return mat;
}

const dreidelRoot = new TransformNode("dreidelRoot", scene);
dreidelRoot.scaling.setAll(1.98);
const bodyMat = pbr("handTurnedWalnut", "#80502d", 0.12, 0.29);
const dreidelWoodTexture = woodTexture();
bodyMat.albedoTexture = dreidelWoodTexture;
bodyMat.bumpTexture = microSurfaceTexture("dreidelHandTurnedWoodNormal", "wood");
bodyMat.bumpTexture.level = 0.035;
bodyMat.clearCoat.isEnabled = true;
bodyMat.clearCoat.intensity = 0.5;
bodyMat.clearCoat.roughness = 0.22;
bodyMat.clearCoat.isEnabled = true;
bodyMat.clearCoat.intensity = 0.24;
bodyMat.clearCoat.roughness = 0.3;
let selectedFinish = "walnut";
function setDreidelFinish(finish) {
  selectedFinish = finish;
  if (finish === "midnight") {
    bodyMat.albedoTexture = null;
    bodyMat.albedoColor = Color3.FromHexString("#263d5b");
    bodyMat.metallic = 0.38; bodyMat.roughness = 0.27;
  } else if (finish === "ivory") {
    bodyMat.albedoTexture = null;
    bodyMat.albedoColor = Color3.FromHexString("#d9c8a6");
    bodyMat.metallic = 0.08; bodyMat.roughness = 0.34;
  } else {
    bodyMat.albedoTexture = dreidelWoodTexture;
    bodyMat.albedoColor = Color3.FromHexString("#80502d");
    bodyMat.metallic = 0.12; bodyMat.roughness = 0.29;
  }
  document.querySelectorAll(".table-finish-option").forEach(button => {
    const owned = ownedTableFinishes.has(button.dataset.finish);
    button.classList.toggle("active", button.dataset.finish === selectedTableFinish);
    button.classList.toggle("locked", !owned);
    button.querySelector(".finish-name").textContent = owned ? button.dataset.name : button.dataset.name + " · " + button.dataset.cost;
  });
  document.querySelectorAll(".dreidel-finish-option").forEach(button => {
    button.classList.toggle("active", button.dataset.finish === finish);
  });
  try { localStorage.setItem("virtualDreidelSelectedFinish", finish); } catch { /* Current selection still applies. */ }
}
try {
  const savedFinish = localStorage.getItem("virtualDreidelSelectedFinish");
  if (savedFinish && ownedFinishes.has(savedFinish)) setDreidelFinish(savedFinish);
} catch { /* Use the walnut finish by default. */ }
// A traditional, broad four-sided wooden body with a restrained taper.
const body = MeshBuilder.CreateCylinder("fourSidedDreidelBody", {
  height: 1.12, diameterTop: 1.34, diameterBottom: 1.16, tessellation: 4, subdivisions: 1
}, scene);
body.parent = dreidelRoot;
body.position.y = 1.0;
body.rotation.y = Math.PI / 4;
body.material = bodyMat;
body.receiveShadows = true;
shadows.addShadowCaster(body);

// Slim square brass ferrules protect the top and bottom edges of the wooden body.
for (const [y, diameter, height] of [[0.47, 1.18, 0.065], [1.53, 1.34, 0.065]]) {
  const ferrule = MeshBuilder.CreateCylinder("dreidelSquareFerrule", {
    height, diameterTop: diameter, diameterBottom: diameter, tessellation: 4
  }, scene);
  ferrule.parent = dreidelRoot;
  ferrule.position.y = y;
  ferrule.rotation.y = Math.PI / 4;
  ferrule.material = brass;
  shadows.addShadowCaster(ferrule);
}

// Fine brass shoulder band adds a crafted, hand-finished detail to the body.
const bodyBand = MeshBuilder.CreateCylinder("dreidelBrassBodyBand", { height: 0.065, diameterTop: 0.9, diameterBottom: 0.9, tessellation: 4 }, scene);
bodyBand.parent = dreidelRoot;
bodyBand.position.y = 1.48;
bodyBand.rotation.y = Math.PI / 4;
bodyBand.material = brass;
shadows.addShadowCaster(bodyBand);

const topCollar = MeshBuilder.CreateCylinder("dreidelShoulder", { height: 0.16, diameterTop: 0.48, diameterBottom: 0.85, tessellation: 4 }, scene);
topCollar.parent = dreidelRoot; topCollar.position.y = 1.68; topCollar.rotation.y = Math.PI / 4; topCollar.material = brass;
const stem = MeshBuilder.CreateCylinder("dreidelHandle", { height: 0.43, diameterTop: 0.19, diameterBottom: 0.28, tessellation: 32 }, scene);
stem.parent = dreidelRoot; stem.position.y = 1.94; stem.material = bodyMat;
const handleGrip = MeshBuilder.CreateSphere("dreidelHandleGrip", { diameter: 0.3, segments: 32 }, scene);
handleGrip.parent = dreidelRoot; handleGrip.position.y = 2.02; handleGrip.scaling.y = 0.72; handleGrip.material = bodyMat;
const stemCap = MeshBuilder.CreateSphere("handleCap", { diameter: 0.25, segments: 24 }, scene);
stemCap.parent = dreidelRoot; stemCap.position.y = 2.17; stemCap.material = brass;
const tip = MeshBuilder.CreateCylinder("dreidelPoint", { height: 0.42, diameterTop: 0.24, diameterBottom: 0.025, tessellation: 4 }, scene);
tip.parent = dreidelRoot; tip.position.y = 0.22; tip.rotation.y = Math.PI / 4; tip.material = brass;
for (const x of [-0.29, 0.29]) for (const z of [-0.29, 0.29]) {
  const cornerInlay = MeshBuilder.CreateCylinder("dreidelCornerInlay", { height: 1.0, diameterTop: 0.018, diameterBottom: 0.045, tessellation: 12 }, scene);
  cornerInlay.parent = dreidelRoot; cornerInlay.position.set(x, 1.0, z); cornerInlay.material = brass;
}
const handleCollar = MeshBuilder.CreateTorus("dreidelHandleCollar", { diameter: 0.29, thickness: 0.035, tessellation: 32 }, scene);
handleCollar.parent = dreidelRoot; handleCollar.position.y = 1.78; handleCollar.material = brass;

const faceLetters = ["נ", "ג", "ה", "ש"];
const faceRotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
faceLetters.forEach((letter, i) => {
  const a = faceRotations[i];
  // Raised brass frame, dark inset, and a clear gold Hebrew letter on each side.
  const frame = MeshBuilder.CreateBox("dreidelFaceFrame" + i, { width: 0.65, height: 0.74, depth: 0.06 }, scene);
  frame.parent = dreidelRoot;
  frame.position.set(Math.sin(a) * 0.455, 1.03, Math.cos(a) * 0.455);
  frame.rotation.y = a;
  frame.material = brass;

  const inset = MeshBuilder.CreateBox("dreidelFaceInset" + i, { width: 0.57, height: 0.66, depth: 0.04 }, scene);
  inset.parent = dreidelRoot;
  inset.position.set(Math.sin(a) * 0.485, 1.03, Math.cos(a) * 0.485);
  inset.rotation.y = a;
  inset.material = darkWood;

  const face = MeshBuilder.CreatePlane("hebrewFace" + i, { width: 0.49, height: 0.57, sideOrientation: MeshBuilder.DOUBLESIDE }, scene);
  face.parent = dreidelRoot;
  face.position.set(Math.sin(a) * 0.512, 1.03, Math.cos(a) * 0.512);
  face.rotation.y = a;
  face.material = letterMaterial(letter, "letter" + i);
});

// The room floor above also receives the table and furniture shadows.
// Register the actual meshes as shadow casters; TransformNode itself is not a mesh.
shadows.addShadowCaster(topCollar);
shadows.addShadowCaster(stem);
shadows.addShadowCaster(stemCap);
shadows.addShadowCaster(handleGrip);
shadows.addShadowCaster(tip);

let spinning = false;
let falling = false;
let fallElapsed = 0;
let spinElapsed = 0;
let spinDuration = 4.2;
let spinSpeed = 0;
let resultLetter = "";
let bet = 1;
let turn = 0;
let round = 1;
let pot = 12;
let balances = [100, 100, 100, 100];
let gameBusy = false;
let currentSpinPlayer = 0;
let gameOver = false;
const names = ["You", "Sarah", "David", "Moishe"];
let gameWins = 0;
let gameLosses = 0;
try {
  gameWins = Number(localStorage.getItem("virtualDreidelWins") || 0);
  gameLosses = Number(localStorage.getItem("virtualDreidelLosses") || 0);
} catch { /* Session records remain available even without browser storage. */ }
const ownedFinishes = new Set(["walnut"]);
try {
  const savedFinishes = JSON.parse(localStorage.getItem("virtualDreidelFinishes") || "[]");
  if (Array.isArray(savedFinishes)) savedFinishes.forEach(finish => ownedFinishes.add(finish));
} catch { /* Default to the walnut finish. */ }
try {
  const savedNames = JSON.parse(localStorage.getItem("virtualDreidelNames") || "null");
  if (Array.isArray(savedNames) && savedNames.length === 4) {
    savedNames.forEach((name, i) => { if (typeof name === "string" && name.trim()) names[i] = name.slice(0, 18); });
  }
} catch { /* Keep default player names if local storage is unavailable. */ }
const letters = ["נ", "ג", "ה", "ש"];
const resultNames = { "נ": "NUN — Nothing happens", "ג": "GIMEL — Take the whole pot!", "ה": "HEY — Take half the pot", "ש": "SHIN — Add one coin to the pot" };
function saveGame() {
  try { localStorage.setItem("virtualDreidelSavedGame", JSON.stringify({ balances, pot, turn, round, bet, gameOver })); }
  catch { /* The current session continues even if storage is unavailable. */ }
}
try {
  const saved = JSON.parse(localStorage.getItem("virtualDreidelSavedGame") || "null");
  if (saved && Array.isArray(saved.balances) && saved.balances.length === 4 &&
      saved.balances.every(value => Number.isFinite(value) && value >= 0) &&
      Number.isFinite(saved.pot) && saved.pot >= 0 &&
      Number.isInteger(saved.turn) && saved.turn >= 0 && saved.turn < 4 &&
      Number.isInteger(saved.round) && saved.round > 0) {
    balances = saved.balances;
    pot = saved.pot; turn = saved.turn; round = saved.round;
    bet = Number.isFinite(saved.bet) && saved.bet > 0 ? saved.bet : 1;
    gameOver = saved.gameOver === true;
  }
} catch { /* Start with a fresh table if saved game data is unreadable. */ }
const $ = id => document.getElementById(id);
let soundEnabled = true;
let audioContext = null;
function getAudioContext() {
  if (!soundEnabled) return null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  } catch { return null; }
}
function playSpinSound() {
  const audio = getAudioContext();
  if (!audio) return;
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const overtone = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "triangle"; overtone.type = "sine";
  oscillator.frequency.setValueAtTime(245, now);
  oscillator.frequency.exponentialRampToValueAtTime(78, now + 3.8);
  overtone.frequency.setValueAtTime(490, now);
  overtone.frequency.exponentialRampToValueAtTime(156, now + 3.8);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.9);
  oscillator.connect(gain); overtone.connect(gain); gain.connect(audio.destination);
  oscillator.start(now); overtone.start(now);
  oscillator.stop(now + 4); overtone.stop(now + 4);
}
function playCoinChime() {
  const audio = getAudioContext();
  if (!audio) return;
  const now = audio.currentTime;
  [880, 1108, 1320].forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
    gain.gain.setValueAtTime(0.0001, now + index * 0.055);
    gain.gain.linearRampToValueAtTime(0.055, now + index * 0.055 + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48 + index * 0.055);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(now + index * 0.055); oscillator.stop(now + 0.55 + index * 0.055);
  });
}

function refreshUI() {
  $("potValue").textContent = pot;
  $("gamesWon").textContent = gameWins;
  $("gamesLost").textContent = gameLosses;
  const todayKey = new Date().toLocaleDateString();
  let bonusClaimed = false;
  try { bonusClaimed = localStorage.getItem("virtualDreidelDailyBonusDate") === todayKey; } catch { /* Bonus remains available for this session. */ }
  $("dailyBonus").disabled = bonusClaimed || gameOver;
  $("dailyBonus").textContent = bonusClaimed ? "DAILY BONUS CLAIMED" : "CLAIM DAILY +10 COINS";
  $("balanceValue").textContent = balances[0];
  if (bet > balances[0]) bet = balances[0] || 1;
  $("betSummary").textContent = "Wager " + bet + " of your " + balances[0] + " coins";
  $("activePlayer").textContent = names[turn];
  turnSpot.position.set(seatPositions[turn].x * 0.72, 4.2, seatPositions[turn].z * 0.72);
  document.querySelector(".turn-avatar").textContent = names[turn].charAt(0);
  $("roundValue").textContent = String(round).padStart(2, "0");
  $("turnPill").textContent = gameOver ? "GAME OVER" : turn === 0 ? "YOUR TURN" : "OPPONENT TURN";
  $("turnNote").textContent = gameOver ? "You're out of coins. Start a new game to play again." :
    turn === 0 ? "Your turn. Choose your wager and spin." : names[turn] + " is choosing a wager…";
  $("spinButton").disabled = gameBusy || turn !== 0 || gameOver || balances[0] < bet;
  $("spinButton").querySelector("span:nth-child(2)").textContent = gameBusy ? "SPINNING…" : gameOver ? "OUT OF COINS" : turn === 0 ? "SPIN DREIDEL" : names[turn].toUpperCase() + " IS UP";
  $("playerBalance0").textContent = balances[0];
  $("playerBalance1").textContent = balances[1];
  $("playerBalance2").textContent = balances[2];
  $("playerBalance3").textContent = balances[3];
  document.querySelectorAll(".player-row").forEach((row, i) => {
    row.querySelector(".player-name").textContent = names[i];
    row.querySelector(".player-avatar").textContent = names[i].charAt(0).toUpperCase();
    row.classList.toggle("active", i === turn && !gameOver);
    row.querySelector("small").textContent = balances[i] <= 0 ? "Out of coins" :
      i === turn ? (turn === 0 ? "Playing now" : "Taking a turn") :
      ["Your seat", "Careful player", "Bold player", "Wildcard"][i];
  });
  document.querySelectorAll(".dreidel-finish-option").forEach(button => {
    const owned = ownedFinishes.has(button.dataset.finish);
    button.classList.toggle("active", button.dataset.finish === selectedFinish);
    button.classList.toggle("locked", !owned);
    button.querySelector(".finish-name").textContent = owned ? button.dataset.name : button.dataset.name + " · " + button.dataset.cost;
  });
  document.querySelectorAll(".bet-option").forEach(button => {
    const amount = button.dataset.bet === "all" ? balances[0] : Number(button.dataset.bet);
    button.classList.toggle("active", amount === bet);
    button.disabled = gameBusy || turn !== 0 || gameOver || amount > balances[0];
  });
  updatePotCoins();
  updatePlayerCoinStacks();
  seatNameTextures.forEach(({ texture, ctx }, i) => {
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = "#2b2119"; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = i === turn && !gameOver ? "#f2c879" : "#c39a5e";
    ctx.lineWidth = i === turn && !gameOver ? 12 : 7;
    ctx.strokeRect(5, 5, 502, 118);
    ctx.fillStyle = i === turn && !gameOver ? "#fff0c9" : "#f3dfb9";
    ctx.font = "bold 58px Georgia, serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(names[i].toUpperCase(), 256, 66);
    texture.update();
    seatMarkers[i].material.emissiveColor = i === turn && !gameOver ?
      new Color3(0.18, 0.1, 0.025) : new Color3(0, 0, 0);
  });
}

let winnerCrown = null;
function showWinnerCrown(playerIndex) {
  if (winnerCrown) winnerCrown.dispose();
  winnerCrown = new TransformNode("winnerCrownRoot", scene);
  const seat = seatPositions[playerIndex];
  winnerCrown.position.set(seat.x * 0.72, 2.65, seat.z * 0.72);
  const band = MeshBuilder.CreateCylinder("winnerCrownBand", { diameter: 0.82, height: 0.14, tessellation: 48 }, scene);
  band.parent = winnerCrown; band.material = brass;
  const crownGold = pbr("winnerCrownGold", "#f4cc75", 0.82, 0.18);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.25;
    const spike = MeshBuilder.CreateCylinder("winnerCrownPoint", { height: 0.42, diameterTop: 0.025, diameterBottom: 0.18, tessellation: 4 }, scene);
    spike.parent = winnerCrown; spike.position.set(x, 0.25, 0); spike.rotation.z = x * 0.32; spike.material = crownGold;
    shadows.addShadowCaster(spike);
    const jewel = MeshBuilder.CreateSphere("winnerCrownJewel", { diameter: 0.12, segments: 16 }, scene);
    jewel.parent = winnerCrown; jewel.position.set(x, 0.08, 0.39); jewel.material = crownGold;
    shadows.addShadowCaster(jewel);
  }
  shadows.addShadowCaster(band);
}
function addActivity(message) {
  const p = document.createElement("p");
  const icon = document.createElement("span");
  icon.textContent = "✦";
  const stamp = document.createElement("time");
  stamp.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  stamp.className = "activity-time";
  p.append(icon, document.createTextNode(" " + message), stamp);
  $("activityLog").prepend(p);
  while ($("activityLog").children.length > 8) $("activityLog").lastElementChild.remove();
}

function resetDreidel() {
  spinning = false; falling = false; fallElapsed = 0;
  dreidelRoot.rotation.set(0, 0, 0);
  dreidelRoot.position.set(0, 0.14, 0);
  dreidelRoot.scaling.setAll(1.98);
}

function chooseAiBet(playerIndex) {
  const affordable = [50, 20, 10, 5, 2, 1].filter(amount => amount <= balances[playerIndex]);
  if (!affordable.length) return 0;
  const roll = Math.random();
  let preference = 1;
  if (playerIndex === 1) {
    // Sarah is cautious and usually protects her reserve.
    preference = roll < 0.58 ? 1 : roll < 0.88 ? 2 : 5;
  } else if (playerIndex === 2) {
    // David takes bigger chances when he has the coins to do it.
    preference = roll < 0.1 ? 1 : roll < 0.28 ? 2 : roll < 0.56 ? 5 : roll < 0.82 ? 10 : 20;
  } else {
    // Moishe is unpredictable.
    preference = [1, 2, 5, 10, 20, 50][Math.floor(Math.random() * 6)];
  }
  return affordable.find(amount => amount <= preference) || affordable[affordable.length - 1];
}

function beginSpin(playerIndex, wager) {
  if (gameBusy || gameOver || wager < 1 || balances[playerIndex] < wager) return;
  currentSpinPlayer = playerIndex;
  returnCameraRadius = camera.radius;
  desiredCameraRadius = 15.2;
  gameBusy = true;
  balances[playerIndex] -= wager;
  pot += wager;
  animateCoinTransfer(playerIndex, null, wager);
  spinElapsed = 0;
  falling = false; fallElapsed = 0;
  playSpinSound();
  spinDuration = (playerIndex === 0 ? 4.0 : 3.25) + Math.random() * 0.65;
  spinSpeed = 24 + Math.random() * 7;
  resultLetter = letters[Math.floor(Math.random() * letters.length)];
  resetDreidel();
  spinning = true;
  $("sceneResult").classList.remove("show");
  addActivity(names[playerIndex] + " wagered " + wager + " coin" + (wager === 1 ? "" : "s") + " and spun.");
  refreshUI();
}

function spinDreidel() {
  if (turn !== 0 || gameBusy || gameOver || balances[0] < bet) return;
  beginSpin(0, bet);
}

function scheduleAiTurn() {
  if (gameOver || turn === 0) return;
  window.setTimeout(() => {
    if (gameBusy || gameOver || turn === 0) return;
    if (balances[turn] <= 0) {
      addActivity(names[turn] + " is out of coins and sits this turn out.");
      advanceTurn();
      return;
    }
    beginSpin(turn, chooseAiBet(turn));
  }, 1050);
}

function advanceTurn() {
  turn = (turn + 1) % 4;
  if (turn === 0) round += 1;
  const activePlayers = balances.map((balance, index) => balance > 0 ? index : -1).filter(index => index >= 0);
  if (activePlayers.length <= 1 || balances[0] <= 0) {
    gameOver = true;
    const winnerIndex = activePlayers.length === 1
      ? activePlayers[0]
      : 1 + balances.slice(1).indexOf(Math.max(...balances.slice(1)));
    const winningBalance = balances[winnerIndex];
    const winnerName = names[winnerIndex];
    showWinnerCrown(winnerIndex);
    if (winnerIndex === 0) gameWins += 1;
    else gameLosses += 1;
    try {
      localStorage.setItem("virtualDreidelWins", String(gameWins));
      localStorage.setItem("virtualDreidelLosses", String(gameLosses));
    } catch { /* The current game remains playable if storage is unavailable. */ }
    addActivity("Game over — " + winnerName + " wins with " + winningBalance + " coins.");
    $("sceneResult").textContent = "🏆  " + winnerName.toUpperCase() + " WINS THE GAME!";
    $("sceneResult").classList.add("show");
  }
  saveGame();
  refreshUI();
  if (!gameOver && turn !== 0) scheduleAiTurn();
}

let roomFlickerTime = 0;
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  camera.radius += (desiredCameraRadius - camera.radius) * Math.min(dt * 2.2, 1);
  roomFlickerTime += dt;\n  cinematicFireGlow.intensity = 1.0 + Math.sin(roomFlickerTime * 7.1) * 0.18 + Math.sin(roomFlickerTime * 13.7) * 0.08;\n  cinematicMenorahGlow.intensity = 0.5 + Math.sin(roomFlickerTime * 9.2) * 0.07;
  if (winnerCrown) { winnerCrown.rotation.y += dt * 0.5; winnerCrown.position.y = 2.65 + Math.sin(roomFlickerTime * 2.2) * 0.08; }
  menorahFlames.forEach((flame, i) => {
    const flicker = 1 + Math.sin(roomFlickerTime * (8 + i * 0.7) + i) * 0.1;
    flame.scaling.set(0.82 * flicker, 1.45 * flicker, 0.82 * flicker);
  });
  updateCoinFlights(dt);
  if (celebrationElapsed > 0) {
    celebrationElapsed += dt;
    const progress = Math.min(celebrationElapsed / 1.0, 1);
    celebrationRing.isVisible = true;
    celebrationRing.scaling.setAll(1 + progress * 1.8);
    celebrationMaterial.alpha = 0.85 * (1 - progress);
    if (progress >= 1) {
      celebrationElapsed = 0;
      celebrationRing.isVisible = false;
      celebrationRing.scaling.setAll(1);
      celebrationMaterial.alpha = 0.85;
    }
  }
  if (falling) {
    fallElapsed += dt;
    const fallProgress = Math.min(fallElapsed / 0.72, 1);
    const ease = fallProgress * fallProgress * (3 - 2 * fallProgress);
    const bounce = Math.sin(fallProgress * Math.PI) * 0.17;
    dreidelRoot.rotation.x = 1.22 * ease;
    dreidelRoot.rotation.z = 0.12 * ease;
    dreidelRoot.position.y = 0.14 + bounce + 0.18 * (1 - ease);
    if (fallProgress >= 1) {
      falling = false;
      dreidelRoot.rotation.x = 1.22;
      dreidelRoot.rotation.z = 0.12;
      dreidelRoot.position.y = 0.52;
      settleResult();
    }
    return;
  }
  if (!spinning) return;
  spinElapsed += dt;
  const progress = Math.min(spinElapsed / spinDuration, 1);
  const decay = Math.pow(1 - progress, 1.65);
  dreidelRoot.rotation.y += spinSpeed * decay * dt;
  const wobbleGrowth = Math.pow(1 - decay, 0.78);
  const wobbleSize = 0.035 + wobbleGrowth * 0.62;
  const precession = spinElapsed * (2.2 + (1 - decay) * 2.8);
  dreidelRoot.rotation.x = Math.sin(precession) * wobbleSize;
  dreidelRoot.rotation.z = Math.cos(precession) * wobbleSize * 0.78;
  dreidelRoot.position.x = Math.sin(precession * 0.5) * wobbleGrowth * 0.11;
  dreidelRoot.position.z = Math.cos(precession * 0.5) * wobbleGrowth * 0.11;
  dreidelRoot.position.y = 0.14 + Math.abs(Math.sin(spinElapsed * 20)) * 0.055 * decay;
  if (progress >= 1) {
    spinning = false;
    dreidelRoot.rotation.y = faceRotations[letters.indexOf(resultLetter)] + Math.PI / 4;
    dreidelRoot.position.x = 0;
    dreidelRoot.position.z = 0;
    falling = true;
    fallElapsed = 0;
  }
});

function settleResult() {
  desiredCameraRadius = returnCameraRadius;
  const playerIndex = currentSpinPlayer;
  let message = "";
  if (resultLetter === "ג") {
    const take = pot;
    balances[playerIndex] += take;
    animateCoinTransfer(playerIndex, { index: playerIndex }, take);
    message = names[playerIndex] + " collected " + take + " coins!";
    pot = 0;
  } else if (resultLetter === "ה") {
    const take = Math.ceil(pot / 2);
    balances[playerIndex] += take;
    animateCoinTransfer(playerIndex, { index: playerIndex }, take);
    pot -= take;
    message = names[playerIndex] + " collected " + take + " coins.";
  } else if (resultLetter === "ש") {
    if (balances[playerIndex] > 0) {
      balances[playerIndex] -= 1;
      pot += 1;
      animateCoinTransfer(playerIndex, null, 1);
      message = names[playerIndex] + " added one coin to the pot.";
    } else {
      message = names[playerIndex] + " has no coin left to add.";
    }
  } else {
    message = "No change.";
  }
  if (resultLetter === "ג" || resultLetter === "ה") celebrationElapsed = 0.001;
  if (resultLetter === "ג" || resultLetter === "ה") playCoinChime();
  $("sceneResult").textContent = resultLetter + "  ·  " + resultNames[resultLetter];
  $("sceneResult").classList.add("show");
  addActivity(resultLetter + " — " + message);
  gameBusy = false;
  advanceTurn();
}

document.querySelectorAll(".rename-player").forEach(button => button.addEventListener("click", () => {
  const index = Number(button.dataset.player);
  const answer = window.prompt("Enter a name for this player:", names[index]);
  if (answer && answer.trim()) {
    names[index] = answer.trim().slice(0, 18);
    try { localStorage.setItem("virtualDreidelNames", JSON.stringify(names)); } catch { /* Local play still works without storage. */ }
    refreshUI();
    addActivity(names[index] + " is now at the table.");
  }
}));
document.querySelectorAll(".table-finish-option").forEach(button => button.addEventListener("click", () => {
  const finish = button.dataset.finish;
  if (!ownedTableFinishes.has(finish)) {
    const cost = Number(button.dataset.cost);
    if (balances[0] < cost) {
      addActivity("You need " + (cost - balances[0]) + " more coins to unlock the " + button.dataset.name + " table.");
      return;
    }
    balances[0] -= cost;
    ownedTableFinishes.add(finish);
    try { localStorage.setItem("virtualDreidelTableFinishes", JSON.stringify([...ownedTableFinishes])); } catch { /* Current session still retains the unlock. */ }
    addActivity("Unlocked the " + button.dataset.name + " table finish!");
    refreshUI();
  }
  setTableFinish(finish);
}));
document.querySelectorAll(".dreidel-finish-option").forEach(button => button.addEventListener("click", () => {
  const finish = button.dataset.finish;
  if (!ownedFinishes.has(finish)) {
    const cost = Number(button.dataset.cost);
    if (balances[0] < cost) {
      addActivity("You need " + (cost - balances[0]) + " more coins to unlock " + button.dataset.name + ".");
      return;
    }
    balances[0] -= cost;
    ownedFinishes.add(finish);
    try { localStorage.setItem("virtualDreidelFinishes", JSON.stringify([...ownedFinishes])); } catch { /* The current session still retains the unlock. */ }
    addActivity("Unlocked the " + button.dataset.name + " dreidel finish!");
    refreshUI();
  }
  setDreidelFinish(finish);
}));
document.querySelectorAll(".bet-option").forEach(button => button.addEventListener("click", () => {
  bet = button.dataset.bet === "all" ? balances[0] : Number(button.dataset.bet);
  refreshUI();
}));
$("spinButton").addEventListener("click", spinDreidel);
$("dailyBonus").addEventListener("click", () => {
  const todayKey = new Date().toLocaleDateString();
  let alreadyClaimed = false;
  try { alreadyClaimed = localStorage.getItem("virtualDreidelDailyBonusDate") === todayKey; } catch { /* Continue with a session-only reward. */ }
  if (alreadyClaimed || gameOver) return;
  balances[0] += 10;
  try { localStorage.setItem("virtualDreidelDailyBonusDate", todayKey); } catch { /* Session bonus remains available now. */ }
  addActivity("You claimed your daily 10-coin bonus.");
  saveGame();
  refreshUI();
});
window.addEventListener("keydown", event => {
  const target = event.target;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    spinDreidel();
  }
  if (event.key.toLowerCase() === "n" && !gameBusy) {
    $("newGame").click();
  }
});
$("soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("soundToggle").textContent = soundEnabled ? "♫" : "♪";
  $("soundToggle").classList.toggle("muted", !soundEnabled);
  $("soundToggle").setAttribute("aria-label", soundEnabled ? "Mute sound" : "Enable sound");
});
function setCameraPreset(mode) {
  if (mode === "table") {
    camera.setTarget(new Vector3(0, 0.0, 0));
    camera.alpha = -Math.PI / 2.25; camera.beta = 1.2; desiredCameraRadius = 16.5;
  } else if (mode === "room") {
    camera.setTarget(new Vector3(0, 0.05, 0));
    camera.alpha = -Math.PI / 2.25; camera.beta = 1.34; desiredCameraRadius = 19.0;
  } else {
    camera.setTarget(new Vector3(0, 0.8, 0));
    camera.alpha = -Math.PI / 2.25; camera.beta = 1.42; desiredCameraRadius = 22.5;
  }
}
$("resetCamera").addEventListener("click", () => setCameraPreset("room"));
$("viewTable").addEventListener("click", () => setCameraPreset("table"));
$("viewRoom").addEventListener("click", () => setCameraPreset("wide"));
$("fullscreen").addEventListener("click", () => {
  const host = $("render-host");
  if (document.fullscreenElement) document.exitFullscreen?.();
  else host.requestFullscreen?.();
});
$("newGame").addEventListener("click", () => {
  if (gameBusy) return;
  coinFlights.forEach(flight => flight.mesh.dispose());
  coinFlights.length = 0;
  balances = [100, 100, 100, 100];
  pot = 12; turn = 0; round = 1; bet = 1;
  gameOver = false; currentSpinPlayer = 0;
  if (winnerCrown) { winnerCrown.dispose(); winnerCrown = null; }
  resetDreidel();
  $("sceneResult").classList.remove("show");
  $("activityLog").replaceChildren();
  addActivity("A new family game has started.");
  saveGame();
  refreshUI();
});
// Give the room furniture, curtains, books and Chanukah details proper
// contact shadows so objects feel grounded rather than pasted into the scene.
scene.meshes.forEach(mesh => {
  if (/sofa|armchair|sideTable|lamp|window|menorah|console|bookcase|libraryBook|curtain|wallArt|rug|playerNamePlaque/.test(mesh.name)) {
    shadows.addShadowCaster(mesh);
  }
});

// Real, textured CC0 furniture models from Poly Haven. The procedural furniture
// remains as a graceful fallback if a model CDN is unavailable.
async function importPolyHavenModel(assetFolder, fileName, name, position, scale, rotationY = 0, hidePattern = null) {
  const rootUrl = "https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/" + assetFolder + "/";
  const imported = await SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene);
  const anchor = new TransformNode(name + "Placement", scene);
  anchor.position.copyFrom(position);
  anchor.scaling.setAll(scale);
  anchor.rotation.y = rotationY;
  const rootMesh = imported.meshes[0];
  if (!rootMesh) throw new Error("The " + name + " model contained no mesh root.");
  rootMesh.parent = anchor;
  imported.meshes.forEach(mesh => {
    mesh.receiveShadows = true;
    if (mesh.getTotalVertices && mesh.getTotalVertices() > 0) shadows.addShadowCaster(mesh);
  });
  if (hidePattern) {
    scene.meshes.forEach(mesh => {
      if (hidePattern.test(mesh.name)) mesh.setEnabled(false);
    });
  }
  return anchor;
}

async function loadPremiumRoomFurniture() {
  try {
    await importPolyHavenModel(
      "Sofa_01", "Sofa_01_1k.gltf", "PolyHavenSofa",
      new Vector3(0, -1.72, 9.45), 3.8, 0, /^(sofa|sofaAccentPillow)/
    );
    console.info("Virtual Dreidel: Poly Haven sofa loaded (CC0).");
  } catch (error) {
    console.warn("Virtual Dreidel: sofa model unavailable; keeping the built-in sofa.", error);
  }

  const chairPlacements = [
    [new Vector3(0, -1.72, -9.0), Math.PI],
    [new Vector3(-8.0, -1.72, 0), -Math.PI / 2],
    [new Vector3(8.0, -1.72, 0), Math.PI / 2]
  ];
  const importedChairs = [];
  try {
    for (let i = 0; i < chairPlacements.length; i++) {
      const [position, rotation] = chairPlacements[i];
      importedChairs.push(await importPolyHavenModel(
        "ArmChair_01", "ArmChair_01_1k.gltf", "PolyHavenArmchair" + (i + 1),
        position, 2.25, rotation
      ));
    }
    // Replace all three fallback chairs only after all three real models load.
    scene.meshes.forEach(mesh => {
      if (/^armchair/i.test(mesh.name)) mesh.setEnabled(false);
    });
    document.documentElement.classList.add("premium-furniture-loaded");
    console.info("Virtual Dreidel: three Poly Haven armchairs loaded (CC0).");
  } catch (error) {
    importedChairs.forEach(anchor => anchor.dispose(false, true));
    console.warn("Virtual Dreidel: armchair models unavailable; keeping the built-in chairs.", error);
  }
}
// The cinematic room artwork supplies the furniture; keep the 3D game pieces in the foreground.
refreshUI();
if (!gameOver && turn !== 0) scheduleAiTurn();

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
$("sceneLoading").classList.add("hidden");
