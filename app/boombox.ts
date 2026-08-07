import * as THREE from "three";

/* =========================================================================
   Procedural boombox

   Modelled after a Megatek-style portable CD deck: glossy black shell, wide
   oval body, arched carry handle, top-loading CD lid, two silver-ringed
   drivers, a blue LCD console and a telescoping antenna.

   Built from primitives (lathe / torus / extruded rounded shapes) so the deck
   ships without a model file. Every geometry and material is registered with
   a Disposables instance — per the Next 16 WebGL guide, renderer disposal does
   not cascade to scene contents.
   ========================================================================= */

/** Collects disposables so the caller can tear the whole rig down at once. */
export class Disposables {
  private items: { dispose: () => void }[] = [];

  track<T extends { dispose: () => void }>(item: T): T {
    this.items.push(item);
    return item;
  }

  disposeAll() {
    for (const item of this.items) item.dispose();
    this.items = [];
  }
}

/** Names of the interactive controls modelled on the fascia. */
export type ControlId = "power" | "prev" | "play" | "next" | "eject";

/* ---------- materials ---------------------------------------------------- */

export type BoomboxMaterials = ReturnType<typeof createMaterials>;

function createMaterials(d: Disposables) {
  // Piano-black plastic: dark diffuse, tight clearcoat for the wet look.
  const shell = d.track(
    new THREE.MeshPhysicalMaterial({
      color: 0x0b0c0f,
      roughness: 0.22,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.55,
    }),
  );

  // Softer black for recessed panels, so edges read against the shell.
  const shellMatte = d.track(
    new THREE.MeshPhysicalMaterial({
      color: 0x14161c,
      roughness: 0.6,
      metalness: 0.0,
      clearcoat: 0.25,
    }),
  );

  const chrome = d.track(
    new THREE.MeshStandardMaterial({
      color: 0xc2c6cd,
      roughness: 0.25,
      metalness: 0.95,
    }),
  );

  const chromeDark = d.track(
    new THREE.MeshStandardMaterial({
      color: 0x70757e,
      roughness: 0.4,
      metalness: 0.9,
    }),
  );

  // Speaker cone paper — mid grey, almost no specular.
  const cone = d.track(
    new THREE.MeshStandardMaterial({
      color: 0x8f959d,
      roughness: 0.88,
      metalness: 0.08,
    }),
  );

  const coneCenter = d.track(
    new THREE.MeshStandardMaterial({
      color: 0xc8ccd2,
      roughness: 0.45,
      metalness: 0.4,
    }),
  );

  // Glossy CD lid — near-black with a strong mirror term.
  const lid = d.track(
    new THREE.MeshPhysicalMaterial({
      color: 0x070809,
      roughness: 0.06,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
    }),
  );

  // LCD face: emissive so it glows without depending on scene lights.
  const lcd = d.track(
    new THREE.MeshStandardMaterial({
      color: 0x0a2a5e,
      emissive: new THREE.Color(0x3aa0ff),
      emissiveIntensity: 0.9,
      roughness: 0.35,
      metalness: 0.0,
    }),
  );

  const antenna = d.track(
    new THREE.MeshStandardMaterial({
      color: 0xd4d8de,
      roughness: 0.18,
      metalness: 1.0,
    }),
  );

  const rubber = d.track(
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      roughness: 0.95,
      metalness: 0.0,
    }),
  );

  return {
    shell,
    shellMatte,
    chrome,
    chromeDark,
    cone,
    coneCenter,
    lid,
    lcd,
    antenna,
    rubber,
  };
}

/* ---------- geometry helpers -------------------------------------------- */

/**
 * A box with rounded corners and bevelled faces. A plain BoxGeometry reads far
 * too sharp next to the moulded plastic in the reference.
 */
function roundedBox(
  d: Disposables,
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel = 0.014,
) {
  const r = Math.min(radius, width / 2 - 0.001, height / 2 - 0.001);
  const w = width / 2 - r;
  const h = height / 2 - r;

  const shape = new THREE.Shape();
  shape.moveTo(-w, -h - r);
  shape.lineTo(w, -h - r);
  shape.quadraticCurveTo(w + r, -h - r, w + r, -h);
  shape.lineTo(w + r, h);
  shape.quadraticCurveTo(w + r, h + r, w, h + r);
  shape.lineTo(-w, h + r);
  shape.quadraticCurveTo(-w - r, h + r, -w - r, h);
  shape.lineTo(-w - r, -h);
  shape.quadraticCurveTo(-w - r, -h - r, -w, -h - r);

  const b = Math.min(bevel, depth / 2 - 0.001);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - b * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  return d.track(geo);
}

/**
 * The body silhouette. In the reference the shell swells outward at the
 * speakers and tucks in toward the base; a lathe profile gives that curve in
 * one mesh, then a non-uniform scale stretches it into the wide oval.
 */
function bodyShell(d: Disposables, mat: THREE.Material) {
  const points: THREE.Vector2[] = [];
  const SEGMENTS = 32;
  // Profile runs bottom (y=-1) to the top deck (y=TOP). It stops short of a
  // full dome: the reference has a flat upper deck carrying the CD lid, so the
  // crown is truncated and the lid sits on it rather than inside it.
  const TOP = 0.55;
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const y = -1 + t * (1 + TOP);
    const bulge = Math.sqrt(Math.max(0, 1 - y * y));
    // Flatten toward the base so it sits on a surface.
    const flatten = THREE.MathUtils.smoothstep(y, -1.0, -0.78);
    points.push(
      new THREE.Vector2(Math.max(bulge * (0.34 + 0.66 * flatten), 0.001), y),
    );
  }
  // Close the truncated crown with a flat deck.
  points.push(new THREE.Vector2(0.001, TOP));

  const geo = d.track(new THREE.LatheGeometry(points, 72));
  const mesh = new THREE.Mesh(geo, mat);
  // Stretch into the wide, shallow oval of the reference photo. The Y scale is
  // deliberately low — the reference body is much wider than it is tall, and a
  // taller value domes it into a mound.
  mesh.scale.set(1.72, 0.72, 0.62);
  return mesh;
}

/** World-space Y of the flat top deck, after bodyShell's scale. */
export const DECK_Y = 0.55 * 0.72;

/** A knurled control knob: cylinder plus an instanced ring of fine ridges. */
function knob(d: Disposables, mats: BoomboxMaterials, radius: number) {
  const group = new THREE.Group();

  const bodyGeo = d.track(
    new THREE.CylinderGeometry(radius, radius * 0.93, radius * 0.66, 40),
  );
  group.add(new THREE.Mesh(bodyGeo, mats.chrome));

  // Knurling — instanced so 36 ridges cost one draw call.
  const ridgeGeo = d.track(
    new THREE.BoxGeometry(radius * 0.075, radius * 0.64, radius * 0.1),
  );
  const RIDGES = 36;
  const ridges = new THREE.InstancedMesh(ridgeGeo, mats.chromeDark, RIDGES);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < RIDGES; i++) {
    const a = (i / RIDGES) * Math.PI * 2;
    pos.set(Math.cos(a) * radius * 0.98, 0, Math.sin(a) * radius * 0.98);
    e.set(0, -a, 0);
    q.setFromEuler(e);
    m.compose(pos, q, scl);
    ridges.setMatrixAt(i, m);
  }
  ridges.instanceMatrix.needsUpdate = true;
  group.add(ridges);

  // Darker cap disc so the knob top isn't a flat mirror.
  const capGeo = d.track(new THREE.CircleGeometry(radius * 0.74, 32));
  const cap = new THREE.Mesh(capGeo, mats.chromeDark);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = radius * 0.335;
  group.add(cap);

  return group;
}

/**
 * One speaker: outer silver ring, bezel, rubber surround, cone, dust cap.
 *
 * Returns the group plus the two parts that move. Only the cone and dust cap
 * travel — the ring, bezel and surround are bolted to the cabinet on a real
 * driver, and pumping the whole assembly reads as the speaker falling out.
 */
function speaker(d: Disposables, mats: BoomboxMaterials, radius: number) {
  const group = new THREE.Group();

  const ringGeo = d.track(new THREE.TorusGeometry(radius, radius * 0.1, 16, 64));
  group.add(new THREE.Mesh(ringGeo, mats.chrome));

  // Flat silver bezel between ring and surround.
  const bezelGeo = d.track(
    new THREE.RingGeometry(radius * 0.72, radius * 0.99, 64),
  );
  const bezel = new THREE.Mesh(bezelGeo, mats.chrome);
  bezel.position.z = -radius * 0.02;
  group.add(bezel);

  // Black rubber surround.
  const surroundGeo = d.track(
    new THREE.TorusGeometry(radius * 0.68, radius * 0.09, 12, 48),
  );
  const surround = new THREE.Mesh(surroundGeo, mats.rubber);
  surround.position.z = -radius * 0.04;
  group.add(surround);

  // Cone — a shallow open dish facing the viewer.
  const coneGeo = d.track(
    new THREE.ConeGeometry(radius * 0.64, radius * 0.4, 48, 1, true),
  );
  const coneMesh = new THREE.Mesh(coneGeo, mats.cone);
  coneMesh.rotation.x = -Math.PI / 2;
  coneMesh.position.z = -radius * 0.22;
  group.add(coneMesh);

  // Dust cap.
  const capGeo = d.track(new THREE.SphereGeometry(radius * 0.25, 32, 16));
  const cap = new THREE.Mesh(capGeo, mats.coneCenter);
  cap.position.z = -radius * 0.04;
  cap.scale.z = 0.5;
  group.add(cap);

  // Rest positions cached so the animation loop can offset from them without
  // needing to know how the speaker was assembled.
  coneMesh.userData.restZ = coneMesh.position.z;
  cap.userData.restZ = cap.position.z;

  return { group, cone: coneMesh, cap };
}

/* ---------- the assembled deck ------------------------------------------ */

/** The parts of one driver that travel when it is pushed. */
export type WooferParts = {
  cone: THREE.Mesh;
  cap: THREE.Mesh;
};

export type BoomboxRig = {
  root: THREE.Group;
  /** Both drivers' moving parts, for bass-driven excursion. */
  woofers: WooferParts[];
  /** Hinged CD lid — rotates open on eject. */
  lid: THREE.Group;
  /** Mount point for the spinning disc, inside the lid well. */
  discMount: THREE.Group;
  /** LCD panel material, so the caller can pulse it. */
  lcdMaterial: THREE.MeshStandardMaterial;
  /** Play indicator that lights while a track runs. */
  ledMaterial: THREE.MeshStandardMaterial;
  /** Button caps keyed by control, for hover/press feedback. */
  controls: Record<ControlId, THREE.Mesh>;
};

export function buildBoombox(d: Disposables): BoomboxRig {
  const mats = createMaterials(d);
  const root = new THREE.Group();

  /* --- body ------------------------------------------------------------- */
  const bodyMesh = bodyShell(d, mats.shell);
  bodyMesh.name = "body";
  root.add(bodyMesh);

  // Front fascia: a slightly proud rounded panel carrying the controls, so the
  // face reads flat against the curved shell like the moulded front.
  const fascia = new THREE.Mesh(
    roundedBox(d, 2.5, 1.3, 0.12, 0.32),
    mats.shell,
  );
  fascia.name = "fascia";
  fascia.position.set(0, -0.12, 0.58);
  root.add(fascia);

  /* --- speakers --------------------------------------------------------- */
  // The moving parts are collected so the render loop can drive them from the
  // bass level — see BoomboxRig.woofers.
  const woofers: WooferParts[] = [];
  for (const side of [-1, 1]) {
    const sp = speaker(d, mats, 0.54);
    sp.group.position.set(side * 0.82, -0.12, 0.66);
    root.add(sp.group);
    woofers.push({ cone: sp.cone, cap: sp.cap });
  }

  /* --- centre console --------------------------------------------------- */
  const consolePanel = new THREE.Mesh(
    roundedBox(d, 0.96, 0.9, 0.1, 0.08),
    mats.shellMatte,
  );
  consolePanel.position.set(0, -0.06, 0.68);
  root.add(consolePanel);

  // LCD window — recessed dark frame with an emissive face.
  const lcdFrame = new THREE.Mesh(
    roundedBox(d, 0.48, 0.32, 0.06, 0.03),
    mats.shellMatte,
  );
  lcdFrame.position.set(0, 0.08, 0.73);
  root.add(lcdFrame);

  const lcdGeo = d.track(new THREE.PlaneGeometry(0.42, 0.26));
  const lcdPanel = new THREE.Mesh(lcdGeo, mats.lcd);
  lcdPanel.position.set(0, 0.08, 0.766);
  root.add(lcdPanel);

  /* --- transport buttons ------------------------------------------------ */
  // Layout mirrors the reference: power + prev on the left of the display,
  // play/scan + next on the right, eject below.
  const BUTTONS: { id: ControlId; x: number; y: number; w: number }[] = [
    { id: "power", x: -0.33, y: 0.19, w: 0.28 },
    { id: "prev", x: -0.33, y: 0.02, w: 0.28 },
    { id: "play", x: 0.33, y: 0.19, w: 0.28 },
    { id: "next", x: 0.33, y: 0.02, w: 0.28 },
    { id: "eject", x: 0.0, y: -0.16, w: 0.3 },
  ];

  const controls = {} as Record<ControlId, THREE.Mesh>;
  for (const b of BUTTONS) {
    const mesh = new THREE.Mesh(
      roundedBox(d, b.w, 0.12, 0.06, 0.05, 0.012),
      mats.chrome,
    );
    mesh.position.set(b.x, b.y, 0.75);
    // Cached so the animation loop can offset it on press without a lookup.
    mesh.userData.restZ = 0.75;
    root.add(mesh);
    controls[b.id] = mesh;
  }

  // Play indicator LED, just under the display.
  const ledGeo = d.track(new THREE.CircleGeometry(0.024, 16));
  const ledMaterial = d.track(
    new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      emissive: new THREE.Color(0x3bff70),
      emissiveIntensity: 0,
      roughness: 0.3,
    }),
  );
  const led = new THREE.Mesh(ledGeo, ledMaterial);
  led.position.set(-0.16, -0.15, 0.76);
  root.add(led);

  /* --- port strip (PHONES / USB / AUX) ---------------------------------- */
  const portPlate = new THREE.Mesh(
    roundedBox(d, 0.78, 0.18, 0.06, 0.05),
    mats.chrome,
  );
  portPlate.position.set(0, -0.5, 0.6);
  root.add(portPlate);

  for (const x of [-0.24, 0.24]) {
    const jackGeo = d.track(new THREE.CylinderGeometry(0.033, 0.033, 0.05, 20));
    const jack = new THREE.Mesh(jackGeo, mats.rubber);
    jack.rotation.x = Math.PI / 2;
    jack.position.set(x, -0.5, 0.63);
    root.add(jack);
  }
  const usb = new THREE.Mesh(
    roundedBox(d, 0.14, 0.06, 0.04, 0.012, 0.008),
    mats.shellMatte,
  );
  usb.position.set(0, -0.5, 0.63);
  root.add(usb);

  /* --- knobs ------------------------------------------------------------ */
  // Left knob is VOLUME, right is TUNING, per the reference fascia. They sit on
  // the sloping shoulders of the shell, outboard of the CD lid.
  for (const side of [-1, 1]) {
    const k = knob(d, mats, 0.18);
    // Seated on the top deck, outboard of the lid, so they read from above.
    k.position.set(side * 1.16, DECK_Y - 0.02, 0.2);
    // Tip forward, following the shell's curve.
    k.rotation.x = 0.3;
    root.add(k);
  }

  /* --- CD lid ----------------------------------------------------------- */
  // Hinged at the rear so it lifts like the real top-loader. The group's
  // origin IS the hinge; the lid mesh is offset forward from it.
  // Sits on the flattened top deck, hinged at its rear edge.
  const lid = new THREE.Group();
  lid.name = "lidGroup";
  lid.position.set(0, DECK_Y + 0.01, -0.44);

  // A CylinderGeometry's axis is already +Y, so an unrotated cylinder is a flat
  // disc lying on the deck — which is what the lid is. Do NOT rotate it.
  const lidGeo = d.track(new THREE.CylinderGeometry(0.72, 0.76, 0.06, 64));
  const lidMesh = new THREE.Mesh(lidGeo, mats.lid);
  lidMesh.name = "cdLid";
  lidMesh.position.z = 0.46;
  // Squash front-to-back into the shell's shallower depth.
  lidMesh.scale.z = 0.88;
  lid.add(lidMesh);

  // Chrome trim ring around the lid window. A torus sweeps in XY, so this one
  // does need tipping flat.
  const lidRingGeo = d.track(new THREE.TorusGeometry(0.735, 0.02, 12, 64));
  const lidRing = new THREE.Mesh(lidRingGeo, mats.chromeDark);
  lidRing.rotation.x = -Math.PI / 2;
  lidRing.position.set(0, 0.035, 0.46);
  lidRing.scale.y = 0.88;
  lid.add(lidRing);

  root.add(lid);

  // Disc sits in the well beneath the lid, laid flat.
  const discMount = new THREE.Group();
  discMount.position.set(0, DECK_Y - 0.005, 0.02);
  discMount.rotation.x = -Math.PI / 2;
  root.add(discMount);

  const spindleGeo = d.track(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 20));
  const spindle = new THREE.Mesh(spindleGeo, mats.shellMatte);
  spindle.name = "spindle";
  spindle.position.set(0, DECK_Y, 0.02);
  root.add(spindle);

  /* --- carry handle ----------------------------------------------------- */
  // A half-torus arch standing upright over the deck. TorusGeometry sweeps its
  // arc in the XY plane starting at +X, so a 0..PI arc is already the upper
  // half — no rotation, or it lies flat and reads as an ellipse behind the body.
  const HANDLE_R = 0.92;
  const HANDLE_Y = DECK_Y - 0.02;
  const handleGeo = d.track(
    new THREE.TorusGeometry(HANDLE_R, 0.052, 14, 48, Math.PI),
  );
  const handle = new THREE.Mesh(handleGeo, mats.shell);
  handle.name = "handle";
  handle.position.set(0, HANDLE_Y, -0.18);
  // Squash vertically into the wide, shallow arch of the reference.
  handle.scale.set(1.0, 0.66, 1.0);
  root.add(handle);

  // End-caps where the arch meets the shell.
  for (const side of [-1, 1]) {
    const capGeo = d.track(new THREE.SphereGeometry(0.055, 14, 10));
    const cap = new THREE.Mesh(capGeo, mats.shell);
    cap.position.set(side * HANDLE_R, HANDLE_Y, -0.18);
    root.add(cap);
  }

  /* --- antenna ---------------------------------------------------------- */
  // Three telescoping segments, thinning toward the tip.
  const antennaGroup = new THREE.Group();
  antennaGroup.position.set(0.52, DECK_Y - 0.06, -0.4);
  antennaGroup.rotation.z = -0.26;
  antennaGroup.rotation.x = -0.08;

  const segments: [number, number, number][] = [
    [0.028, 0.86, 0.43],
    [0.019, 0.82, 1.2],
    [0.012, 0.78, 1.92],
  ];
  for (const [r, len, y] of segments) {
    const segGeo = d.track(new THREE.CylinderGeometry(r, r, len, 12));
    const seg = new THREE.Mesh(segGeo, mats.antenna);
    seg.position.y = y;
    antennaGroup.add(seg);
  }
  const tipGeo = d.track(new THREE.SphereGeometry(0.022, 12, 8));
  const tip = new THREE.Mesh(tipGeo, mats.antenna);
  tip.position.y = 2.3;
  antennaGroup.add(tip);

  root.add(antennaGroup);

  /* --- feet ------------------------------------------------------------- */
  for (const side of [-1, 1]) {
    const footGeo = d.track(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 20));
    const foot = new THREE.Mesh(footGeo, mats.rubber);
    foot.position.set(side * 0.9, -0.68, 0.18);
    root.add(foot);
  }

  return {
    root,
    woofers,
    lid,
    discMount,
    lcdMaterial: mats.lcd,
    ledMaterial,
    controls,
  };
}
