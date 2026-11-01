// One material for the whole city: flat-shaded Lambert with vertex colours,
// plus two shader tweaks:
//  1. procedural windows on walls flagged with info.x = 1 (no extra geometry);
//  2. an intro "rise" where buildings grow out of the ground (info.y = delay).
import { DoubleSide, MeshLambertMaterial } from 'three';

export function createCityMaterial() {
  const uniforms = { uRise: { value: 0 } };
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRise = uniforms.uRise;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 info;
        uniform float uRise;
        varying vec3 vObjPos;
        varying float vWin;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObjPos = position;
        vWin = info.x;
        if (info.y >= 0.0) {
          float k = clamp((uRise - info.y) / 0.45, 0.0, 1.0);
          k = 1.0 - pow(1.0 - k, 3.0);
          transformed.y *= max(k, 0.001);
        }`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjPos;
        varying float vWin;
        float band(float x, float lo, float hi) {
          float w = fwidth(x) * 0.75;
          return smoothstep(lo - w, lo + w, x) * (1.0 - smoothstep(hi - w, hi + w, x));
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vWin > 0.5) {
          vec3 n = normalize(cross(dFdx(vObjPos), dFdy(vObjPos)));
          if (abs(n.y) < 0.3) {
            vec2 along = normalize(vec2(-n.z, n.x));
            float u = dot(vObjPos.xz, along) / 3.3;
            float v = vObjPos.y / 3.0;
            float win = band(fract(u), 0.26, 0.74) * band(fract(v), 0.34, 0.80) * step(1.0, vObjPos.y);
            // glass: cool blue-grey with a hint of sky reflection towards the top
            vec3 glass = mix(vec3(0.24, 0.31, 0.37), vec3(0.55, 0.66, 0.74), fract(v) * 0.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.92);
            // thin frame line under each window row
            diffuseColor.rgb *= 1.0 - 0.18 * band(fract(v), 0.28, 0.32) * step(1.0, vObjPos.y);
          }
        }`,
      );
  };

  return { material, uniforms };
}
