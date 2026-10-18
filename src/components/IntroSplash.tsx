'use client';

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {useLocale} from 'next-intl';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Intro de première visite : le logo Durrat est reconstruit en vraie 3D (formes extrudées,
 * biseautées, métal doré réfléchissant) puis s'assemble pièce par pièce.
 * - Affiché une seule fois (localStorage). Rejouer : ajouter ?intro=1 à l'URL.
 * - prefers-reduced-motion ou WebGL indisponible : version statique courte avec brand-gold.png.
 */

const STORAGE_KEY = 'durrat-intro-v1';
const T_EXIT = 4.9; // secondes avant l'ouverture du rideau
const T_LEAVE = 1.35; // durée de la sortie

const SKIP_LABEL: Record<string, string> = {
  ar: 'تخطي', fr: 'Passer', en: 'Skip', ru: 'Пропустить', ur: 'چھوڑیں', id: 'Lewati'
};

/* ------------------------------------------------------------------ */
/* Géométrie du logo, relevée sur l'image (pixels, origine en haut à gauche) */
/* ------------------------------------------------------------------ */
type Op = ['M', number, number] | ['L', number, number] | ['Q', number, number, number, number];
const U = 100, CX = 660, CY = 600;
const px = (x: number) => (x - CX) / U;
const py = (y: number) => -(y - CY) / U;
const LOGO_W = 11.0, LOGO_H = 10.7;

function trace<T extends THREE.Path>(path: T, ops: Op[]): T {
  for (const op of ops) {
    if (op[0] === 'M') path.moveTo(px(op[1]), py(op[2]));
    else if (op[0] === 'L') path.lineTo(px(op[1]), py(op[2]));
    else path.quadraticCurveTo(px(op[1]), py(op[2]), px(op[3]), py(op[4]));
  }
  path.closePath();
  return path;
}

const ARCH: Op[] = [
  ['M', 422, 300], ['Q', 440, 205, 520, 155], ['L', 660, 68], ['L', 800, 155], ['Q', 880, 205, 898, 300],
  ['L', 822, 300], ['Q', 815, 235, 770, 200], ['L', 660, 145], ['L', 550, 200], ['Q', 505, 235, 495, 300]
];
const LEFT_OUTER: Op[] = [
  ['M', 112, 972], ['Q', 112, 1032, 172, 1032], ['L', 592, 1032], ['Q', 652, 1032, 652, 972], ['L', 652, 525],
  ['Q', 652, 450, 566, 388], ['L', 382, 291], ['L', 198, 388], ['Q', 112, 450, 112, 525]
];
const LEFT_HOLE: Op[] = [
  ['M', 185, 958], ['L', 580, 958], ['L', 580, 560], ['Q', 580, 485, 545, 462], ['L', 382, 370],
  ['L', 219, 462], ['Q', 185, 485, 185, 560]
];
const RIGHT: Op[] = [
  ['M', 665, 640], ['L', 665, 520], ['Q', 665, 440, 775, 382], ['L', 937, 290], ['L', 1100, 382],
  ['Q', 1210, 440, 1210, 520], ['L', 1210, 1000], ['Q', 1210, 1030, 1180, 1030], ['L', 930, 1030],
  ['L', 930, 1000], ['Q', 940, 958, 1000, 958], ['L', 1135, 958], ['L', 1135, 565], ['Q', 1135, 490, 1070, 445],
  ['L', 937, 368], ['L', 805, 445], ['Q', 735, 490, 735, 570], ['L', 735, 600], ['Q', 735, 640, 700, 640]
];
const ELBOW: Op[] = [
  ['M', 910, 535], ['L', 910, 1128], ['Q', 910, 1140, 898, 1140], ['L', 372, 1140], ['Q', 400, 1072, 460, 1070],
  ['L', 828, 1070], ['L', 828, 615], ['Q', 828, 545, 910, 535]
];
const DIAMOND_TOP: Op[] = [['M', 380, 557], ['L', 460, 632], ['L', 380, 707], ['L', 300, 632]];
const DIAMOND_BOTTOM: Op[] = [['M', 380, 712], ['L', 460, 787], ['L', 380, 865], ['L', 300, 787]];

type PieceDef = {
  outer: Op[]; hole?: Op[];
  from: [number, number, number]; spin: [number, number, number];
  delay: number; dur: number;
};
const PIECES: PieceDef[] = [
  {outer: ARCH, from: [0, 9, -10], spin: [-2.6, 1.2, 0.9], delay: 0.30, dur: 2.0},
  {outer: LEFT_OUTER, hole: LEFT_HOLE, from: [-12, -2, 6], spin: [0.8, -3.4, 0.5], delay: 0.46, dur: 2.0},
  {outer: RIGHT, from: [12, 1, -4], spin: [-0.6, 3.6, -0.7], delay: 0.64, dur: 2.0},
  {outer: ELBOW, from: [2, -11, 8], spin: [2.2, 0.8, 1.4], delay: 0.88, dur: 1.9},
  {outer: DIAMOND_TOP, from: [-5, 6, 12], spin: [0.5, 0.5, 9.4], delay: 1.18, dur: 1.7},
  {outer: DIAMOND_BOTTOM, from: [5, -6, 12], spin: [-0.5, 0.5, -9.4], delay: 1.30, dur: 1.7}
];

const EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 0.42, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 5, curveSegments: 28
};

/* Dégradé doré en bandes diagonales, comme sur le logo d'origine (couleurs par sommet). */
const GOLD_DARK = new THREE.Color(0xb36d08);
const GOLD_MID = new THREE.Color(0xe3a617);
const GOLD_LIGHT = new THREE.Color(0xfff07a);
function goldAt(x: number, y: number, out: THREE.Color) {
  const u = x * 0.82 + y * 0.57;
  const s = 0.5 + 0.5 * Math.sin(u * 1.05 + 0.4);
  const s2 = 0.5 + 0.5 * Math.sin(u * 2.7 + 1.9);
  const k = THREE.MathUtils.clamp(s * 0.75 + s2 * 0.25, 0, 1);
  if (k < 0.5) out.lerpColors(GOLD_DARK, GOLD_MID, k * 2);
  else out.lerpColors(GOLD_MID, GOLD_LIGHT, (k - 0.5) * 2);
  return out;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInCubic = (k: number) => k * k * k;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutExpo = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));

function sparkleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,236,170,.65)');
  grad.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function IntroSplash() {
  const locale = useLocale();
  const [active, setActive] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    const html = document.documentElement;
    // Filet de sécurité si le script du <head> (layout.tsx) n'a pas posé l'attribut.
    if (!html.dataset.intro) {
      try {html.dataset.intro = localStorage.getItem(STORAGE_KEY) ? 'seen' : 'playing';}
      catch {html.dataset.intro = 'seen';}
    }
    if (html.dataset.intro !== 'playing') {setActive(false); return;}

    const root = rootRef.current, mount = mountRef.current, bar = barRef.current;
    if (!root || !mount || !bar) return;

    let finished = false, leaving = false, raf = 0, t = 0, leaveAt = Infinity;
    let exitT = T_EXIT;
    const timers: number[] = [];
    const disposers: Array<() => void> = [];

    const finish = () => {
      if (finished) return;
      finished = true;
      try {localStorage.setItem(STORAGE_KEY, String(Date.now()));} catch {/* stockage bloqué */}
      html.dataset.intro = 'done';
      setActive(false);
    };
    const leave = () => {
      if (leaving) return;
      leaving = true;
      root.dataset.phase = 'leaving';
      html.dataset.intro = 'revealing'; // relance les animations du hero pendant l'ouverture
    };
    const cleanup = () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      disposers.forEach((fn) => fn());
    };

    const onKey = (e: KeyboardEvent) => {if (e.key === 'Escape') skipRef.current();};
    window.addEventListener('keydown', onKey);
    disposers.push(() => window.removeEventListener('keydown', onKey));

    /* ---------- Version statique (mouvement réduit / pas de WebGL) ---------- */
    const runStatic = () => {
      root.classList.add('is-static', 'is-title');
      bar.style.transform = 'scaleX(1)';
      bar.style.transition = 'transform 1.6s linear';
      skipRef.current = () => {
        leave();
        timers.push(window.setTimeout(finish, T_LEAVE * 1000));
      };
      timers.push(window.setTimeout(() => skipRef.current(), 1800));
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer | null = null;
    if (!reduced) {
      try {
        renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'high-performance'});
      } catch {
        renderer = null;
      }
    }
    if (!renderer) {
      runStatic();
      return cleanup;
    }

    /* ---------------------------- Scène 3D ---------------------------- */
    const gl = renderer;
    gl.setClearColor(0x000000, 0);
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.12;
    gl.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(gl.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

    // Réflexions de studio : c'est ce qui donne l'aspect métal poli.
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    const sceneEnv = scene as unknown as {environmentRotation?: THREE.Euler};

    // Reflet balayant le logo
    const glint = new THREE.PointLight(0xfff1c8, 0, 0, 0);
    glint.position.set(-16, 4, 10);
    scene.add(glint);

    const building = new THREE.Group();
    building.position.y = 1.1;
    scene.add(building);

    type Piece = {
      mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; start: THREE.Vector3; target: THREE.Vector3;
      spin: THREE.Vector3; delay: number; dur: number;
    };
    const tmpColor = new THREE.Color();
    const pieces: Piece[] = PIECES.map((def) => {
      const shape = trace(new THREE.Shape(), def.outer);
      if (def.hole) shape.holes.push(trace(new THREE.Path(), def.hole));
      const geo = new THREE.ExtrudeGeometry(shape, EXTRUDE);
      geo.translate(0, 0, -(EXTRUDE.depth ?? 0.4) / 2);
      const pos = geo.getAttribute('position');
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        goldAt(pos.getX(i), pos.getY(i), tmpColor);
        colors[i * 3] = tmpColor.r; colors[i * 3 + 1] = tmpColor.g; colors[i * 3 + 2] = tmpColor.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeBoundingBox();
      const center = new THREE.Vector3();
      geo.boundingBox!.getCenter(center);
      geo.translate(-center.x, -center.y, -center.z); // pivot au centre de la pièce
      const mat = new THREE.MeshPhysicalMaterial({
        vertexColors: true, metalness: 1, roughness: 0.24, clearcoat: 0.5, clearcoatRoughness: 0.18,
        envMapIntensity: 1.55, emissive: new THREE.Color(0xffb830), emissiveIntensity: 0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      building.add(mesh);
      return {
        mesh, mat, target: center,
        start: new THREE.Vector3(center.x + def.from[0], center.y + def.from[1], def.from[2]),
        spin: new THREE.Vector3(...def.spin), delay: def.delay, dur: def.dur
      };
    });

    // Anneaux de dessin technique derrière le logo (clin d'œil à la scène du hero)
    const halo = new THREE.Group();
    halo.position.set(0, 1.1, -2.2);
    scene.add(halo);
    const ringMat = new THREE.MeshBasicMaterial({color: 0xd7b67d, transparent: true, opacity: 0, side: THREE.DoubleSide});
    const ring = new THREE.Mesh(new THREE.RingGeometry(8.5, 8.525, 220), ringMat);
    halo.add(ring);
    const dashPts = Array.from({length: 180}, (_, i) => {
      const a = (i / 180) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 7.2, Math.sin(a) * 7.2, 0);
    });
    const dashMat = new THREE.LineDashedMaterial({color: 0xe6cb94, dashSize: 0.16, gapSize: 0.24, transparent: true, opacity: 0});
    const dashed = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(dashPts), dashMat);
    dashed.computeLineDistances();
    halo.add(dashed);

    // Poussière d'or en spirale
    const N = 520;
    const seeds = new Float32Array(N * 4);
    const pPos = new Float32Array(N * 3);
    const pCol = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      seeds[i * 4] = 5.5 + Math.random() * 9.5; // rayon
      seeds[i * 4 + 1] = Math.random() * Math.PI * 2; // angle
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 7 - 1; // profondeur
      seeds[i * 4 + 3] = (0.12 + Math.random() * 0.34) * (Math.random() < 0.5 ? -1 : 1); // vitesse
      const b = 0.45 + Math.random() * 0.55;
      pCol[i * 3] = b; pCol[i * 3 + 1] = b * 0.82; pCol[i * 3 + 2] = b * 0.45;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const sprite = sparkleTexture();
    const pMat = new THREE.PointsMaterial({
      map: sprite, size: 0.26, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    points.position.y = 1.1;
    scene.add(points);

    /* ----------------------------- Taille ----------------------------- */
    let dist = 30;
    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      gl.setSize(w, h, false);
      camera.aspect = w / h;
      const needH = Math.max(LOGO_H * 1.62, (LOGO_W * 1.3) / camera.aspect);
      dist = needH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const pointer = {x: 0, y: 0, tx: 0, ty: 0};
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointer);

    skipRef.current = () => {exitT = Math.min(exitT, t);};

    /* ------------------------------ Boucle ------------------------------ */
    let last = performance.now();
    let titleShown = false;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      if (!titleShown && t > 2.2) {titleShown = true; root.classList.add('is-title');}
      if (!leaving && t >= exitT) {leave(); leaveAt = t;}
      if (leaving && t - leaveAt > T_LEAVE) {finish(); return;}
      bar.style.transform = `scaleX(${clamp01(t / exitT)})`;

      // Pièces : arrivée en vol, rotation, flash doré à l'atterrissage
      for (const p of pieces) {
        const raw = (t - p.delay) / p.dur;
        const k = clamp01(raw);
        p.mesh.visible = raw > 0;
        const e = easeOutExpo(k);
        p.mesh.position.lerpVectors(p.start, p.target, e);
        p.mesh.rotation.set(p.spin.x * (1 - e), p.spin.y * (1 - e), p.spin.z * (1 - e));
        p.mesh.scale.setScalar(0.2 + 0.8 * easeOutCubic(k));
        const since = t - (p.delay + p.dur * 0.45);
        p.mat.emissiveIntensity = since > 0 ? 0.75 * Math.exp(-since * 3.2) : 0;
      }

      // Logo assemblé : légère rotation pour révéler l'épaisseur + parallaxe souris
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      const settle = easeOutCubic(clamp01((t - 2.0) / 1.2));
      building.rotation.y = settle * Math.sin(t * 0.85) * 0.34 + pointer.x * 0.16;
      building.rotation.x = settle * Math.sin(t * 0.6) * 0.05 + pointer.y * 0.07;

      // Reflet qui balaie le logo + réflexions d'environnement qui tournent
      const sweep = clamp01((t - 2.3) / 1.9);
      glint.position.x = -16 + 32 * easeInOut(sweep);
      glint.intensity = Math.sin(Math.PI * sweep) * 7;
      if (sceneEnv.environmentRotation) sceneEnv.environmentRotation.y = -0.7 + t * 0.4;

      // Anneaux et poussière
      const fadeIn = clamp01(t / 1.3);
      const out = leaving ? 1 - clamp01((t - leaveAt) / 0.7) : 1;
      ringMat.opacity = 0.34 * fadeIn * out;
      dashMat.opacity = 0.5 * fadeIn * out;
      ring.rotation.z = -t * 0.05;
      dashed.rotation.z = t * 0.09;
      pMat.opacity = 0.95 * fadeIn * out;
      const k = easeOutCubic(clamp01(t / 3));
      for (let i = 0; i < N; i++) {
        const r = seeds[i * 4] * (1.5 - 0.5 * k) + Math.max(0, t - 3) * 0.35;
        const th = seeds[i * 4 + 1] + t * seeds[i * 4 + 3] * (1.2 - 0.5 * k);
        pPos[i * 3] = Math.cos(th) * r;
        pPos[i * 3 + 1] = Math.sin(th) * r * 0.62 + Math.sin(t * 0.7 + i) * 0.25;
        pPos[i * 3 + 2] = seeds[i * 4 + 2] + Math.sin(th * 2) * 0.5;
      }
      pGeo.attributes.position.needsUpdate = true;

      // Caméra : travelling avant, puis plongée dans le logo à la sortie
      const ex = leaving ? easeInCubic(clamp01((t - leaveAt) / 1.0)) : 0;
      const dolly = 1.16 - 0.16 * easeOutCubic(clamp01(t / 3.6)) - 0.2 * ex;
      camera.position.set(pointer.x * 0.5, 0.7 - pointer.y * 0.3, dist * dolly);
      camera.lookAt(0, 1.0, 0);
      building.scale.setScalar(1 + 0.12 * ex);

      gl.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    disposers.push(() => {
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      sprite.dispose();
      envRT.dispose();
      pmrem.dispose();
      gl.dispose();
      gl.domElement.remove();
    });

    return cleanup;
  }, []);

  if (!active) return null;

  return (
    <div className="intro" ref={rootRef} role="dialog" aria-modal="true" aria-label="Durrat Al Hijrah">
      <div className="intro-panel top" />
      <div className="intro-panel bottom" />
      <div className="intro-stage">
        <div className="intro-line" />
        <div className="intro-canvas" ref={mountRef} />
        <Image className="intro-static" src="/brand-gold.png" width={420} height={420} alt="" priority />
        <div className="intro-title" aria-hidden="true">
          <div className="intro-name word w1" dir="rtl">درة الهجرة</div>
          <div className="intro-sub word w2" dir="rtl">للعقارات</div>
          <div className="intro-latin word w3">Durrat Al Hijrah</div>
        </div>
        <div className="intro-progress" aria-hidden="true"><i ref={barRef} /></div>
      </div>
      <button type="button" className="intro-skip" autoFocus onClick={() => skipRef.current()}>
        {SKIP_LABEL[locale] ?? SKIP_LABEL.en}
      </button>
    </div>
  );
}
