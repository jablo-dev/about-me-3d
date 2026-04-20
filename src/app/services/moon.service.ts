import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config';

@Injectable({
  providedIn: 'root',
})
export class MoonService {
  private moon!: THREE.Group;
  private orbitAngle = 0;
  private speedMultiplier = 1;
  private boostEndTime = 0;
  private config = SCENE_CONFIG.MOON;

  create(scene: THREE.Scene): THREE.Group {
    this.moon = new THREE.Group();

    const glowGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.config.GLOW_COLOR,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const engineGlow = new THREE.Mesh(glowGeo, glowMat);
    engineGlow.position.x = 0;
    this.moon.add(engineGlow);

    const moonHaloGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: this.config.HALO_COLOR,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.moon.add(new THREE.Mesh(moonHaloGeo, moonHaloMat));

    this.moon.scale.setScalar(this.config.SCALE);
    scene.add(this.moon);

    return this.moon;
  }

  getMoon(): THREE.Group {
    return this.moon;
  }

  boost(currentTime: number): void {
    this.speedMultiplier = this.config.BOOST_MULTIPLIER;
    this.boostEndTime = currentTime + this.config.BOOST_DURATION;
  }

  animate(elapsedTime: number, orbitCenter: THREE.Vector3): void {
    if (this.speedMultiplier > 1 && elapsedTime > this.boostEndTime) {
      this.speedMultiplier = 1;
    }

    const deltaAngle = (1 / 60) * this.config.BASE_SPEED * this.speedMultiplier;
    this.orbitAngle += deltaAngle;

    const orbitR = this.config.ORBIT_RADIUS;
    const orbitTilt = this.config.ORBIT_TILT;
    const ox = orbitCenter.x;
    this.moon.position.x = ox + Math.cos(this.orbitAngle) * orbitR;
    this.moon.position.y = Math.sin(this.orbitAngle) * orbitR * Math.sin(orbitTilt);
    this.moon.position.z = Math.sin(this.orbitAngle) * orbitR * Math.cos(orbitTilt);

    const glowPulse = 0.85 + 0.15 * Math.sin(elapsedTime * (this.speedMultiplier > 1 ? 18 : 6));
    (this.moon.children[0] as THREE.Mesh).scale.setScalar(glowPulse);
  }

  dispose(): void {
    if (this.moon) {
      this.moon.children.forEach(child => {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    }
  }
}

