import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Create an inner component for the actual avatar logic
function AvatarModel({ url, isSpeaking, mouthAlpha, gender }: { url: string, isSpeaking: boolean, mouthAlpha: number, gender: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  
  // Load animations from a separate file
  const animUrl = gender === 'feminine' 
    ? '/assets/idle/feminine/F_Talking_Variations_001.glb'
    : '/assets/idle/masculine/M_Talking_Variations_001.glb';
  
  const { animations: anims } = useGLTF(animUrl);
  const { actions } = useAnimations(anims, group);
  
  // States for autonomous blinking
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const blinkTarget = useRef(2 + Math.random() * 3);

  // Setup morph targets
  const morphMeshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    morphMeshes.current = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetInfluences) {
        morphMeshes.current.push(child as THREE.Mesh);
      }
    });
  }, [scene]);

  // Handle Animations (Idle vs Speaking)
  useEffect(() => {
    if (!actions) return;

    // Stop all current animations
    Object.values(actions).forEach(a => a?.fadeOut(0.5));

    let actionToPlay: THREE.AnimationAction | null = null;

    if (isSpeaking) {
      // Pick a random talking variation
      const talkKeys = Object.keys(actions).filter(k => k.toLowerCase().includes('talk') || k.toLowerCase().includes('variat'));
      if (talkKeys.length > 0) {
        const key = talkKeys[Math.floor(Math.random() * talkKeys.length)];
        actionToPlay = actions[key];
      }
    }

    // Fallback to idle (usually the first clip or specifically named)
    if (!actionToPlay) {
      actionToPlay = actions['idle'] || actions['Idle'] || Object.values(actions)[0];
    }

    if (actionToPlay) {
      actionToPlay.reset().fadeIn(0.5).play();
    }

    return () => {
      actionToPlay?.fadeOut(0.5);
    };
  }, [actions, isSpeaking]);

  // Update loop for morph targets and blinking
  useFrame((state, delta) => {
    // Blinking logic
    blinkTimer.current += delta;
    if (blinkTimer.current >= blinkTarget.current) {
      setIsBlinking(true);
      if (blinkTimer.current >= blinkTarget.current + 0.15) { // blink duration
        setIsBlinking(false);
        blinkTimer.current = 0;
        blinkTarget.current = 2 + Math.random() * 4;
      }
    }

    // Apply morph targets
    morphMeshes.current.forEach(mesh => {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

      const dict = mesh.morphTargetDictionary;
      const influence = mesh.morphTargetInfluences;

      // Mouth opening for lip-sync
      const mouthIdx = dict['mouthOpen'] || dict['jawOpen'] || dict['viseme_aa'] || dict['MouthOpen'] || dict['JawOpen'] || dict['v_aa'];
      if (mouthIdx !== undefined) {
        influence[mouthIdx] = mouthAlpha;
      }

      // Blinking
      const blinkIdx = dict['eyeBlinkLeft'] || dict['eyeBlinkRight'] || dict['blink'] || dict['EyeBlinkLeft'];
      if (blinkIdx !== undefined) {
        influence[blinkIdx] = isBlinking ? 1.0 : 0.0;
      }
    });

    // Gentle natural sway if not moving much
    if (group.current) {
      const time = state.clock.getElapsedTime();
      group.current.position.y = Math.sin(time * 0.5) * 0.01;
      group.current.rotation.y = Math.sin(time * 0.3) * 0.05;
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={[1.2, 1.2, 1.2]} position={[0, -1.2, 0]} />
    </group>
  );
}

// Preload standard feminine variation to prevent delay
useGLTF.preload('/assets/avatar_feminine.glb');

interface AvatarProps {
  gender?: 'feminine' | 'masculine';
  isSpeaking?: boolean;
  mouthAlpha?: number;
}

export default function Avatar({ 
  gender = 'feminine', 
  isSpeaking = false, 
  mouthAlpha = 0
}: AvatarProps) {
  
  const modelUrl = `/assets/avatar_${gender}.glb`;

  return (
    <div className="w-full h-full relative">
      {/* Background ambient glow */}
      <div className="w-[600px] h-[1000px] bg-gradient-to-t from-[#2979ff]/10 to-transparent opacity-40 rounded-full blur-3xl absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"></div>
      
      <Canvas 
        camera={{ position: [0, 1.2, 4], fov: 30 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        className="w-full h-full"
      >
        <ambientLight intensity={1.5} />
        <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <directionalLight position={[2, 4, 5]} intensity={1.5} />
        <directionalLight position={[-2, 3, -3]} intensity={0.5} color="#7777bb" />
        
        <Environment preset="city" />
        
        <ContactShadows position={[0, -1.2, 0]} opacity={0.6} scale={8} blur={2} />

        <React.Suspense fallback={null}>
          <AvatarModel 
            url={modelUrl} 
            isSpeaking={isSpeaking} 
            mouthAlpha={mouthAlpha}
            gender={gender}
          />
        </React.Suspense>

        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minPolarAngle={Math.PI / 2.2}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 0.5, 0]}
        />
      </Canvas>
    </div>
  );
}
