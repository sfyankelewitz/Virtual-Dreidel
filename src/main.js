import "./style.css";
import {
  Engine, Scene, ArcRotateCamera, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, MeshBuilder, PBRMaterial,
  StandardMaterial, DynamicTexture, TransformNode, ShadowGenerator,
  GlowLayer, Texture, Scalar
} from "@babylonjs/core";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.075, 0.078, 0.095, 1);
scene.environmentTexture = null;

const camera = new ArcRotateCamera("camera", -Math.PI / 2.25, 1.05, 10.8, new Vector3(0, 0.7, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 6.2;
camera.upperRadiusLimit = 17;
camera.lowerBetaLimit = 0.55;
camera.upperBetaLimit = 1.38;
camera.wheelPrecision = 45;
camera.panningSensibility = 0;

const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.68;
hemi.diffuse = new Color3(1, 0.88, 0.72);
hemi.groundColor = new Color3(0.18, 0.15, 0.13);
const key = new DirectionalLight("warmKey", new Vector3(-5, -9, 6), scene);
key.position = new Vector3(5, 10, -5);
key.intensity = 2.2;
key.diffuse = new Color3(1, 0.82, 0.61);
const fill = new DirectionalLight("coolFill", new Vector3(4, -5, -3), scene);
fill.position = new Vector3(-6, 5, 4);
fill.intensity = 0.65;
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
const felt = pbr("tableInlay", "#3e3026", 0.05, 0.9);
const coinMat = pbr("coinGold", "#e5b957", 0.88, 0.22);
const darkMat = pbr("darkMetal", "#302b2a", 0.8, 0.3);

// The table is built as real Babylon meshes, with layered walnut and brass details.
const tableBase = MeshBuilder.CreateCylinder("tableBase", { diameter: 14.2, height: 0.52, tessellation: 128 }, scene);
tableBase.position.y = -0.28;
tableBase.material = darkWood;
tableBase.receiveShadows = true;
const tableTop = MeshBuilder.CreateCylinder("walnutTabletop", { diameter: 13.9, height: 0.16, tessellation: 128 }, scene);
tableTop.position.y = 0.04;
tableTop.material = tableMat;
tableTop.receiveShadows = true;
shadows.addShadowCaster(tableBase);
shadows.addShadowCaster(tableTop);
for (const [diameter, tube, y] of [[13.95, 0.045, 0.12], [13.45, 0.025, 0.125], [8.0, 0.018, 0.126]]) {
  const ring = MeshBuilder.CreateTorus("brassTableInlay", { diameter, thickness: tube, tessellation: 128 }, scene);
  ring.position.y = y;
  ring.material = brass;
}
const centerFelt = MeshBuilder.CreateCylinder("centerFelt", { diameter: 7.85, height: 0.012, tessellation: 96 }, scene);
centerFelt.position.y = 0.125;
centerFelt.material = felt;

// Coin stacks around the central pot.
function makeCoin(x, z, count = 3) {
  for (let i = 0; i < count; i++) {
    const coin = MeshBuilder.CreateCylinder("dreidelCoin", { diameter: 0.39, height: 0.055, tessellation: 48 }, scene);
    coin.position.set(x + i * 0.035, 0.19 + i * 0.052, z);
    coin.material = coinMat;
    coin.rotation.z = (Math.random() - 0.5) * 0.12;
    shadows.addShadowCaster(coin);
  }
}
makeCoin(-1.25, 0.35, 4); makeCoin(1.2, -0.2, 3); makeCoin(0.1, 1.25, 2);
const potRing = MeshBuilder.CreateTorus("potMarker", { diameter: 3.25, thickness: 0.025, tessellation: 96 }, scene);
potRing.position.y = 0.15;
potRing.material = brass;

// Four understated seat markers help establish the multiplayer table layout.
const seatPositions = [
  new Vector3(0, 0.15, -5.0), new Vector3(5.0, 0.15, 0),
  new Vector3(0, 0.15, 5.0), new Vector3(-5.0, 0.15, 0)
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
  ctx.font = "bold 300px Georgia, serif";
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
  const face = MeshBuilder.CreatePlane("hebrewFace" + i, { width: 0.66, height: 0.69, sideOrientation: MeshBuilder.DOUBLESIDE }, scene);
  face.parent = dreidelRoot;
  face.position.y = 1.03;
  const a = faceRotations[i];
  face.position.x = Math.sin(a) * 0.39;
  face.position.z = Math.cos(a) * 0.39;
  face.rotation.y = a;
  face.material = letterMaterial(letter, "letter" + i);
});

// A soft shadow-catching floor beneath the table.
const floor = MeshBuilder.CreateGround("studioFloor", { width: 200, height: 200 }, scene);
floor.position.y = -0.56;
const floorMat = pbr("studioFloorMat", "#171820", 0.12, 0.82);
floor.material = floorMat;
floor.receiveShadows = true;
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
  dreidelRoot.scaling.setAll(1);
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
  camera.setTarget(new Vector3(0, 0.7, 0));
  camera.alpha = -Math.PI / 2.25; camera.beta = 1.05; camera.radius = 10.8;
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
