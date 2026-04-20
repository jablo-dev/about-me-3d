import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config';
import { PlanetService } from './planet.service';
import { MoonService } from './moon.service';

@Injectable({
  providedIn: 'root',
})
export class SpaceSceneService {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private spaceGroup!: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private readonly config = SCENE_CONFIG;
  private dragLastX = 0;

  constructor(
    private planetService: PlanetService,
    private moonService: MoonService
  ) {}

  init(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth || window.innerWidth * 0.55;
    const h = canvas.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      this.config.SPACE_CAMERA.FOV,
      w / h,
      this.config.SPACE_CAMERA.NEAR,
      this.config.SPACE_CAMERA.FAR
    );
    this.camera.position.set(
      this.config.SPACE_CAMERA.POSITION.x,
      this.config.SPACE_CAMERA.POSITION.y,
      this.config.SPACE_CAMERA.POSITION.z
    );
    this.camera.lookAt(
      new THREE.Vector3(
        this.config.ORBIT_CENTER.x,
        this.config.ORBIT_CENTER.y,
        this.config.ORBIT_CENTER.z
      )
    );

    this.setupLighting();
    this.setupSpaceGroup();
  }

  private setupLighting(): void {
    const sunLight = new THREE.PointLight(
      this.config.LIGHTING.SUN.COLOR,
      this.config.LIGHTING.SUN.INTENSITY,
      this.config.LIGHTING.SUN.DISTANCE
    );
    sunLight.position.set(
      this.config.LIGHTING.SUN.POSITION.x,
      this.config.LIGHTING.SUN.POSITION.y,
      this.config.LIGHTING.SUN.POSITION.z
    );
    this.scene.add(sunLight);

    this.scene.add(new THREE.AmbientLight(
      this.config.LIGHTING.AMBIENT.COLOR,
      this.config.LIGHTING.AMBIENT.INTENSITY
    ));

    const fillLight = new THREE.DirectionalLight(
      this.config.LIGHTING.FILL.COLOR,
      this.config.LIGHTING.FILL.INTENSITY
    );
    fillLight.position.set(
      this.config.LIGHTING.FILL.POSITION.x,
      this.config.LIGHTING.FILL.POSITION.y,
      this.config.LIGHTING.FILL.POSITION.z
    );
    this.scene.add(fillLight);
  }

  private setupSpaceGroup(): void {
    this.spaceGroup = new THREE.Group();
    this.spaceGroup.position.set(
      this.config.ORBIT_CENTER.x,
      this.config.ORBIT_CENTER.y,
      this.config.ORBIT_CENTER.z
    );
    this.scene.add(this.spaceGroup);

    this.planetService.create(this.spaceGroup);
    this.moonService.create(this.scene);
  }

  handleClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(this.moonService.getMoon().children, false);

    if (hits.length > 0) {
      this.moonService.boost(this.clock.getElapsedTime());
    }
  }

  handleHover(event: MouseEvent, canvas: HTMLCanvasElement): void {
    if (this.planetService.isDraggingPlanet()) return;

    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const moonHits = this.raycaster.intersectObjects(this.moonService.getMoon().children, false);
    const planetHits = this.raycaster.intersectObject(this.planetService.getPlanet(), true);

    if (moonHits.length > 0) canvas.style.cursor = 'pointer';
    else if (planetHits.length > 0) canvas.style.cursor = 'grab';
    else canvas.style.cursor = 'default';
  }

  handleDragStart(event: MouseEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObject(this.planetService.getPlanet(), true);

    if (hits.length > 0) {
      this.planetService.startDrag(event.clientX);
      this.dragLastX = event.clientX;
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
    }
  }

  handleDrag(event: MouseEvent, canvas: HTMLCanvasElement): void {
    if (!this.planetService.isDraggingPlanet()) return;

    const deltaX = event.clientX - this.dragLastX;
    this.dragLastX = event.clientX;
    this.planetService.drag(deltaX, canvas.clientWidth);
    canvas.style.cursor = 'grabbing';
  }

  handleDragEnd(canvas: HTMLCanvasElement): void {
    if (!this.planetService.isDraggingPlanet()) return;
    this.planetService.endDrag();
    canvas.style.cursor = 'default';
  }

  animate(): void {
    const t = this.clock.getElapsedTime();
    const orbitCenter = new THREE.Vector3(
      this.config.ORBIT_CENTER.x,
      this.config.ORBIT_CENTER.y,
      this.config.ORBIT_CENTER.z
    );

    this.planetService.animate(t);
    this.moonService.animate(t, orbitCenter);

    this.camera.position.x = Math.sin(t * 0.07) * 0.8;
    this.camera.position.y = 3 + Math.cos(t * 0.05) * 0.6;
    this.camera.position.z = 22;
    this.camera.lookAt(orbitCenter);

    this.renderer.render(this.scene, this.camera);
  }

  resize(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  togglePlanetLabel(labelText: string, shouldBeVisible: boolean): void {
    this.planetService.toggleLabel(labelText, shouldBeVisible, this.clock.getElapsedTime());
  }

  dispose(): void {
    this.planetService.dispose();
    this.moonService.dispose();
    this.renderer?.dispose();
  }
}

