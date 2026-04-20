import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config';
import { TextureService } from './texture.service';

@Injectable({
  providedIn: 'root',
})
export class StarFieldService {
  private starField!: THREE.Points;

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

  animate(elapsedTime: number): void {
    if (this.starField) {
      this.starField.rotation.y = elapsedTime * 0.004;
      this.starField.rotation.x = elapsedTime * 0.001;
    }
  }

  dispose(): void {
    if (this.starField) {
      this.starField.geometry.dispose();
      (this.starField.material as THREE.PointsMaterial).dispose();
    }
  }
}

