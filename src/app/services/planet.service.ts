import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config';
import { PLANET_LABELS } from '../config/planet-labels.config';
import { TextureService } from './texture.service';

export interface PlanetLabelMesh {
  mesh: THREE.Mesh;
  phase: number;
  baseOpacity: number;
  marker?: THREE.Mesh;
  text: string;
  animationState: 'visible' | 'hiding' | 'hidden' | 'showing';
  animationStartTime: number;
  originalScale: THREE.Vector3;
  targetPosition: THREE.Vector3;
}

@Injectable({
  providedIn: 'root',
})
export class PlanetService {
  private planet!: THREE.Mesh;
  private planetAtmo!: THREE.Mesh;
  private rings!: THREE.Mesh;
  private hudRing!: THREE.LineLoop;
  private planetLabelGroup!: THREE.Group;
  private planetLabels: PlanetLabelMesh[] = [];
  private rotationY = 0;
  private spinVelocity = 0;
  private isDragging = false;
  private readonly config = SCENE_CONFIG;

  constructor(private textureService: TextureService) {}

  create(parentGroup: THREE.Group): void {
    this.createPlanet(parentGroup);
    this.createAtmosphere(parentGroup);
    this.createHalo(parentGroup);
    this.createRings(parentGroup);
    this.createHudRing(parentGroup);
    this.createPlanetLabels();
  }

  private createPlanet(parentGroup: THREE.Group): void {
    const planetGeo = new THREE.SphereGeometry(
      this.config.PLANET.RADIUS,
      this.config.PLANET.SEGMENTS,
      this.config.PLANET.SEGMENTS
    );
    const planetMat = new THREE.MeshPhongMaterial({
      map: this.textureService.makePlanetTexture(),
      color: 0xffffff,
      emissive: this.config.PLANET.EMISSIVE,
      specular: this.config.PLANET.SPECULAR,
      shininess: this.config.PLANET.SHININESS,
    });
    this.planet = new THREE.Mesh(planetGeo, planetMat);
    parentGroup.add(this.planet);

    // Surface detail bands
    for (let i = 0; i < 1; i++) {
      const bandGeo = new THREE.TorusGeometry(this.config.PLANET.RADIUS, 0.04 + i * 0.015, 8, 120);
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
  }

  private createAtmosphere(parentGroup: THREE.Group): void {
    const atmoGeo = new THREE.SphereGeometry(
      this.config.ATMOSPHERE.RADIUS,
      64,
      64
    );
    const atmoMat = new THREE.MeshPhongMaterial({
      color: this.config.ATMOSPHERE.COLOR,
      emissive: this.config.ATMOSPHERE.EMISSIVE,
      transparent: true,
      opacity: this.config.ATMOSPHERE.OPACITY,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.planetAtmo = new THREE.Mesh(atmoGeo, atmoMat);
    parentGroup.add(this.planetAtmo);
  }

  private createHalo(parentGroup: THREE.Group): void {
    const haloGeo = new THREE.SphereGeometry(this.config.HALO.RADIUS, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: this.config.HALO.COLOR,
      transparent: true,
      opacity: this.config.HALO.OPACITY,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    parentGroup.add(new THREE.Mesh(haloGeo, haloMat));
  }

  private createRings(parentGroup: THREE.Group): void {
    const ringGeo = new THREE.RingGeometry(
      this.config.RINGS.INNER_RADIUS,
      this.config.RINGS.OUTER_RADIUS,
      this.config.RINGS.SEGMENTS
    );

    const pos = ringGeo.attributes['position'] as THREE.BufferAttribute;
    const uv = ringGeo.attributes['uv'] as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      uv.setXY(i, (tmp.length() - this.config.RINGS.INNER_RADIUS) / (this.config.RINGS.OUTER_RADIUS - this.config.RINGS.INNER_RADIUS), 0);
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.config.RINGS.COLOR,
      transparent: true,
      opacity: this.config.RINGS.OPACITY,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.rings = new THREE.Mesh(ringGeo, ringMat);
    this.rings.rotation.x = this.config.RINGS.ROTATION_X;
    parentGroup.add(this.rings);
  }

  private createHudRing(parentGroup: THREE.Group): void {
    const hudPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= this.config.HUD_RING.SEGMENTS; i++) {
      const a = (i / this.config.HUD_RING.SEGMENTS) * Math.PI * 2;
      hudPoints.push(new THREE.Vector3(
        Math.cos(a) * this.config.HUD_RING.RADIUS,
        Math.sin(a) * this.config.HUD_RING.RADIUS,
        0
      ));
    }
    const hudGeo = new THREE.BufferGeometry().setFromPoints(hudPoints);
    const hudMat = new THREE.LineBasicMaterial({
      color: this.config.HUD_RING.COLOR,
      transparent: true,
      opacity: this.config.HUD_RING.OPACITY,
    });
    this.hudRing = new THREE.LineLoop(hudGeo, hudMat);
    this.hudRing.rotation.x = this.config.RINGS.ROTATION_X;
    parentGroup.add(this.hudRing);
  }

  private createPlanetLabels(): void {
    const sphereRadius = this.config.PLANET.RADIUS;
    const labelLift = this.config.PLANET.LABEL_LIFT;

    this.planetLabelGroup = new THREE.Group();
    this.planet.add(this.planetLabelGroup);
    this.planetLabels = [];

    PLANET_LABELS.forEach(({ text, normal, width, height, phase, opacity }) => {
      const surfaceNormal = normal.clone().normalize();
      const geometry = this.makeCurvedPlanetLabelGeometry(width, height, sphereRadius);
      const material = new THREE.MeshBasicMaterial({
        map: this.textureService.makePlanetLabelTexture(text, this.config.PLANET_LABEL_COLOR),
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
      const worldUp = Math.abs(surfaceNormal.y) > 0.9
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);

      const right = new THREE.Vector3().crossVectors(worldUp, surfaceNormal).normalize();
      const up = new THREE.Vector3().crossVectors(surfaceNormal, right).normalize();

      const rotMatrix = new THREE.Matrix4();
      rotMatrix.makeBasis(right, up, surfaceNormal);
      mesh.setRotationFromMatrix(rotMatrix);

      mesh.renderOrder = 3;

      this.planetLabelGroup.add(mesh);

      const dotSize = 0.18;
      const dotGeo = new THREE.PlaneGeometry(dotSize, dotSize);
      const dotMat = new THREE.MeshBasicMaterial({
        map: this.textureService.makeMarkerDotTexture(),
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

      const dotOffset = new THREE.Vector3(-width / 2 - 0.15, 0, 0);
      marker.position.copy(dotOffset);

      mesh.add(marker);

      this.planetLabels.push({
        mesh,
        phase,
        baseOpacity: opacity,
        marker,
        text,
        animationState: 'visible',
        animationStartTime: 0,
        originalScale: new THREE.Vector3(1, 1, 1),
        targetPosition: basePosition.clone(),
      });
    });
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

  getPlanet(): THREE.Mesh {
    return this.planet;
  }

  getPlanetLabels(): PlanetLabelMesh[] {
    return this.planetLabels;
  }

  startDrag(clientX: number): void {
    this.isDragging = true;
  }

  drag(deltaX: number, canvasWidth: number): void {
    if (!this.isDragging) return;
    this.spinVelocity += (deltaX / canvasWidth) * Math.PI * 1.8;
  }

  endDrag(): void {
    this.isDragging = false;
  }

  isDraggingPlanet(): boolean {
    return this.isDragging;
  }

  toggleLabel(labelText: string, shouldBeVisible: boolean, currentTime: number): void {
    const labelData = this.planetLabels.find(l => l.text === labelText);
    if (!labelData) return;

    if (shouldBeVisible && labelData.animationState === 'hidden') {
      // Start showing animation
      labelData.animationState = 'showing';
      labelData.animationStartTime = currentTime;
    } else if (!shouldBeVisible && labelData.animationState === 'visible') {
      // Start hiding animation
      labelData.animationState = 'hiding';
      labelData.animationStartTime = currentTime;
    }
  }

  animate(elapsedTime: number): void {
    const baseRotSpeed = this.isDragging ? 0 : this.config.DEFAULT_ROT_SPEED;
    if (Math.abs(this.spinVelocity) > 0.00001) {
      const decayRate = this.isDragging ? 0.99 : 0.975;
      this.spinVelocity *= decayRate;
    } else {
      this.spinVelocity = 0;
    }

    this.rotationY += baseRotSpeed + this.spinVelocity;
    this.planet.rotation.y = this.rotationY;
    this.planetAtmo.rotation.y = this.rotationY * 1.08;

    // Animate labels
    this.planetLabels.forEach(label => {
      const material = label.mesh.material as THREE.MeshBasicMaterial;

      // Handle animation states
      if (label.animationState === 'hiding') {
        const animDuration = 0.5; // 0.5 seconds for implosion
        const progress = Math.min((elapsedTime - label.animationStartTime) / animDuration, 1);

        // Implosion effect: scale down and fade out
        const scale = 1 - progress;
        label.mesh.scale.set(scale, scale, scale);
        material.opacity = label.baseOpacity * scale;

        if (label.marker) {
          const markerMat = label.marker.material as THREE.MeshBasicMaterial;
          markerMat.opacity = 0.85 * scale;
        }

        if (progress >= 1) {
          label.animationState = 'hidden';
          label.mesh.visible = false;
        }
      } else if (label.animationState === 'showing') {
        const animDuration = 0.8; // 0.8 seconds for falling
        const progress = Math.min((elapsedTime - label.animationStartTime) / animDuration, 1);

        // Make visible immediately when starting animation
        if (!label.mesh.visible) {
          label.mesh.visible = true;
        }

        // Falling effect: start above target position and fall down with easing
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
        const fallDistance = 5; // Distance above the target to start from
        const yOffset = fallDistance * (1 - easeProgress);

        // Update position (fall down)
        const currentPos = label.targetPosition.clone();
        currentPos.y += yOffset;
        label.mesh.position.copy(currentPos);

        // Scale and opacity
        const scale = easeProgress;
        label.mesh.scale.set(scale, scale, scale);
        material.opacity = label.baseOpacity * easeProgress;

        if (label.marker) {
          const markerMat = label.marker.material as THREE.MeshBasicMaterial;
          markerMat.opacity = 0.85 * easeProgress;
        }

        if (progress >= 1) {
          label.animationState = 'visible';
          label.mesh.scale.copy(label.originalScale);
          label.mesh.position.copy(label.targetPosition);
        }
      } else if (label.animationState === 'visible') {
        // Normal pulsing animation for visible labels
        material.opacity = label.baseOpacity + 0.08 * Math.sin(elapsedTime * 1.15 + label.phase);

        if (label.marker) {
          const markerMat = label.marker.material as THREE.MeshBasicMaterial;
          markerMat.opacity = 0.85 + 0.15 * Math.sin(elapsedTime * 1.15 + label.phase);

          const scale = 1 + 0.1 * Math.sin(elapsedTime * 2 + label.phase);
          label.marker.scale.setScalar(scale);
        }
      }
    });

    this.rings.rotation.y = elapsedTime * 0.012;
    this.hudRing.rotation.z = elapsedTime * 0.05;
  }

  dispose(): void {
    this.planetLabels.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
    });

    if (this.planet) {
      this.planet.geometry.dispose();
      (this.planet.material as THREE.Material).dispose();
    }
    if (this.planetAtmo) {
      this.planetAtmo.geometry.dispose();
      (this.planetAtmo.material as THREE.Material).dispose();
    }
    if (this.rings) {
      this.rings.geometry.dispose();
      (this.rings.material as THREE.Material).dispose();
    }
    if (this.hudRing) {
      this.hudRing.geometry.dispose();
      (this.hudRing.material as THREE.Material).dispose();
    }
  }
}

