'use client';

import {useEffect, useRef} from 'react';
import * as THREE from 'three';

/** Architectural linework rendered in real 3D: no downloaded 3D model or image. */
export function BuildingScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
    } catch {
      mount.dataset.fallback = 'true';
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(10.2, 7.4, 12.7);
    camera.lookAt(0, 2.35, 0);

    const building = new THREE.Group();
    scene.add(building);
    const gold = new THREE.LineBasicMaterial({color: 0xd7b67d, transparent: true, opacity: 0.94});
    const soft = new THREE.LineBasicMaterial({color: 0xab9571, transparent: true, opacity: 0.45});
    const bright = new THREE.LineBasicMaterial({color: 0xf5dbad, transparent: true, opacity: 0.85});

    const stroke = (coords: number[], mat: THREE.LineBasicMaterial, parent = building) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      parent.add(new THREE.LineSegments(geometry, mat));
    };

    // Each volume has physical x/y/z dimensions, rather than a flat wireframe image.
    const volume = (x: number, y: number, z: number, w: number, h: number, d: number, mat = gold) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(g);
      const mesh = new THREE.LineSegments(edges, mat);
      mesh.position.set(x, y, z);
      building.add(mesh);
      g.dispose();
      // Building facades: recessed modular glass rhythm.
      const front = z + d / 2 + 0.008;
      const levels = Math.max(1, Math.floor(h / 0.86));
      const bays = Math.max(1, Math.floor(w / 0.65));
      for (let row = 0; row < levels; row++) {
        const fy = y - h / 2 + 0.28 + row * ((h - 0.48) / levels);
        for (let col = 0; col < bays; col++) {
          const bx = x - w / 2 + 0.18 + col * ((w - 0.36) / bays);
          const bw = (w - 0.36) / bays - 0.11;
          const bh = Math.min(0.53, (h - 0.48) / levels - 0.12);
          stroke([
            bx, fy, front, bx + bw, fy, front,
            bx + bw, fy, front, bx + bw, fy + bh, front,
            bx + bw, fy + bh, front, bx, fy + bh, front,
            bx, fy + bh, front, bx, fy, front,
            bx + bw / 2, fy, front, bx + bw / 2, fy + bh, front
          ], row % 2 ? soft : gold);
        }
      }
      // Side elevation: vertical slats and periodic horizontal storey breaks.
      const right = x + w / 2 + 0.01;
      for (let j = 1; j <= 3; j++) {
        const dz = z - d / 2 + (j * d) / 4;
        stroke([right, y - h / 2 + 0.22, dz, right, y + h / 2 - 0.22, dz], soft);
      }
      for (let j = 1; j < levels; j++) {
        const yy = y - h / 2 + (j * h) / levels;
        stroke([right, yy, z - d / 2, right, yy, z + d / 2], soft);
      }
    };

    // Architectural masses inspired by precise layered Nusuk-style geometry.
    volume(-1.10, 2.20, -0.55, 2.35, 4.40, 2.20);
    volume(1.02, 1.48, 0.22, 2.55, 2.96, 2.55);
    volume(-0.04, 0.38, 1.65, 3.40, 0.76, 0.95, bright); // floating ground podium
    volume(-1.18, 4.66, -0.55, 2.64, 0.18, 2.50, bright); // upper cornice
    volume(1.02, 3.08, 0.22, 2.86, 0.16, 2.86, bright);
    volume(-0.10, 0.14, 0.20, 5.55, 0.27, 4.80, soft); // plinth

    // Contemporary roof pergola: thin, open, perfectly linear meshes.
    for (let i = 0; i < 9; i++) {
      const x = -2.24 + i * 0.28;
      stroke([x, 5.03, -1.84, x, 5.03, 0.72], soft);
    }
    for (let i = 0; i < 8; i++) {
      const z = -1.83 + i * 0.36;
      stroke([-2.23, 5.03, z, -0.02, 5.03, z], soft);
    }
    // Atrium entrance: the arched linework nods to the agency's emblem.
    const ar: number[] = [];
    const cx = -0.09, cy = 0.76, radius = 0.53, frontZ = 2.17;
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * (i / 18), b = Math.PI * ((i + 1) / 18);
      ar.push(cx + radius * Math.cos(a), cy + radius * Math.sin(a), frontZ,
        cx + radius * Math.cos(b), cy + radius * Math.sin(b), frontZ);
    }
    stroke([...ar, cx - radius, 0.37, frontZ, cx - radius, cy, frontZ,
      cx + radius, 0.37, frontZ, cx + radius, cy, frontZ], bright);

    // Ground axes/technical drafting guides.
    for (let i = -4; i <= 4; i++) {
      const pos = i * 0.83;
      stroke([pos, -0.085, -3.10, pos, -0.085, 3.10], soft);
      stroke([-3.40, -0.085, pos * 0.8, 3.40, -0.085, pos * 0.8], soft);
    }
    const line = new THREE.RingGeometry(3.85, 3.88, 128);
    const ringWire = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
      Array.from({length: 128}, (_, i) => {
        const theta = i * 2 * Math.PI / 128;
        return new THREE.Vector3(Math.cos(theta) * 3.85, -0.07, Math.sin(theta) * 3.85);
      })
    ), soft);
    building.add(ringWire);
    line.dispose();

    const resize = () => {
      const width = Math.max(1, mount.clientWidth), height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.fov = width < 430 ? 40 : width < 650 ? 36 : 31;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frame = 0;
    let visible = true;
    let mouse = 0;
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse = ((event.clientX - rect.left) / Math.max(1, rect.width) - .5) * .17;
    };
    const onVisibility = () => {if (!document.hidden && visible && !prefersReduced && !frame) animate();};
    const animate = () => {
      frame = 0;
      if (document.hidden || !visible) return;
      const t = performance.now() * 0.00019;
      building.rotation.y += ((-0.21 + Math.sin(t) * .075 + mouse) - building.rotation.y) * 0.018;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    building.rotation.y = -0.21;
    renderer.render(scene, camera);
    if (!prefersReduced) animate();
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !prefersReduced && !frame) animate();
      if (!visible && frame) {cancelAnimationFrame(frame); frame = 0;}
    });
    intersectionObserver.observe(mount);
    mount.addEventListener('pointermove', onPointerMove);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        if (object instanceof THREE.Line) object.geometry.dispose();
        if (object instanceof THREE.LineSegments) object.geometry.dispose();
      });
      [gold, soft, bright].forEach((mat) => mat.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="building-scene" aria-hidden="true">
    <div className="scene-fallback">
      <svg viewBox="0 0 620 570" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M95 465 95 190 265 112 265 465 M265 112 405 182 405 465 M95 190 265 256 405 182 M265 256 265 465 M405 465 540 414 540 235 405 182"/>
        <path d="M120 205 120 442 240 442 240 252 M150 221 150 438 M185 235 185 440 M218 247 218 440 M290 266 290 445 M330 248 330 452 M370 225 370 452 M430 224 430 455 M475 246 475 438 M510 244 510 424 M96 302 404 302 M97 360 405 360 M408 310 540 279 M408 366 540 336 M95 465 265 526 540 414"/>
      </svg>
    </div>
  </div>;
}
