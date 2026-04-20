import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import * as THREE from 'three';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private readonly PLANET_LABEL_COLOR = '#00ff9d';

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sceneCanvas') private sceneCanvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId!: number;
  private clock = new THREE.Clock();
  private starField!: THREE.Points;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Space scene
  private sceneRenderer!: THREE.WebGLRenderer;
  private spaceScene!: THREE.Scene;
  private spaceCamera!: THREE.PerspectiveCamera;
  private spaceGroup!: THREE.Group;   // parent for planet + rings + hud
  private planet!: THREE.Mesh;
  private planetLabelGroup!: THREE.Group;
  private planetLabels: Array<{
    mesh: THREE.Mesh;
    phase: number;
    baseOpacity: number;
    marker?: THREE.Mesh;
  }> = [];
  private planetAtmo!: THREE.Mesh;
  private rings!: THREE.Mesh;
  private moon!: THREE.Group;
  private moonOrbitAngle = 0;
  private moonSpeedMultiplier = 1;
  private moonBoostEndTime = 0;
  private raycaster = new THREE.Raycaster();
  private hudRing!: THREE.LineLoop;
  private readonly ORBIT_CENTER = new THREE.Vector3(3, 0, 0);

  // Planet drag-spin
  private planetRotationY = 0;
  private planetSpinVelocity = 0;
  private isDraggingPlanet = false;
  private dragLastX = 0;
  private readonly DEFAULT_ROT_SPEED = 0.001; // Reduced default rotation speed

  currentLang = 'en';

  constructor(private ngZone: NgZone, private translate: TranslateService) {
    this.translate.addLangs(['en', 'de']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initScene();
      this.initSpaceScene();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
    this.sceneRenderer?.dispose();
    this.planetLabels.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
    });
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    this.sceneCanvasRef?.nativeElement.removeEventListener('click',     this.onSceneClick);
    this.sceneCanvasRef?.nativeElement.removeEventListener('mousemove', this.onSceneHover);
    this.sceneCanvasRef?.nativeElement.removeEventListener('mousedown', this.onSceneDragStart);
    window.removeEventListener('mousemove', this.onSceneDrag);
    window.removeEventListener('mouseup',   this.onSceneDragEnd);
  }

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private makePlanetTexture(): THREE.CanvasTexture {
    const W = 1024, H = 512;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;

    // Deep dark gas giant base
    ctx.fillStyle = '#061733';
    ctx.fillRect(0, 0, W, H);

    // Main gas bands — mostly dark, softly varying
    const bands = [
      { cy: 0.10, h: 0.08, op: 0.18, color: 'rgba(120,170,220,0.18)' },
      { cy: 0.22, h: 0.06, op: 0.10, color: 'rgba(20,45,95,0.35)' },
      { cy: 0.35, h: 0.10, op: 0.22, color: 'rgba(110,160,210,0.20)' },
      { cy: 0.49, h: 0.07, op: 0.12, color: 'rgba(15,35,80,0.38)' },
      { cy: 0.63, h: 0.11, op: 0.24, color: 'rgba(100,150,205,0.22)' },
      { cy: 0.77, h: 0.07, op: 0.11, color: 'rgba(18,40,88,0.34)' },
      { cy: 0.90, h: 0.08, op: 0.16, color: 'rgba(125,175,225,0.16)' },
    ];
    bands.forEach(b => {
      const y0 = (b.cy - b.h / 2) * H;
      const y1 = (b.cy + b.h / 2) * H;
      const g  = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0,   'rgba(0,0,0,0)');
      g.addColorStop(0.5, b.color);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, W, y1 - y0);
    });

    // Soft flow noise to keep rotation readable without making it busy
    bands.forEach(b => {
      for (let x = 0; x < W; x += 42) {
        const wobble = Math.sin(x / 80) * 9 + Math.cos(x / 44) * 4;
        const cy = b.cy * H + wobble;
        const g2 = ctx.createRadialGradient(x, cy, 0, x, cy, 26);
        g2.addColorStop(0, `rgba(90,140,190,${b.op * 0.22})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(x, cy, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // A few subtle glowing clouds only
    const clouds = [
      { x: 0.22, y: 0.31, rx: 0.09, ry: 0.07, op: 0.18 },
      { x: 0.58, y: 0.56, rx: 0.11, ry: 0.08, op: 0.16 },
      { x: 0.84, y: 0.41, rx: 0.07, ry: 0.06, op: 0.14 },
    ];
    clouds.forEach(p => {
      const sy = p.ry / p.rx;
      const cx = p.x * W;
      const cy = p.y * H / sy;
      const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, p.rx * W);
      g.addColorStop(0,   `rgba(210,240,255,${p.op})`);
      g.addColorStop(0.35, `rgba(110,185,255,${p.op * 0.7})`);
      g.addColorStop(0.65, `rgba(70,130,200,${p.op * 0.35})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.save();
      ctx.scale(1, sy);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, p.rx * W, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // One small soft storm eye for asymmetry
    const storm = { x: 0.73, y: 0.27, r: 0.04 };
    const eye = ctx.createRadialGradient(storm.x * W, storm.y * H, 0, storm.x * W, storm.y * H, storm.r * W);
    eye.addColorStop(0,   'rgba(180,230,255,0.22)');
    eye.addColorStop(0.45,'rgba(80,140,210,0.10)');
    eye.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(storm.x * W, storm.y * H, storm.r * W, 0, Math.PI * 2);
    ctx.fill();

    // Dark lane separators to keep the gas structure visible
    [0.18, 0.30, 0.43, 0.56, 0.70, 0.82].forEach(gy => {
      const g = ctx.createLinearGradient(0, (gy-0.025)*H, 0, (gy+0.025)*H);
      g.addColorStop(0,   'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(2,7,18,0.42)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, (gy-0.025)*H, W, 0.05*H);
    });

    // Subtle polar glow only
    [true, false].forEach(top => {
      const capH = H * 0.10;
      const g = ctx.createLinearGradient(0, top ? 0 : H-capH, 0, top ? capH : H);
      g.addColorStop(0,   'rgba(120,175,220,0.18)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, top ? 0 : H-capH, W, capH);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeStarSprite(): THREE.Texture {
    const size = 32;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const h = size / 2;
    const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(210,235,255,0.9)');
    grad.addColorStop(0.75, 'rgba(120,190,255,0.35)');
    grad.addColorStop(1,    'rgba(120,190,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  private makePlanetLabelTexture(text: string): THREE.CanvasTexture {
    const width = Math.max(280, text.length * 52);
    const height = 96;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    const color = this.PLANET_LABEL_COLOR;

    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 48px 'Orbitron', sans-serif";

    // No shadow/glow effects - clean font rendering
    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeMarkerDotTexture(): THREE.CanvasTexture {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const center = size / 2;

    // Create circular gradient for the dot
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0, 'rgba(0, 255, 157, 1)');
    grad.addColorStop(0.4, 'rgba(0, 255, 157, 0.9)');
    grad.addColorStop(0.7, 'rgba(0, 255, 157, 0.4)');
    grad.addColorStop(1, 'rgba(0, 255, 157, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeCurvedPlanetLabelGeometry(width: number, height: number, radius: number): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(width, height, 24, 6);
    const pos = geo.attributes['position'] as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sqrt(Math.max(radius * radius - x * x - y * y, 0)) - radius;
      pos.setZ(i, z);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  private createPlanetLabels(): void {
    const labels = [
      {
        text: 'Angular',
        normal: new THREE.Vector3(-0.62, 0.46, 0.63),
        width: 1.6,
        height: 0.36,
        phase: 0.2,
        opacity: 0.58,
      },
      {
        text: '.NET',
        normal: new THREE.Vector3(-0.38, 0.05, -0.92),
        width: 1.15,
        height: 0.31,
        phase: 1.9,
        opacity: 0.56,
      },
      {
        text: 'SpringBoot',
        normal: new THREE.Vector3(0.72, 0.58, 0.38),
        width: 2.2,
        height: 0.37,
        phase: 0.6,
        opacity: 0.59,
      },
      {
        text: 'TypeScript',
        normal: new THREE.Vector3(0.38, 0.05, 0.92),
        width: 2.1,
        height: 0.38,
        phase: 1.3,
        opacity: 0.62,
      },
      {
        text: 'JavaScript',
        normal: new THREE.Vector3(-0.85, 0.42, 0.32),
        width: 2.2,
        height: 0.38,
        phase: 2.7,
        opacity: 0.6,
      },
      {
        text: 'HTML',
        normal: new THREE.Vector3(0.18, 0.82, 0.54),
        width: 1.0,
        height: 0.3,
        phase: 0.5,
        opacity: 0.58,
      },
      {
        text: 'CSS',
        normal: new THREE.Vector3(-0.75, 0.35, -0.56),
        width: 0.85,
        height: 0.28,
        phase: 1.6,
        opacity: 0.55,
      },
      {
        text: 'JAVA',
        normal: new THREE.Vector3(0.64, -0.18, -0.75),
        width: 1.1,
        height: 0.31,
        phase: 2.9,
        opacity: 0.52,
      },
      {
        text: 'C#',
        normal: new THREE.Vector3(0.92, -0.02, -0.38),
        width: 0.75,
        height: 0.28,
        phase: 3.7,
        opacity: 0.5,
      },
      {
        text: 'SQL',
        normal: new THREE.Vector3(-0.96, -0.02, 0.28),
        width: 0.85,
        height: 0.28,
        phase: 3.1,
        opacity: 0.5,
      },
      {
        text: 'PHP',
        normal: new THREE.Vector3(-0.54, -0.15, 0.82),
        width: 0.9,
        height: 0.3,
        phase: 2.4,
        opacity: 0.54,
      },
      {
        text: 'GIT',
        normal: new THREE.Vector3(0.12, -0.38, 0.92),
        width: 0.85,
        height: 0.28,
        phase: 4.1,
        opacity: 0.52,
      },
      {
        text: 'JEST',
        normal: new THREE.Vector3(0.45, -0.52, 0.72),
        width: 1.0,
        height: 0.3,
        phase: 3.5,
        opacity: 0.54,
      },
      {
        text: 'Teamwork',
        normal: new THREE.Vector3(-0.28, 0.65, 0.71),
        width: 1.85,
        height: 0.35,
        phase: 1.1,
        opacity: 0.57,
      },
      {
        text: 'Scrum',
        normal: new THREE.Vector3(0.62, 0.46, -0.63),
        width: 1.3,
        height: 0.33,
        phase: 0.8,
        opacity: 0.54,
      },
      {
        text: 'Unity 6',
        normal: new THREE.Vector3(-0.52, -0.48, -0.70),
        width: 1.5,
        height: 0.32,
        phase: 4.8,
        opacity: 0.56,
      },
      {
        text: 'Unreal 5',
        normal: new THREE.Vector3(0.78, -0.42, -0.46),
        width: 1.7,
        height: 0.34,
        phase: 5.2,
        opacity: 0.57,
      },
      {
        text: 'Godot 4',
        normal: new THREE.Vector3(0.88, -0.32, 0.35),
        width: 1.5,
        height: 0.32,
        phase: 4.6,
        opacity: 0.55,
      },
      {
        text: 'WebGL',
        normal: new THREE.Vector3(0.28, 0.38, -0.88),
        width: 1.25,
        height: 0.31,
        phase: 4.3,
        opacity: 0.53,
      },
      {
        text: 'ThreeJS',
        normal: new THREE.Vector3(-0.88, -0.15, 0.45),
        width: 1.65,
        height: 0.34,
        phase: 5.1,
        opacity: 0.59,
      },
      {
        text: 'REST-API',
        normal: new THREE.Vector3(-0.42, -0.62, 0.66),
        width: 1.85,
        height: 0.35,
        phase: 3.9,
        opacity: 0.58,
      },
    ];

    const sphereRadius = 4.5;
    const labelLift = 0.03;

    this.planetLabelGroup = new THREE.Group();
    this.planet.add(this.planetLabelGroup);
    this.planetLabels = [];

    labels.forEach(({ text, normal, width, height, phase, opacity }) => {
      // Create curved label on planet surface
      const surfaceNormal = normal.clone().normalize();
      const geometry = this.makeCurvedPlanetLabelGeometry(width, height, sphereRadius);
      const material = new THREE.MeshBasicMaterial({
        map: this.makePlanetLabelTexture(text),
        color: 0xffffff,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const basePosition = surfaceNormal.clone().multiplyScalar(sphereRadius + labelLift);

      mesh.position.copy(basePosition);

      // Orient label to face outward with proper up direction
      // Calculate an appropriate up vector that's perpendicular to the normal
      // Use world up (0,1,0) as reference, but if normal is too close to vertical, use (0,0,1)
      const worldUp = Math.abs(surfaceNormal.y) > 0.9
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);

      // Create a right vector perpendicular to normal and worldUp
      const right = new THREE.Vector3().crossVectors(worldUp, surfaceNormal).normalize();
      // Create true up vector perpendicular to both
      const up = new THREE.Vector3().crossVectors(surfaceNormal, right).normalize();

      // Build rotation matrix manually to control orientation
      const rotMatrix = new THREE.Matrix4();
      rotMatrix.makeBasis(right, up, surfaceNormal);
      mesh.setRotationFromMatrix(rotMatrix);

      mesh.renderOrder = 3;

      this.planetLabelGroup.add(mesh);

      // Create flat marker dot next to the label - blends with curved surface
      const dotSize = 0.18;
      const dotGeo = new THREE.PlaneGeometry(dotSize, dotSize);
      const dotMat = new THREE.MeshBasicMaterial({
        map: this.makeMarkerDotTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const marker = new THREE.Mesh(dotGeo, dotMat);

      // Position dot to the left of the label, closer to text
      const dotOffset = new THREE.Vector3(-width / 2 - 0.15, 0, 0);
      marker.position.copy(dotOffset);


      // Add marker as child of the label mesh so it rotates with it
      mesh.add(marker);

      this.planetLabels.push({
        mesh,
        phase,
        baseOpacity: opacity,
        marker,
      });
    });
  }

  private initScene(): void {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020c1b);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 0, 28);

    this.buildStarField();

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private buildStarField(): void {
    const count = 6000;
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r     = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() < 0.1 ? 0.55 + Math.random() * 0.25
                                      : 0.12 + Math.random() * 0.18;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    this.starField = new THREE.Points(geo, new THREE.PointsMaterial({
      map: this.makeStarSprite(),
      size: 0.55,
      sizeAttenuation: true,
      color: 0xf2f8ff,
      transparent: true,
      alphaTest: 0.001,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    }));

    this.scene.add(this.starField);
  }

  private initSpaceScene(): void {
    const canvas = this.sceneCanvasRef.nativeElement;
    const w = canvas.clientWidth || window.innerWidth * 0.55;
    const h = canvas.clientHeight || window.innerHeight;

    this.sceneRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.sceneRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.sceneRenderer.setSize(w, h);
    this.sceneRenderer.toneMapping = THREE.NoToneMapping;
    this.sceneRenderer.outputColorSpace = THREE.SRGBColorSpace;

    this.spaceScene = new THREE.Scene();

    this.spaceCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    this.spaceCamera.position.set(0, 3, 22);
    this.spaceCamera.lookAt(this.ORBIT_CENTER);

    // ── Lighting ──────────────────────────────────────────────
    const sunLight = new THREE.PointLight(0xffeedd, 2.5, 200);
    sunLight.position.set(-18, 12, 20);
    this.spaceScene.add(sunLight);
    // Balanced fill so the planet stays dark but readable
    this.spaceScene.add(new THREE.AmbientLight(0x15253a, 1.2));
    const fillLight = new THREE.DirectionalLight(0x6b98bc, 0.24);
    fillLight.position.set(8, 5, 14);
    this.spaceScene.add(fillLight);

    // ── Planet group (offset right) ─────────────────────���─────
    this.spaceGroup = new THREE.Group();
    this.spaceGroup.position.copy(this.ORBIT_CENTER);
    this.spaceScene.add(this.spaceGroup);

    // ── Planet ────────────────────────────────────────────────
    const planetGeo = new THREE.SphereGeometry(4.5, 64, 64);
    const planetMat = new THREE.MeshPhongMaterial({
      map: this.makePlanetTexture(),
      color: 0xffffff,
      emissive: 0x041328,
      specular: 0x0d2238,
      shininess: 8,
    });
    this.planet = new THREE.Mesh(planetGeo, planetMat);
    this.spaceGroup.add(this.planet);

    // Surface detail bands (latitude stripes via torus inside planet)
    for (let i = 0; i < 1; i++) {
      const bandGeo = new THREE.TorusGeometry(4.5, 0.04 + i * 0.015, 8, 120);
      const bandMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00d4ff : 0x003366,
        transparent: true,
        opacity: 0.18 + i * 0.01,
      });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = -1.5 + i * 1.1;
      this.planet.add(band);
    }

    // ── Atmosphere glow ───────────────────────────────────────
    const atmoGeo = new THREE.SphereGeometry(4.85, 64, 64);
    const atmoMat = new THREE.MeshPhongMaterial({
      color: 0x00d4ff,
      emissive: 0x003a6e,
      transparent: true,
      opacity: 0.13,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.planetAtmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.spaceGroup.add(this.planetAtmo);

    // Outer halo
    const haloGeo = new THREE.SphereGeometry(5.4, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.045,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.spaceGroup.add(new THREE.Mesh(haloGeo, haloMat));

    // ── Rings ─────────────────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(6.0, 9.2, 128);
    // Remap UVs so texture coords are ring-radial
    const pos = ringGeo.attributes['position'] as THREE.BufferAttribute;
    const uv = ringGeo.attributes['uv'] as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      uv.setXY(i, (tmp.length() - 6.0) / 3.2, 0);
    }
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00aadd,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.rings = new THREE.Mesh(ringGeo, ringMat);
    this.rings.rotation.x = Math.PI / 2.4;
    this.spaceGroup.add(this.rings);

    // ── HUD targeting ring ─────────────────────────────────────
    const hudPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      hudPoints.push(new THREE.Vector3(Math.cos(a) * 7.2, Math.sin(a) * 7.2, 0));
    }
    const hudGeo = new THREE.BufferGeometry().setFromPoints(hudPoints);
    const hudMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.18,
    });
    this.hudRing = new THREE.LineLoop(hudGeo, hudMat);
    this.hudRing.rotation.x = Math.PI / 2.4;
    this.spaceGroup.add(this.hudRing);

    // Create labels after hudRing is created
    this.createPlanetLabels();

    // ── Moon (glowing dot orbiting planet) ────────────────────
    this.moon = new THREE.Group();

    // Core glow dot
    const glowGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffdd,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const engineGlow = new THREE.Mesh(glowGeo, glowMat);
    engineGlow.position.x = 0;
    this.moon.add(engineGlow);

    // Soft halo around moon
    const moonHaloGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.moon.add(new THREE.Mesh(moonHaloGeo, moonHaloMat));

    this.moon.scale.setScalar(0.55);
    this.spaceScene.add(this.moon);

    // Click, hover & drag detection on scene canvas
    canvas.addEventListener('click',     this.onSceneClick);
    canvas.addEventListener('mousemove', this.onSceneHover);
    canvas.addEventListener('mousedown', this.onSceneDragStart);
    window.addEventListener('mousemove', this.onSceneDrag);
    window.addEventListener('mouseup',   this.onSceneDragEnd);
  }

  private animateSpaceScene(t: number): void {
    // Planet rotation — base drift + drag-spin inertia
    // Stop base rotation while dragging
    const baseRotSpeed = this.isDraggingPlanet ? 0 : this.DEFAULT_ROT_SPEED;

    // Smooth deceleration with exponential decay
    if (Math.abs(this.planetSpinVelocity) > 0.00001) {
      // Slower decay for longer spin after release
      const decayRate = this.isDraggingPlanet ? 0.99 : 0.975;
      this.planetSpinVelocity *= decayRate;
    } else {
      // Snap to zero when very small
      this.planetSpinVelocity = 0;
    }

    this.planetRotationY += baseRotSpeed + this.planetSpinVelocity;
    this.planet.rotation.y    = this.planetRotationY;
    this.planetAtmo.rotation.y = this.planetRotationY * 1.08;

    // Update labels opacity and marker animations
    this.planetLabels.forEach(label => {
      // Opacity pulse for labels
      (label.mesh.material as THREE.MeshBasicMaterial).opacity =
        label.baseOpacity + 0.08 * Math.sin(t * 1.15 + label.phase);

      // Pulse the timeline markers in sync with labels
      if (label.marker) {
        const markerMat = label.marker.material as THREE.MeshBasicMaterial;
        markerMat.opacity = 0.85 + 0.15 * Math.sin(t * 1.15 + label.phase);

        // Subtle scale pulse
        const scale = 1 + 0.1 * Math.sin(t * 2 + label.phase);
        label.marker.scale.setScalar(scale);
      }
    });

    // Rings subtle wobble
    this.rings.rotation.y = t * 0.012;
    this.hudRing.rotation.z = t * 0.05;

    // Decay boost back to normal once timer expires
    if (this.moonSpeedMultiplier > 1 && t > this.moonBoostEndTime) {
      this.moonSpeedMultiplier = 1;
    }

    // Moon orbit — accumulate angle per-frame scaled by speed multiplier
    const baseSpeed  = 0.15;
    const deltaAngle = (1 / 60) * baseSpeed * this.moonSpeedMultiplier;
    this.moonOrbitAngle += deltaAngle;

    const orbitR    = 8.5;
    const orbitTilt = 0.38;
    const ox        = this.ORBIT_CENTER.x;
    this.moon.position.x = ox + Math.cos(this.moonOrbitAngle) * orbitR;
    this.moon.position.y = Math.sin(this.moonOrbitAngle) * orbitR * Math.sin(orbitTilt);
    this.moon.position.z = Math.sin(this.moonOrbitAngle) * orbitR * Math.cos(orbitTilt);

    // Pulse the moon glow slightly faster when boosted
    const glowPulse = 0.85 + 0.15 * Math.sin(t * (this.moonSpeedMultiplier > 1 ? 18 : 6));
    (this.moon.children[0] as THREE.Mesh).scale.setScalar(glowPulse);

    // Camera subtle drift — always looking at the planet group
    this.spaceCamera.position.x = Math.sin(t * 0.07) * 0.8;
    this.spaceCamera.position.y = 3 + Math.cos(t * 0.05) * 0.6;
    this.spaceCamera.position.z = 22;
    this.spaceCamera.lookAt(this.ORBIT_CENTER);

    this.sceneRenderer.render(this.spaceScene, this.spaceCamera);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();

    this.starField.rotation.y = t * 0.004;
    this.starField.rotation.x = t * 0.001;

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    this.camera.position.x += (this.mouseX * 2 - this.camera.position.x) * 0.04;
    this.camera.position.y += (-this.mouseY * 1.5 - this.camera.position.y) * 0.04;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.renderer.render(this.scene, this.camera);
    if (this.sceneRenderer) this.animateSpaceScene(t);
  };

  private onSceneClick = (e: MouseEvent): void => {
    const canvas = this.sceneCanvasRef.nativeElement;
    const rect   = canvas.getBoundingClientRect();
    // NDC coords relative to the scene canvas
    const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.spaceCamera);
    const hits = this.raycaster.intersectObjects(this.moon.children, false);
    if (hits.length > 0) {
      // Boost for 4 seconds at 3× speed
      this.moonSpeedMultiplier = 3;
      this.moonBoostEndTime = this.clock.getElapsedTime() + 4;
    }
  };

  private onSceneHover = (e: MouseEvent): void => {
    if (this.isDraggingPlanet) return;
    const canvas = this.sceneCanvasRef.nativeElement;
    const rect   = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.spaceCamera);

    const moonHits   = this.raycaster.intersectObjects(this.moon.children, false);
    const planetHits = this.raycaster.intersectObject(this.planet, true);

    if (moonHits.length > 0)        canvas.style.cursor = 'pointer';
    else if (planetHits.length > 0) canvas.style.cursor = 'grab';
    else                             canvas.style.cursor = 'default';
  };

  private onSceneDragStart = (e: MouseEvent): void => {
    const canvas = this.sceneCanvasRef.nativeElement;
    const rect   = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.spaceCamera);
    const hits = this.raycaster.intersectObject(this.planet, true);
    if (hits.length > 0) {
      this.isDraggingPlanet = true;
      this.dragLastX = e.clientX;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  };

  private onSceneDrag = (e: MouseEvent): void => {
    if (!this.isDraggingPlanet) return;
    const canvas  = this.sceneCanvasRef.nativeElement;
    const deltaX  = e.clientX - this.dragLastX;
    this.dragLastX = e.clientX;
    // Translate pixel delta to rotation velocity — scale by canvas width
    this.planetSpinVelocity += (deltaX / canvas.clientWidth) * Math.PI * 1.8;
    canvas.style.cursor = 'grabbing';
  };

  private onSceneDragEnd = (): void => {
    if (!this.isDraggingPlanet) return;
    this.isDraggingPlanet = false;
    this.sceneCanvasRef.nativeElement.style.cursor = 'default';
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.targetMouseX = (e.clientX / window.innerWidth)  * 2 - 1;
    this.targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.sceneRenderer) {
      const canvas = this.sceneCanvasRef.nativeElement;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      this.spaceCamera.aspect = w / h;
      this.spaceCamera.updateProjectionMatrix();
      this.sceneRenderer.setSize(w, h);
    }  };

  toggleLang(): void {
    this.currentLang = this.currentLang === 'en' ? 'de' : 'en';
    this.translate.use(this.currentLang);
  }
}
