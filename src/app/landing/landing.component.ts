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

  currentLang = 'en';

  constructor(private ngZone: NgZone, private translate: TranslateService) {
    this.translate.addLangs(['en', 'de']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => this.initScene());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
  }

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  /** Soft circular sprite so stars render as round dots, not squares. */
  private makeStarSprite(): THREE.Texture {
    const size = 32;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const h = size / 2;
    const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
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
    // ~700 stars – sparse like the reference image
    const count = 700;
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r     = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // ~10 % brighter/bigger stars, rest tiny
      sizes[i] = Math.random() < 0.1 ? 0.55 + Math.random() * 0.25
                                      : 0.12 + Math.random() * 0.18;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    this.starField = new THREE.Points(geo, new THREE.PointsMaterial({
      map: this.makeStarSprite(),
      size: 0.35,
      sizeAttenuation: true,
      color: 0xd0e8ff,          // faint blue-white tint
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      opacity: 0.85,
    }));

    this.scene.add(this.starField);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();

    // Very slow drift so the sky feels alive but not distracting
    this.starField.rotation.y = t * 0.004;
    this.starField.rotation.x = t * 0.001;

    // Smooth mouse lerp
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    this.camera.position.x += (this.mouseX * 2 - this.camera.position.x) * 0.04;
    this.camera.position.y += (-this.mouseY * 1.5 - this.camera.position.y) * 0.04;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.renderer.render(this.scene, this.camera);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.targetMouseX = (e.clientX / window.innerWidth)  * 2 - 1;
    this.targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  toggleLang(): void {
    this.currentLang = this.currentLang === 'en' ? 'de' : 'en';
    this.translate.use(this.currentLang);
  }
}
