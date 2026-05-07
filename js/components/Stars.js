import * as THREE from 'three';

const TWINKLE_VERT = `
attribute float aPhase;
attribute float aSize;
uniform float uTime;
varying float vAlpha;

void main() {
  vAlpha = 0.3 + 0.7 * abs(sin(uTime * 0.6 + aPhase));
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (220.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;

const TWINKLE_FRAG = `
varying float vAlpha;
void main() {
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  if (dist > 0.5) discard;
  float core = smoothstep(0.5, 0.0, dist);
  float spike = smoothstep(0.25, 0.0, abs(coord.x)) * smoothstep(0.25, 0.0, abs(coord.y)) * 0.6;
  gl_FragColor = vec4(1.0, 1.0, 1.0, (core + spike) * vAlpha);
}`;

export function createStarfield(count = 2000) {
  const positions = new Float32Array(count * 3);
  const phases    = new Float32Array(count);
  const sizes     = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 80 + Math.random() * 120;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    phases[i] = Math.random() * Math.PI * 2;
    sizes[i]  = 1.5 + Math.random() * 2.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: TWINKLE_VERT,
    fragmentShader: TWINKLE_FRAG,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

export function createSpaceStars(count = 14) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.1,
  });

  for (let i = 0; i < count; i++) {
    const outerR = 0.05 + Math.random() * 0.13;
    const innerR = outerR * 0.42;
    const pts    = 5;

    const shape = new THREE.Shape();
    for (let j = 0; j < pts * 2; j++) {
      const angle = (j * Math.PI) / pts - Math.PI / 2;
      const r = j % 2 === 0 ? outerR : innerR;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: outerR * 0.5,
      bevelEnabled: true,
      bevelSize: outerR * 0.12,
      bevelThickness: outerR * 0.12,
      bevelSegments: 1,
    });

    const star = new THREE.Mesh(geo, mat);
    star.position.set(
      (Math.random() - 0.5) * 38,
      (Math.random() - 0.3) * 16,
      -4 - Math.random() * 28
    );
    star.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    star.userData.spinSpeed = (Math.random() - 0.5) * 0.6;
    group.add(star);
  }

  return group;
}
