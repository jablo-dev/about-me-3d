import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config';
import { StarFieldService } from './star-field.service';

@Injectable({
  providedIn: 'root',
})
export class BackgroundSceneService {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private readonly config = SCENE_CONFIG;

  constructor(private starFieldService: StarFieldService) {}

  init(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020c1b);

    this.camera = new THREE.PerspectiveCamera(
      this.config.CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      this.config.CAMERA.NEAR,
      this.config.CAMERA.FAR
    );
    this.camera.position.set(
      this.config.CAMERA.POSITION.x,
      this.config.CAMERA.POSITION.y,
      this.config.CAMERA.POSITION.z
    );

    const starField = this.starFieldService.create();
    this.scene.add(starField);
  }

  explode(): void {
    this.starFieldService.explode();
  }

  handleMouseMove(event: MouseEvent): void {
    this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetMouseY = (event.clientY / window.innerHeight) * 2 - 1;
  }

  animate(elapsedTime: number): void {
    this.starFieldService.animate(elapsedTime);

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    this.camera.position.x += (this.mouseX * 2 - this.camera.position.x) * 0.04;
    this.camera.position.y += (-this.mouseY * 1.5 - this.camera.position.y) * 0.04;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    this.starFieldService.dispose();
    this.renderer?.dispose();
  }
}

