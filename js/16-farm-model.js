// ---------- the wheat-farm model: assets/farm.glb is a small Blender diorama, so it is
// rendered once from the game's isometric angle and used as the farm's field art ----------
// The GLB is loaded in the browser with three.js (from the same CDN family as Pixi).
// The file holds three copies of the bed plus green/blue ground planes. We keep only the
// copy with the most yellow wheat, drop the green grass base, repaint the blue soil rows
// brown, stretch that single bed over the 5x2 field, and bake two sprites (rot 0 / rot 1).
import * as THREE from 'https://esm.sh/three@0.170.0';
import { GLTFLoader } from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

const IX = Math.SQRT1_2, IY = IX / 2;
const projX = (x, y) => (x - y) * IX;
const projY = (x, y) => (x + y) * IY;
const ELEV = 30 * Math.PI / 180;
const CAM_DIR = new THREE.Vector3(Math.cos(ELEV) * Math.cos(Math.PI / 4), Math.sin(ELEV), Math.cos(ELEV) * Math.sin(Math.PI / 4));
const CAM_UP = new THREE.Vector3(-Math.sin(ELEV) * Math.SQRT1_2, Math.cos(ELEV), -Math.sin(ELEV) * Math.SQRT1_2);

const colorOf = mesh => mesh.material && mesh.material.color;
const isGreenGround = mesh => { const c = colorOf(mesh); return !!c && c.r < .15 && c.g > .5 && c.b < .15; };
const isBlueStrip = mesh => { const c = colorOf(mesh); return !!c && c.r < .25 && c.g < .25 && c.b > .6; };
const isWheat = mesh => { const c = colorOf(mesh); return !!c && c.r > .5 && c.g > .3 && c.b < .3; };
const keepPart = mesh => !isGreenGround(mesh);   // drop the green grass base; the bed, soil and wheat stay
const SOIL_BROWN = 0x6b4226;                     // the file's blue strips are soil rows, so paint them brown

function groupMeshes(root) {          // split the file into its three bed copies
  const meshes = [];
  root.updateMatrixWorld(true);
  root.traverse(o => { if (o.isMesh && keepPart(o)) { const p = new THREE.Vector3(); o.getWorldPosition(p); meshes.push({ o, p }); } });
  const parent = meshes.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  for (let i = 0; i < meshes.length; i++) for (let j = i + 1; j < meshes.length; j++)
    if (Math.hypot(meshes[i].p.x - meshes[j].p.x, meshes[i].p.z - meshes[j].p.z) < 25) join(i, j);
  const groups = new Map();
  meshes.forEach((m, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(m); });
  let best = null, bestWheat = -1, bestCount = -1;
  for (const g of groups.values()) {
    const wheat = g.reduce((n, m) => n + (isWheat(m.o) ? 1 : 0), 0);   // the copy with the yellow wheat bed wins
    if (wheat > bestWheat || (wheat === bestWheat && g.length > bestCount)) { best = g; bestWheat = wheat; bestCount = g.length; }
  }
  return best || [];
}

function bakeBed(root, keep) {         // flatten the chosen copy into one small model
  const model = new THREE.Group();
  const soil = new THREE.MeshStandardMaterial({ color: SOIL_BROWN, roughness: .95, metalness: 0 });
  for (const { o } of keep) {
    o.updateWorldMatrix(true, false);
    const m = new THREE.Mesh(o.geometry, isBlueStrip(o) ? soil : o.material);   // no blue paint in the field
    m.applyMatrix4(o.matrixWorld);
    model.add(m);
  }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const norm = new THREE.Group();
  model.position.set(-center.x, -box.min.y, -center.z);
  norm.add(model);
  return { norm, size };
}

function buildAssembly(bed, rot, FW, FH) {
  const g = new THREE.Group();
  // one bed per farm, stretched to cover the whole field footprint
  const fw = rot ? FH : FW, fh = rot ? FW : FH;
  const sx = fw / bed.size.x, sz = fh / bed.size.z, sy = (sx + sz) / 2;
  const b = bed.norm.clone(true);
  b.scale.set(sx, sy, sz);
  b.position.set(fw / 2, 0, fh / 2);
  g.add(b);
  return g;
}

function renderView(assembly, rot, FW, FH) {
  const W = 1024;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f4a, 1.9));
  const sun = new THREE.DirectionalLight(0xfff1cc, 2.1); sun.position.set(180, 260, 120); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc6dcff, .7); fill.position.set(-160, 140, -140); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  scene.add(assembly);

  const box = new THREE.Box3().setFromObject(assembly);
  const center = box.getCenter(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 4000);
  camera.up.copy(CAM_UP);
  camera.position.copy(center).addScaledVector(CAM_DIR, 800);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  // fit the orthographic frame to everything the model draws
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    min.min(v); max.max(v);
  }
  const pad = 4;
  camera.left = min.x - pad; camera.right = max.x + pad;
  camera.bottom = min.y - pad; camera.top = max.y + pad;
  camera.updateProjectionMatrix();

  const H = Math.round(W * (camera.top - camera.bottom) / (camera.right - camera.left));
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.getContext('2d').drawImage(renderer.domElement, 0, 0);
  renderer.dispose();
  renderer.forceContextLoss();

  // map the rendered pixels back onto the game's projected footprint
  const fw = rot ? FH : FW, fh = rot ? FW : FH;
  const corners = [[0, 0], [fw, 0], [0, fh], [fw, fh]].map(([x, y]) => {
    const p = new THREE.Vector3(x, 0, y).project(camera);
    return { px: (p.x * .5 + .5) * W, py: (-p.y * .5 + .5) * H, gx: projX(x, y), gy: projY(x, y) };
  });
  const [a, b, c, d] = corners;
  const scaleX = (a.gx - c.gx) / (a.px - c.px);      // (fw,0) vs (0,fh)
  const scaleY = (d.gy - b.gy) / (d.py - b.py);      // (fw,fh) vs (0,0)
  const layout = {
    posX: a.gx - a.px * scaleX,
    posY: b.gy - b.py * scaleY,
    w: W * scaleX,
    h: H * scaleY
  };
  return { canvas: cv, layout };
}

async function main() {
  const art = window.__farmArt;
  if (!art || !window.PIXI) return;
  const gltf = await new GLTFLoader().loadAsync('assets/farm.glb');
  const keep = groupMeshes(gltf.scene);
  if (!keep.length) return;
  const bed = bakeBed(gltf.scene, keep);
  const textures = [], layouts = [];
  for (const rot of [0, 1]) {
    const assembly = buildAssembly(bed, rot, art.FW, art.FH);
    const view = renderView(assembly, rot, art.FW, art.FH);
    textures.push(window.PIXI.Texture.from(view.canvas));
    layouts.push(view.layout);
  }
  window.FARM_MODEL = { ready: true, textures, layouts };
  art.rebuildAll();
}

main().catch(err => console.warn('Farm model could not be loaded; using the drawn farm art.', err));
