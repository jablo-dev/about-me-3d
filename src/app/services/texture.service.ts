import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class TextureService {
  makePlanetTexture(): THREE.CanvasTexture {
    const W = 1024, H = 512;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#061733';
    ctx.fillRect(0, 0, W, H);

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

    const storm = { x: 0.73, y: 0.27, r: 0.04 };
    const eye = ctx.createRadialGradient(storm.x * W, storm.y * H, 0, storm.x * W, storm.y * H, storm.r * W);
    eye.addColorStop(0,   'rgba(180,230,255,0.22)');
    eye.addColorStop(0.45,'rgba(80,140,210,0.10)');
    eye.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(storm.x * W, storm.y * H, storm.r * W, 0, Math.PI * 2);
    ctx.fill();

    [0.18, 0.30, 0.43, 0.56, 0.70, 0.82].forEach(gy => {
      const g = ctx.createLinearGradient(0, (gy-0.025)*H, 0, (gy+0.025)*H);
      g.addColorStop(0,   'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(2,7,18,0.42)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, (gy-0.025)*H, W, 0.05*H);
    });

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

  makeStarSprite(): THREE.Texture {
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

  makePlanetLabelTexture(text: string, color: string): THREE.CanvasTexture {
    const width = Math.max(280, text.length * 52);
    const height = 96;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;

    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 48px 'Orbitron', sans-serif";

    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  makeMarkerDotTexture(): THREE.CanvasTexture {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const center = size / 2;

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
}

