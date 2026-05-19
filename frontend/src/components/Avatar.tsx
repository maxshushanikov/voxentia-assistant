import React, { useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  useAnimations,
  OrbitControls,
  ContactShadows,
  Center,
  Bounds,
  useBounds,
} from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import type { AvatarEmotion } from '../types';

const FEMININE_IDLE = '/assets/idle/feminine/F_Talking_Variations_001.glb';
const MASCULINE_IDLE = '/assets/idle/masculine/M_Talking_Variations_001.glb';

/** Fit camera once per model — no re-fit on layout/resize (avoids jump on sidebar clicks). */
function FitOnce({ modelKey }: { modelKey: string }) {
  const bounds = useBounds();
  const lastKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (lastKey.current === modelKey) return;
    bounds.refresh().fit();
    lastKey.current = modelKey;
  }, [bounds, modelKey]);

  return null;
}

function pickIdleAction(
  actions: Record<string, THREE.AnimationAction | null>,
  isSpeaking: boolean,
): THREE.AnimationAction | null {
  const entries = Object.entries(actions).filter(([, a]) => a != null) as [
    string,
    THREE.AnimationAction,
  ][];
  if (entries.length === 0) return null;

  if (isSpeaking) {
    const talk = entries.filter(
      ([k]) =>
        k.toLowerCase().includes('talk') ||
        k.toLowerCase().includes('variat') ||
        k.toLowerCase().includes('speak'),
    );
    if (talk.length > 0) {
      const [, action] = talk[Math.floor(Math.random() * talk.length)];
      return action;
    }
  }

  const idle =
    entries.find(([k]) => /^idle$/i.test(k)) ??
    entries.find(([k]) => k.toLowerCase().includes('idle')) ??
    entries[0];
  return idle?.[1] ?? null;
}

function AvatarModel({
  url,
  animUrl,
  isSpeaking,
  mouthAlpha,
  emotion = 'neutral',
}: {
  url: string;
  animUrl: string;
  isSpeaking: boolean;
  mouthAlpha: number;
  emotion?: AvatarEmotion;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const { animations } = useGLTF(animUrl);

  const clone = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  const { actions } = useAnimations(animations, group);

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const blinkTarget = useRef(2 + Math.random() * 3);
  const morphMeshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    morphMeshes.current = [];
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetInfluences) {
        morphMeshes.current.push(child as THREE.Mesh);
      }
    });
  }, [clone]);

  useEffect(() => {
    if (!actions) return;

    Object.values(actions).forEach((a) => a?.fadeOut(0.5));

    const actionToPlay = pickIdleAction(actions, isSpeaking);

    if (actionToPlay) {
      actionToPlay.reset().fadeIn(0.5).play();
    }

    return () => {
      actionToPlay?.fadeOut(0.5);
    };
  }, [actions, isSpeaking]);

  useFrame((_, delta) => {
    blinkTimer.current += delta;
    if (blinkTimer.current >= blinkTarget.current) {
      setIsBlinking(true);
      if (blinkTimer.current >= blinkTarget.current + 0.15) {
        setIsBlinking(false);
        blinkTimer.current = 0;
        blinkTarget.current = 2 + Math.random() * 4;
      }
    }

    morphMeshes.current.forEach((mesh) => {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

      const dict = mesh.morphTargetDictionary;
      const influence = mesh.morphTargetInfluences;

      const mouthIdx =
        dict['mouthOpen'] ??
        dict['jawOpen'] ??
        dict['viseme_aa'] ??
        dict['MouthOpen'] ??
        dict['JawOpen'] ??
        dict['v_aa'];
      if (mouthIdx !== undefined) {
        influence[mouthIdx] = mouthAlpha;
      }

      const blinkIdx =
        dict['eyeBlinkLeft'] ?? dict['eyeBlinkRight'] ?? dict['blink'] ?? dict['EyeBlinkLeft'];
      if (blinkIdx !== undefined) {
        influence[blinkIdx] = isBlinking ? 1.0 : 0.0;
      }
    });

    if (group.current) {
      const time = performance.now() * 0.001;
      const sway = emotion === 'thinking' ? 0.06 : emotion === 'happy' ? 0.05 : 0.04;
      const breath = 1 + Math.sin(time * 1.2) * 0.012;
      group.current.rotation.y = Math.sin(time * 0.3) * sway;
      group.current.scale.setScalar(breath);
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload('/assets/avatar_feminine.glb');
useGLTF.preload('/assets/avatar_masculine.glb');
useGLTF.preload(FEMININE_IDLE);
useGLTF.preload(MASCULINE_IDLE);

interface AvatarProps {
  gender?: 'feminine' | 'masculine';
  isSpeaking?: boolean;
  mouthAlpha?: number;
  emotion?: AvatarEmotion;
}

function Avatar({
  gender = 'feminine',
  isSpeaking = false,
  mouthAlpha = 0,
  emotion = 'neutral',
}: AvatarProps) {
  const modelUrl = `/assets/avatar_${gender}.glb`;
  const animUrl = gender === 'feminine' ? FEMININE_IDLE : MASCULINE_IDLE;
  const fitMargin = gender === 'masculine' ? 1.5 : 1.35;
  const cameraY = gender === 'masculine' ? 0.08 : 0.05;
  const fitKey = `${modelUrl}|${animUrl}`;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#2979ff]/8 via-transparent to-transparent pointer-events-none" />

      <Canvas
        camera={{ position: [0, 0.15, 4.2], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        resize={{ debounce: 0, scroll: false }}
      >
        <ambientLight intensity={1.4} />
        <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <directionalLight position={[2, 4, 5]} intensity={1.5} />
        <directionalLight position={[-2, 3, -3]} intensity={0.5} color="#7777bb" />



        <React.Suspense fallback={null}>
          <Bounds fit clip margin={fitMargin} maxDuration={0}>
            <FitOnce modelKey={fitKey} />
            <Center>
              <AvatarModel
                key={modelUrl}
                url={modelUrl}
                animUrl={animUrl}
                isSpeaking={isSpeaking}
                mouthAlpha={mouthAlpha}
                emotion={emotion}
              />
            </Center>
          </Bounds>
        </React.Suspense>

        <ContactShadows position={[0, -0.05, 0]} opacity={0.55} scale={10} blur={2.5} far={4} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.2}
          maxPolarAngle={Math.PI / 1.85}
          target={[0, cameraY, 0]}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}

export default React.memo(Avatar);
