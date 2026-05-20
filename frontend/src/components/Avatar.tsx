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
  const blinkTarget = useRef(0);

  useEffect(() => {
    blinkTarget.current = 2 + Math.random() * 3;
  }, []);
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
      const sway =
        emotion === 'thinking' ? 0.06 : emotion === 'happy' ? 0.05 : emotion === 'sad' ? 0.03 : 0.04;
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
  avatarSource?: 'default' | 'custom';
}

function Avatar({
  gender = 'feminine',
  isSpeaking = false,
  mouthAlpha = 0,
  emotion = 'neutral',
  avatarSource = 'default',
}: AvatarProps) {
  const [resolvedModelUrl, setResolvedModelUrl] = useState<string>(`/assets/avatar_${gender}.glb`);

  useEffect(() => {
    if (avatarSource === 'custom') {
      fetch('/api/v1/avatar/custom', { method: 'HEAD' })
        .then((r) => {
          if (r.ok) {
            setResolvedModelUrl('/api/v1/avatar/custom');
          } else {
            setResolvedModelUrl(`/assets/avatar_${gender}.glb`);
          }
        })
        .catch(() => {
          setResolvedModelUrl(`/assets/avatar_${gender}.glb`);
        });
    } else {
      const target = `/assets/avatar_${gender}.glb`;
      Promise.resolve().then(() => {
        setResolvedModelUrl(target);
      });
    }
  }, [avatarSource, gender]);

  const modelUrl = resolvedModelUrl;
  const animUrl = gender === 'feminine' ? FEMININE_IDLE : MASCULINE_IDLE;
  const fitMargin = gender === 'masculine' ? 1.5 : 1.35;
  const cameraY = gender === 'masculine' ? 0.08 : 0.05;
  const fitKey = `${modelUrl}|${animUrl}`;

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  if (isMobile) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-secondary)] relative overflow-hidden p-6"
        role="img"
        aria-label="Moderner 2D-Avatar Sprachassistent"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#2979ff]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#2979ff]/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-tr from-[var(--bg-primary)] to-[var(--bg-secondary)] border border-white/10 shadow-2xl">
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-[#2979ff]/50 animate-ping opacity-75" />
              <div className="absolute -inset-4 rounded-full border border-[#2979ff]/30 animate-pulse opacity-50" />
            </>
          )}
          
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-b from-[#2979ff]/20 to-[#2979ff]/5 flex items-center justify-center border border-[#2979ff]/20">
            <svg 
              className={`w-16 h-16 transition-all duration-300 ${isSpeaking ? 'text-[#2979ff] scale-110' : 'text-[var(--text-secondary)] scale-100'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </div>
        </div>

        <div className="mt-6 text-center z-10">
          <p className="text-sm font-semibold tracking-wide uppercase text-[#2979ff]">
            {isSpeaking ? 'Spricht...' : 'Bereit'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {emotion === 'thinking'
              ? 'Überlegt...'
              : emotion === 'happy'
                ? 'Fröhlich'
                : emotion === 'sad'
                  ? 'Nachdenklich'
                  : 'Professioneller Assistent'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      role="img"
      aria-label="Interaktiver 3D-Avatar Sprachassistent"
    >
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
