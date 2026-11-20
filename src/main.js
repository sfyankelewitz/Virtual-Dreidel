import "./style.css";
import {
  Engine, Scene, ArcRotateCamera, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, PointLight, MeshBuilder, PBRMaterial,
  StandardMaterial, DynamicTexture, TransformNode, ShadowGenerator,
  GlowLayer, Texture, Scalar
} from "@babylonjs/core";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.075, 0.078, 0.095, 1);
scene.environmentTexture = null;

const camera = new ArcRotateCamera("camera", -Math.PI / 2.25, 1.12, 17.5, new Vector3(0, 1.15, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 11.5;
camera.upperRadiusLimit = 22;
camera.lowerBetaLimit = 0.62;
camera.upperBetaLimit = 1.42;
camera.wheelPrecision = 45;
camera.panningSensibility = 0;

const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.82;
hemi.diffuse = new Color3(1, 0.88, 0.72);
hemi.groundColor = new Color3(0.18, 0.15, 0.13);
const key = new DirectionalLight("warmKey", new Vector3(-5, -9, 6), scene);
key.position = new Vector3(5, 10, -5);
key.intensity = 2.0;
key.diffuse = new Color3(1, 0.82, 0.61);
const fill = new DirectionalLight("coolFill", new Vector3(4, -5, -3), scene);
fill.position = new Vector3(-6, 5, 4);
fill.intensity = 0.8;
fill.diffuse = new Color3(0.65, 0.76, 1);

const shadows = new ShadowGenerator(2048, key);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.setDarkness(0.34);
scene.imageProcessingConfiguration.toneMappingEnabled = true;
scene.imageProcessingConfiguration.exposure = 1.15;
scene.imageProcessingConfiguration.contrast = 1.15;
const glow = new GlowLayer("subtleGlow", scene);
glow.intensity = 0.22;

function pbr(name, color, metallic = 0, roughness = 0.55) {
  const mat = new PBRMaterial(name, scene);
  mat.albedoColor = Color3.FromHexString(color);
  mat.metallic = metallic;
  mat.roughness = roughness;
  return mat;
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
    ctx.strokeStyle = i % 5 === 0 ? "rgba(35,17,10,.27)" : "rgba(215,163,104,.10)";
    ctx.lineWidth = i % 7 === 0 ? 3 : 1;
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    ctx.beginPath(); ctx.ellipse(x, y, 35 + Math.random() * 55, 5 + Math.random() * 12, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(31,15,8,.2)"; ctx.lineWidth = 3; ctx.stroke();
  }
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

const tableMat = pbr("walnutTable", "#805536", 0.05, 0.36);
tableMat.albedoTexture = woodTexture();
const darkWood = pbr("darkTableEdge", "#38251b", 0.12, 0.32);
const brass = pbr("agedBrass", "#b88b4d", 0.82, 0.24);
const felt = pbr("tableInlay", "#203a31", 0.02, 0.96);
const coinMat = pbr("coinGold", "#e5b957", 0.88, 0.22);
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

// A warm, enclosed living-room backdrop gives the table a real sense of place.
const roomFloor = MeshBuilder.CreateGround("livingRoomFloor", { width: 34, height: 30 }, scene);
roomFloor.position.set(0, -1.72, 0);
roomFloor.material = pbr("roomFloorMat", "#594638", 0.04, 0.78);
roomFloor.receiveShadows = true;
const backWall = MeshBuilder.CreateBox("livingRoomBackWall", { width: 30, height: 12, depth: 0.35 }, scene);
backWall.position.set(0, 4.2, 11.8); backWall.material = roomWall;
const leftWall = MeshBuilder.CreateBox("livingRoomLeftWall", { width: 0.35, height: 12, depth: 24 }, scene);
leftWall.position.set(-14.8, 4.2, 0); leftWall.material = roomWall;

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
}

const rightWall = MeshBuilder.CreateBox("livingRoomRightWall", { width: 0.35, height: 12, depth: 24 }, scene);
rightWall.position.set(14.8, 4.2, 0); rightWall.material = roomWall;

// Tall window, divided into elegant panes, with heavy warm-toned curtains.
const windowFrame = MeshBuilder.CreateBox("livingRoomWindowFrame", { width: 0.2, height: 4.5, depth: 6.4 }, scene);
windowFrame.position.set(14.48, 4.25, 0.4); windowFrame.material = cabinetMat;
const windowPane = MeshBuilder.CreateBox("livingRoomWindowPane", { width: 0.08, height: 4.15, depth: 6.05 }, scene);
windowPane.position.set(14.34, 4.25, 0.4); windowPane.material = windowGlass;
for (const z of [-1.55, 0.4, 2.35]) {
  const mullion = MeshBuilder.CreateBox("windowMullion", { width: 0.1, height: 4.1, depth: 0.11 }, scene);
  mullion.position.set(14.25, 4.25, z); mullion.material = brass;
}
const windowCrossbar = MeshBuilder.CreateBox("windowCrossbar", { width: 0.1, height: 0.12, depth: 6.0 }, scene);
windowCrossbar.position.set(14.25, 4.25, 0.4); windowCrossbar.material = brass;
for (const z of [-3.0, 3.8]) {
  const curtain = MeshBuilder.CreateBox("windowCurtain", { width: 0.34, height: 4.9, depth: 0.85 }, scene);
  curtain.position.set(14.18, 4.2, z); curtain.material = curtainMat;
}
for (const x of [-13.7, 13.7]) {
  const trim = MeshBuilder.CreateBox("wallBaseboard", { width: 0.16, height: 0.38, depth: 23.5 }, scene);
  trim.position.set(x, -1.48, 0); trim.material = wallTrim;
}
const backBaseboard = MeshBuilder.CreateBox("backWallBaseboard", { width: 29, height: 0.38, depth: 0.16 }, scene);
backBaseboard.position.set(0, -1.48, 11.55); backBaseboard.material = wallTrim;

// Large framed artwork, kept abstract so it reads as room decor rather than game UI.
const artFrame = MeshBuilder.CreateBox("wallArtFrame", { width: 4.2, height: 2.8, depth: 0.16 }, scene);
artFrame.position.set(0, 4.25, 11.48); artFrame.material = brass;
const artCanvas = MeshBuilder.CreateBox("wallArtCanvas", { width: 3.9, height: 2.5, depth: 0.08 }, scene);
artCanvas.position.set(0, 4.25, 11.36); artCanvas.material = pbr("artCanvas", "#31433f", 0.0, 0.95);
const artSun = MeshBuilder.CreateDisc("artSun", { radius: 0.72, tessellation: 64 }, scene);
artSun.position.set(0, 4.35, 11.29); artSun.rotation.y = Math.PI; artSun.material = brass;

// A low, generously cushioned sofa sits against the back wall.
const sofaBase = MeshBuilder.CreateBox("sofaBase", { width: 7.5, height: 0.72, depth: 1.65 }, scene);
sofaBase.position.set(0, -1.28, 8.9); sofaBase.material = upholstery;
const sofaBack = MeshBuilder.CreateBox("sofaBack", { width: 7.5, height: 1.8, depth: 0.62 }, scene);
sofaBack.position.set(0, -0.58, 9.48); sofaBack.material = upholstery;
for (const x of [-3.65, 3.65]) {
  const arm = MeshBuilder.CreateBox("sofaArm", { width: 0.58, height: 1.25, depth: 1.75 }, scene);
  arm.position.set(x, -1.12, 8.9); arm.material = upholstery;
}
for (const x of [-2.45, -0.85, 0.85, 2.45]) {
  const cushion = MeshBuilder.CreateBox("sofaCushion", { width: 1.48, height: 0.2, depth: 1.25 }, scene);
  cushion.position.set(x, -0.87, 8.55); cushion.material = upholsteryLight;
}
// Soft accent pillows make the sofa feel lived-in.
for (const [x, color] of [[-2.65, "#b58b68"], [2.65, "#9b7964"]]) {
  const pillowMat = pbr("sofaAccentPillow", color, 0, 1);
  const pillow = MeshBuilder.CreateBox("sofaAccentPillow", { width: 0.85, height: 0.72, depth: 0.28 }, scene);
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
  const cushion = MeshBuilder.CreateBox("armchairSeatCushion", { width: 2.12, height: 0.16, depth: 1.68 }, scene);
  cushion.parent = root; cushion.position.set(0, -0.72, -0.03); cushion.material = upholsteryLight;
  const back = MeshBuilder.CreateBox("armchairBack", { width: 2.45, height: 1.65, depth: 0.38 }, scene);
  back.parent = root; back.position.set(0, 0.08, -0.82); back.material = upholstery;
  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateBox("armchairArm", { width: 0.38, height: 0.82, depth: 1.8 }, scene);
    arm.parent = root; arm.position.set(side * 1.04, -0.23, 0.02); arm.material = upholstery;
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
shadows.addShadowCaster(tableBase);
shadows.addShadowCaster(tableTop);

// A carved central pedestal makes the round table feel grounded and substantial.
const pedestal = MeshBuilder.CreateCylinder("tablePedestal", { diameter: 1.75, height: 1.08, tessellation: 64 }, scene);
pedestal.position.y = -1.02; pedestal.material = darkWood;
const pedestalFoot = MeshBuilder.CreateCylinder("pedestalFoot", { diameter: 3.35, height: 0.2, tessellation: 96 }, scene);
pedestalFoot.position.y = -1.58; pedestalFoot.material = darkWood;
const pedestalFootTrim = MeshBuilder.CreateTorus("pedestalFootBrass", { diameter: 3.22, thickness: 0.035, tessellation: 96 }, scene);
pedestalFootTrim.position.y = -1.47; pedestalFootTrim.material = brass;
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

// Coin stacks around the central pot.
function makeCoin(x, z, count = 3) {
  for (let i = 0; i < count; i++) {
    const coin = MeshBuilder.CreateCylinder("dreidelCoin", { diameter: 0.46, height: 0.065, tessellation: 48 }, scene);
    coin.position.set(x + i * 0.035, 0.19 + i * 0.062, z);
    coin.material = coinMat;
    coin.rotation.z = (Math.random() - 0.5) * 0.12;
    shadows.addShadowCaster(coin);
  }
}
makeCoin(-1.45, 0.45, 5); makeCoin(1.45, -0.35, 4); makeCoin(0.0, 1.55, 3);
const potRing = MeshBuilder.CreateTorus("potMarker", { diameter: 3.0, thickness: 0.03, tessellation: 96 }, scene);
potRing.position.y = 0.15;
potRing.material = brass;

// Four understated seat markers help establish the multiplayer table layout.
const seatPositions = [
  new Vector3(0, 0.15, -4.55), new Vector3(4.55, 0.15, 0),
  new Vector3(0, 0.15, 4.55), new Vector3(-4.55, 0.15, 0)
];
const seatMaterials = ["#b98b4d", "#bb8291", "#789bbd", "#82a78d"].map((c, i) => pbr("seat" + i, c, 0.25, 0.4));
seatPositions.forEach((pos, i) => {
  const disc = MeshBuilder.CreateCylinder("playerSeatMarker", { diameter: 1.0, height: 0.045, tessellation: 48 }, scene);
  disc.position.copyFrom(pos);
  disc.material = seatMaterials[i];
  const inner = MeshBuilder.CreateTorus("seatRing", { diameter: 1.08, thickness: 0.035, tessellation: 48 }, scene);
  inner.position.set(pos.x, 0.19, pos.z);
  inner.material = brass;
});

// Procedural lettering texture: each Hebrew character is painted into its own face texture.
function letterMaterial(letter, name) {
  const texture = new DynamicTexture(name + "LetterTexture", { width: 512, height: 512 }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "#f0d5a1";
  ctx.font = "bold 300px Arial, sans-serif";
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
dreidelRoot.scaling.setAll(1.55);
const bodyMat = pbr("handTurnedWalnut", "#80502d", 0.12, 0.29);
bodyMat.albedoTexture = woodTexture();
const body = MeshBuilder.CreateCylinder("fourSidedDreidelBody", {
  height: 1.28, diameterTop: 1.08, diameterBottom: 0.19, tessellation: 4, subdivisions: 1
}, scene);
body.parent = dreidelRoot;
body.position.y = 1.0;
body.rotation.y = Math.PI / 4;
body.material = bodyMat;
body.receiveShadows = true;
shadows.addShadowCaster(body);

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
const stemCap = MeshBuilder.CreateSphere("handleCap", { diameter: 0.25, segments: 24 }, scene);
stemCap.parent = dreidelRoot; stemCap.position.y = 2.17; stemCap.material = brass;
const tip = MeshBuilder.CreateCylinder("dreidelPoint", { height: 0.32, diameterTop: 0.24, diameterBottom: 0.025, tessellation: 4 }, scene);
tip.parent = dreidelRoot; tip.position.y = 0.18; tip.rotation.y = Math.PI / 4; tip.material = brass;

const faceLetters = ["נ", "ג", "ה", "ש"];
const faceRotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
faceLetters.forEach((letter, i) => {
  const a = faceRotations[i];
  // Raised brass frame, dark inset, and a clear gold Hebrew letter on each side.
  const frame = MeshBuilder.CreateBox("dreidelFaceFrame" + i, { width: 0.59, height: 0.66, depth: 0.055 }, scene);
  frame.parent = dreidelRoot;
  frame.position.set(Math.sin(a) * 0.34, 1.03, Math.cos(a) * 0.34);
  frame.rotation.y = a;
  frame.material = brass;

  const inset = MeshBuilder.CreateBox("dreidelFaceInset" + i, { width: 0.51, height: 0.58, depth: 0.035 }, scene);
  inset.parent = dreidelRoot;
  inset.position.set(Math.sin(a) * 0.377, 1.03, Math.cos(a) * 0.377);
  inset.rotation.y = a;
  inset.material = darkWood;

  const face = MeshBuilder.CreatePlane("hebrewFace" + i, { width: 0.41, height: 0.49, sideOrientation: MeshBuilder.DOUBLESIDE }, scene);
  face.parent = dreidelRoot;
  face.position.set(Math.sin(a) * 0.401, 1.03, Math.cos(a) * 0.401);
  face.rotation.y = a;
  face.material = letterMaterial(letter, "letter" + i);
});

// The room floor above also receives the table and furniture shadows.
// Register the actual meshes as shadow casters; TransformNode itself is not a mesh.
shadows.addShadowCaster(topCollar);
shadows.addShadowCaster(stem);
shadows.addShadowCaster(stemCap);
shadows.addShadowCaster(tip);

let spinning = false;
let spinElapsed = 0;
let spinDuration = 4.2;
let spinSpeed = 0;
let resultLetter = "";
let restingTilt = 0;
let bet = 1;
let turn = 0;
let round = 1;
let pot = 12;
let balances = [100, 100, 100, 100];
let gameBusy = false;
const names = ["You", "Sarah", "David", "Moishe"];
const letters = ["נ", "ג", "ה", "ש"];
const resultNames = { "נ": "NUN — Nothing happens", "ג": "GIMEL — Take the whole pot!", "ה": "HEY — Take half the pot", "ש": "SHIN — Add one coin to the pot" };
const $ = id => document.getElementById(id);

function refreshUI() {
  $("potValue").textContent = pot;
  $("balanceValue").textContent = balances[0];
  $("activePlayer").textContent = names[turn];
  $("roundValue").textContent = String(round).padStart(2, "0");
  $("turnPill").textContent = turn === 0 ? "YOUR TURN" : "WAITING";
  $("turnNote").textContent = turn === 0 ? "Your turn. Choose your wager and spin." : names[turn] + " is taking a turn in this local demo.";
  $("spinButton").disabled = gameBusy || turn !== 0 || balances[turn] < bet;
  $("spinButton").querySelector("span:nth-child(2)").textContent = gameBusy ? "SPINNING…" : turn === 0 ? "SPIN DREIDEL" : names[turn].toUpperCase() + " IS UP";
  $("playerBalance0").textContent = balances[0];
  $("playerBalance1").textContent = balances[1];
  $("playerBalance2").textContent = balances[2];
  $("playerBalance3").textContent = balances[3];
  document.querySelectorAll(".player-row").forEach((row, i) => {
    row.classList.toggle("active", i === turn);
    row.querySelector("small").textContent = i === turn ? (turn === 0 ? "Playing now" : "Taking a turn") : "Ready";
  });
  document.querySelectorAll(".bet-option").forEach(button => {
    const amount = Number(button.dataset.bet);
    button.classList.toggle("active", amount === bet);
    button.disabled = gameBusy || turn !== 0 || amount > balances[0];
  });
}

function addActivity(message) {
  const p = document.createElement("p");
  const icon = document.createElement("span");
  icon.textContent = "✦";
  p.append(icon, document.createTextNode(" " + message));
  $("activityLog").prepend(p);
  while ($("activityLog").children.length > 6) $("activityLog").lastElementChild.remove();
}

function resetDreidel() {
  dreidelRoot.rotation.set(0, 0, 0);
  dreidelRoot.position.set(0, 0.14, 0);
  dreidelRoot.scaling.setAll(1.55);
}

function spinDreidel() {
  if (gameBusy || turn !== 0 || balances[0] < bet) return;
  gameBusy = true;
  balances[0] -= bet;
  pot += bet;
  spinElapsed = 0;
  spinDuration = 4.1 + Math.random() * 0.7;
  spinSpeed = 23 + Math.random() * 5;
  resultLetter = letters[Math.floor(Math.random() * letters.length)];
  resetDreidel();
  spinning = true;
  $("sceneResult").classList.remove("show");
  addActivity("You placed " + bet + " coin" + (bet === 1 ? "" : "s") + " and spun.");
  refreshUI();
}

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  if (!spinning) return;
  spinElapsed += dt;
  const progress = Math.min(spinElapsed / spinDuration, 1);
  const decay = Math.pow(1 - progress, 1.65);
  dreidelRoot.rotation.y += spinSpeed * decay * dt;
  const wobble = (0.025 + (1 - decay) * 0.22) * Math.sin(spinElapsed * 17);
  dreidelRoot.rotation.x = wobble * decay + Math.sin(spinElapsed * 8) * (1 - decay) * 0.07;
  dreidelRoot.rotation.z = Math.cos(spinElapsed * 13) * (1 - decay) * 0.09;
  dreidelRoot.position.y = 0.14 + Math.abs(Math.sin(spinElapsed * 20)) * 0.035 * decay;
  if (progress >= 1) {
    spinning = false;
    // Settle with a slight lean. The selected letter is shown in the result banner.
    dreidelRoot.rotation.y = faceRotations[letters.indexOf(resultLetter)] + Math.PI / 4;
    dreidelRoot.rotation.x = 1.22;
    dreidelRoot.rotation.z = 0.12;
    dreidelRoot.position.y = 0.48;
    settleResult();
  }
});

function settleResult() {
  let message = "";
  if (resultLetter === "ג") {
    balances[0] += pot; message = "You collected " + pot + " coins!"; pot = 0;
  } else if (resultLetter === "ה") {
    const take = Math.ceil(pot / 2); balances[0] += take; pot -= take; message = "You collected " + take + " coins.";
  } else if (resultLetter === "ש") {
    pot += 1; message = "One extra coin goes into the pot.";
  } else {
    message = "No change. Your turn is complete.";
  }
  $("sceneResult").textContent = resultLetter + "  ·  " + resultNames[resultLetter];
  $("sceneResult").classList.add("show");
  addActivity(resultLetter + " — " + message);
  gameBusy = false;
  turn = (turn + 1) % 4;
  if (turn === 0) round += 1;
  refreshUI();
}

document.querySelectorAll(".bet-option").forEach(button => button.addEventListener("click", () => {
  bet = Number(button.dataset.bet);
  refreshUI();
}));
$("spinButton").addEventListener("click", spinDreidel);
$("resetCamera").addEventListener("click", () => {
  camera.setTarget(new Vector3(0, 1.15, 0));
  camera.alpha = -Math.PI / 2.25; camera.beta = 1.12; camera.radius = 17.5;
});
$("fullscreen").addEventListener("click", () => {
  const host = $("render-host");
  if (document.fullscreenElement) document.exitFullscreen?.();
  else host.requestFullscreen?.();
});
$("newGame").addEventListener("click", () => {
  if (gameBusy) return;
  balances = [100, 100, 100, 100]; pot = 12; turn = 0; round = 1; bet = 1;
  resetDreidel();
  $("sceneResult").classList.remove("show");
  $("activityLog").replaceChildren();
  addActivity("A new family game has started.");
  refreshUI();
});
refreshUI();

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
$("sceneLoading").classList.add("hidden");
