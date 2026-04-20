export const SCENE_CONFIG = {
  ORBIT_CENTER: { x: 3, y: 0, z: 0 },
  PLANET_LABEL_COLOR: '#00d4ff',
  DEFAULT_ROT_SPEED: 0.001,

  CAMERA: {
    FOV: 55,
    NEAR: 0.1,
    FAR: 400,
    POSITION: { x: 0, y: 0, z: 28 },
  },

  SPACE_CAMERA: {
    FOV: 50,
    NEAR: 0.1,
    FAR: 500,
    POSITION: { x: 0, y: 3, z: 22 },
  },

  STAR_FIELD: {
    COUNT: 6000,
    MIN_RADIUS: 80,
    MAX_RADIUS: 200,
    SIZE_MULTIPLIER: 0.55,
  },

  PLANET: {
    RADIUS: 4.5,
    SEGMENTS: 64,
    EMISSIVE: 0x041328,
    SPECULAR: 0x0d2238,
    SHININESS: 8,
    LABEL_LIFT: 0.03,
  },

  ATMOSPHERE: {
    RADIUS: 4.85,
    COLOR: 0x00d4ff,
    EMISSIVE: 0x003a6e,
    OPACITY: 0.13,
  },

  HALO: {
    RADIUS: 5.4,
    COLOR: 0x00d4ff,
    OPACITY: 0.045,
  },

  RINGS: {
    INNER_RADIUS: 6.0,
    OUTER_RADIUS: 9.2,
    SEGMENTS: 128,
    COLOR: 0x00aadd,
    OPACITY: 0.28,
    ROTATION_X: Math.PI / 2.4,
  },

  HUD_RING: {
    RADIUS: 7.2,
    SEGMENTS: 128,
    COLOR: 0x00d4ff,
    OPACITY: 0.18,
  },

  MOON: {
    ORBIT_RADIUS: 8.5,
    ORBIT_TILT: 0.38,
    BASE_SPEED: 0.15,
    BOOST_MULTIPLIER: 3,
    BOOST_DURATION: 4,
    SCALE: 0.55,
    GLOW_COLOR: 0x00ffdd,
    HALO_COLOR: 0x00d4ff,
  },

  LIGHTING: {
    SUN: {
      COLOR: 0xffeedd,
      INTENSITY: 2.5,
      DISTANCE: 200,
      POSITION: { x: -18, y: 12, z: 20 },
    },
    AMBIENT: {
      COLOR: 0x15253a,
      INTENSITY: 1.2,
    },
    FILL: {
      COLOR: 0x6b98bc,
      INTENSITY: 0.24,
      POSITION: { x: 8, y: 5, z: 14 },
    },
  },
};

