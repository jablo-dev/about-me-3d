import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config';
import { TextureService } from './texture.service';

@Injectable({
  providedIn: 'root',
})
export class StarFieldService {
  private starField!: THREE.Points;

  private exploding = false;
  private explosionElapsed = 0;
  private prevElapsed = 0;
  private velocities!: Float32Array;

  constructor(private textureService: TextureService) {}

  create(): THREE.Points {
    const config = SCENE_CONFIG.STAR_FIELD;
    const positions = new Float32Array(config.COUNT * 3);
    const sizes = new Float32Array(config.COUNT);

    for (let i = 0; i < config.COUNT; i++) {
      const r = config.MIN_RADIUS + Math.random() * (config.MAX_RADIUS - config.MIN_RADIUS);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() < 0.1 ? 0.55 + Math.random() * 0.25
                                      : 0.12 + Math.random() * 0.18;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.starField = new THREE.Points(geo, new THREE.PointsMaterial({
      map: this.textureService.makeStarSprite(),
      size: config.SIZE_MULTIPLIER,
      sizeAttenuation: true,
      color: 0xf2f8ff,
      transparent: true,
      alphaTest: 0.001,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    }));

    return this.starField;
  }

  explode(): void {
    if (this.exploding || !this.starField) return;

    const positions = this.starField.geometry.attributes['position'] as THREE.BufferAttribute;
    const count = positions.count;
    this.velocities = new Float32Array(count * 3);

    const dir = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      dir.set(positions.getX(i), positions.getY(i), positions.getZ(i));
      if (dir.lengthSq() < 0.0001) {
        dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      }
      dir.normalize();
      const speed = 6 + Math.random() * 12;
      this.velocities[i * 3] = dir.x * speed;
      this.velocities[i * 3 + 1] = dir.y * speed;
      this.velocities[i * 3 + 2] = dir.z * speed;
    }

    this.exploding = true;
    this.explosionElapsed = 0;
  }

  isExploding(): boolean {
    return this.exploding;
  }

  animate(elapsedTime: number): void {
    if (!this.starField) return;

    const dt = Math.min(Math.max(elapsedTime - this.prevElapsed, 0), 0.1);
    this.prevElapsed = elapsedTime;

    if (this.exploding) {
      this.explosionElapsed += dt;

      // Acceleration grows over time so stars fly away faster and faster.
      const accel = 1 + this.explosionElapsed * this.explosionElapsed * 2.5;
      const positions = this.starField.geometry.attributes['position'] as THREE.BufferAttribute;
      const arr = positions.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        arr[i] += this.velocities[i] * dt * accel;
      }
      positions.needsUpdate = true;

      this.starField.rotation.y += dt * 0.6;

      const mat = this.starField.material as THREE.PointsMaterial;
      const fade = Math.max(0, 1 - this.explosionElapsed / 2.2);
      mat.opacity = fade;
      mat.size = SCENE_CONFIG.STAR_FIELD.SIZE_MULTIPLIER * (1 + this.explosionElapsed * 0.6);
      if (fade <= 0) {
        this.starField.visible = false;
      }
      return;
    }

    this.starField.rotation.y = elapsedTime * 0.004;
    this.starField.rotation.x = elapsedTime * 0.001;
  }

  dispose(): void {
    if (this.starField) {
      this.starField.geometry.dispose();
      (this.starField.material as THREE.PointsMaterial).dispose();
    }
  }
}

