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
  private planetAtmo!: THREE.Mesh;
  private rings!: THREE.Mesh;
  private spaceship!: THREE.Group;
  private shipOrbitAngle = 0;
  private hudRing!: THREE.LineLoop;
  private readonly ORBIT_CENTER = new THREE.Vector3(3, 0, 0);

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
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
  }

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private makeStarSprite(): THREE.Texture {
    const size = 32;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const h = size / 2;
    const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(210,235,255,0.9)');
    grad.addColorStop(0.75, 'rgba(120,190,255,0.35)');
    grad.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
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
    this.spaceScene.add(new THREE.AmbientLight(0x0a1628, 1.2));

    // ── Planet group (offset right) ─────────────────────���─────
    this.spaceGroup = new THREE.Group();
    this.spaceGroup.position.copy(this.ORBIT_CENTER);
    this.spaceScene.add(this.spaceGroup);

    // ── Planet ────────────────────────────────────────────────
    const planetGeo = new THREE.SphereGeometry(4.5, 64, 64);
    const planetMat = new THREE.MeshPhongMaterial({
      color: 0x0a2a5e,
      emissive: 0x001133,
      specular: 0x00d4ff,
      shininess: 60,
    });
    this.planet = new THREE.Mesh(planetGeo, planetMat);
    this.spaceGroup.add(this.planet);

    // Surface detail bands (latitude stripes via torus inside planet)
    for (let i = 0; i < 4; i++) {
      const bandGeo = new THREE.TorusGeometry(4.5, 0.04 + i * 0.015, 8, 120);
      const bandMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00d4ff : 0x003366,
        transparent: true,
        opacity: 0.18 + i * 0.04,
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

    // Inner darker ring band
    const ring2Geo = new THREE.RingGeometry(6.2, 7.4, 128);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x004466,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rings2 = new THREE.Mesh(ring2Geo, ring2Mat);
    rings2.rotation.x = Math.PI / 2.4;
    this.spaceGroup.add(rings2);

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

    // ── Moon (glowing dot orbiting planet) ────────────────────
    this.spaceship = new THREE.Group();

    // Engine glow
    // Engine glow
    const glowGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffdd,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const engineGlow = new THREE.Mesh(glowGeo, glowMat);
    engineGlow.position.x = 0;
    this.spaceship.add(engineGlow);

    // Soft halo around moon
    const moonHaloGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.spaceship.add(new THREE.Mesh(moonHaloGeo, moonHaloMat));

    this.spaceship.scale.setScalar(0.55);
    this.spaceScene.add(this.spaceship);
  }

  private animateSpaceScene(t: number): void {
    // Planet slow rotation
    this.planet.rotation.y = t * 0.06;
    this.planetAtmo.rotation.y = t * 0.065;

    // Rings subtle wobble
    this.rings.rotation.y = t * 0.012;
    this.hudRing.rotation.z = t * 0.05;

    // Spaceship orbit around ORBIT_CENTER
    this.shipOrbitAngle = t * 0.38;
    const orbitR = 8.5;
    const orbitTilt = 0.38;
    const ox = this.ORBIT_CENTER.x;
    this.spaceship.position.x = ox + Math.cos(this.shipOrbitAngle) * orbitR;
    this.spaceship.position.y = Math.sin(this.shipOrbitAngle) * orbitR * Math.sin(orbitTilt);
    this.spaceship.position.z = Math.sin(this.shipOrbitAngle) * orbitR * Math.cos(orbitTilt);

    // Point ship nose in direction of travel (tangent)
    const tangentX = -Math.sin(this.shipOrbitAngle);
    const tangentY =  Math.cos(this.shipOrbitAngle) * Math.sin(orbitTilt);
    const tangentZ =  Math.cos(this.shipOrbitAngle) * Math.cos(orbitTilt);
    this.spaceship.lookAt(
      this.spaceship.position.x + tangentX,
      this.spaceship.position.y + tangentY,
      this.spaceship.position.z + tangentZ,
    );

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
