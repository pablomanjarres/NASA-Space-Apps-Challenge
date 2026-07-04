import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Stars, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// Deep-space observatory scene. Recolored to the unified cosmic palette:
//   void (base)  ·  nebula violet  ·  stellar cyan (accent)  ·  ink/white.
// Warm signal amber is deliberately absent here so it stays scarce for the CTA.
// A cool blue-white central star (hot-star / ion-drive read) keeps it NASA-grade
// rather than cartoonish. Motion is calm and honors prefers-reduced-motion.
// ============================================================================

// palette (token hexes — kept in sync with global.css / tailwind.config.mjs)
const VOID_500 = '#243156';
const VOID_600 = '#1a2440';
const NEBULA_400 = '#a78bfa';
const NEBULA_500 = '#8b5cf6';
const NEBULA_600 = '#7c5cf0';
const NEBULA_700 = '#5b4bd6';
const STELLAR_200 = '#a5f0fb';
const STELLAR_300 = '#67e8f9';
const STELLAR_400 = '#22d3ee';
const INK = '#e8ecf8';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Central star — cool blue-white core with restrained stellar/nebula glow
function Star() {
  const starRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const reduced = prefersReducedMotion();

  useFrame((state) => {
    if (reduced) return;
    if (starRef.current) {
      starRef.current.rotation.y += 0.001;
      starRef.current.rotation.x += 0.0005;
    }
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 0.5) * 0.2 + 1;
      glowRef.current.scale.setScalar(pulse);
    }
    if (!isMobile) {
      if (outerGlowRef.current) {
        const pulse = Math.sin(state.clock.elapsedTime * 0.3) * 0.15 + 1;
        outerGlowRef.current.scale.setScalar(pulse);
        outerGlowRef.current.rotation.z += 0.0015;
      }
      if (coronaRef.current) {
        coronaRef.current.rotation.y += 0.0025;
        const pulse = Math.sin(state.clock.elapsedTime * 0.7) * 0.12 + 1;
        coronaRef.current.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group>
      {/* Outermost glow — faint nebula halo (desktop only) */}
      {!isMobile && (
        <Sphere ref={outerGlowRef} args={[4, 24, 24]} position={[0, 0, 0]}>
          <meshBasicMaterial
            color={NEBULA_500}
            transparent
            opacity={0.05}
          />
        </Sphere>
      )}

      {/* Corona layer — stellar cyan (desktop only) */}
      {!isMobile && (
        <Sphere ref={coronaRef} args={[3, 24, 24]} position={[0, 0, 0]}>
          <meshBasicMaterial
            color={STELLAR_400}
            transparent
            opacity={0.08}
          />
        </Sphere>
      )}

      {/* Middle glow — stellar */}
      <Sphere ref={glowRef} args={[2.5, isMobile ? 24 : 32, isMobile ? 24 : 32]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color={STELLAR_300}
          transparent
          opacity={0.14}
        />
      </Sphere>

      {/* Main star — cool blue-white hot core */}
      <Sphere ref={starRef} args={[1.5, isMobile ? 32 : 64, isMobile ? 32 : 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          emissive={STELLAR_300}
          emissiveIntensity={2.2}
          color={STELLAR_200}
          distort={isMobile ? 0.2 : 0.35}
          speed={2}
          roughness={0.15}
        />
      </Sphere>

      {/* Point light from the star — stellar tint */}
      <pointLight position={[0, 0, 0]} intensity={3} distance={50} color={STELLAR_300} />
    </group>
  );
}

// Exoplanet component with enhanced textures
interface ExoplanetProps {
  distance: number;
  size: number;
  speed: number;
  color: string;
  tilt?: number;
  type?: 'rocky' | 'gas' | 'ice';
}

function Exoplanet({ distance, size, speed, color, tilt = 0, type = 'rocky' }: ExoplanetProps) {
  const planetRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const reduced = prefersReducedMotion();

  useFrame(() => {
    if (reduced) return;
    if (orbitRef.current) {
      orbitRef.current.rotation.y += speed;
    }
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.01;
      planetRef.current.rotation.x += 0.002;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= 0.005;
    }
  });

  // Create orbit ring with enhanced styling
  const orbitRing = useMemo(() => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      distance, distance,
      0, 2 * Math.PI,
      false,
      0
    );
    const points = curve.getPoints(128);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [distance]);

  // Texture generation for planet surface
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Base color
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 512, 512);

      // Add texture details based on planet type
      if (type === 'rocky') {
        // Craters and rocky surface
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = Math.random() * 20 + 5;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
          ctx.fill();
        }
      } else if (type === 'gas') {
        // Gas bands
        for (let i = 0; i < 512; i += 20) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
          ctx.fillRect(0, i, 512, 10 + Math.random() * 20);
        }
      } else if (type === 'ice') {
        // Ice cracks
        for (let i = 0; i < 30; i++) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
          ctx.lineWidth = Math.random() * 3;
          ctx.beginPath();
          ctx.moveTo(Math.random() * 512, Math.random() * 512);
          ctx.lineTo(Math.random() * 512, Math.random() * 512);
          ctx.stroke();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [color, type]);

  return (
    <group ref={orbitRef} rotation={[tilt, 0, 0]}>
      {/* Orbit ring — faint stellar telemetry line */}
      <line geometry={orbitRing} rotation={[Math.PI / 2, 0, 0]}>
        <lineBasicMaterial attach="material" color={STELLAR_400} opacity={0.16} transparent />
      </line>
      {/* Second orbit ring for depth — faint nebula */}
      <line geometry={orbitRing} rotation={[Math.PI / 2, 0, 0]}>
        <lineBasicMaterial attach="material" color={NEBULA_400} opacity={0.09} transparent />
      </line>

      {/* Planet with atmosphere */}
      <group position={[distance, 0, 0]}>
        {/* Atmosphere glow */}
        <Sphere ref={atmosphereRef} args={[size * 1.15, 32, 32]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.14}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* Main planet with texture */}
        <Sphere ref={planetRef} args={[size, 64, 64]}>
          <meshStandardMaterial
            map={texture}
            color={color}
            roughness={0.8}
            metalness={0.2}
            bumpScale={0.05}
          />
        </Sphere>
      </group>
    </group>
  );
}

// Rocket component with engine glow and trail (refined: instrument-white body,
// cool ion-drive engine glow)
interface RocketProps {
  delay: number;
  direction: 'left' | 'right';
}

function Rocket({ delay, direction }: RocketProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rocketRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Line>(null);
  const [startTime] = useState(() => Date.now() + delay * 1000);
  const [trailPoints] = useState<THREE.Vector3[]>([]);
  const maxTrailLength = 120;
  const reduced = prefersReducedMotion();

  const calculatePosition = (progress: number) => {
    const t = progress * Math.PI * 2;
    const directionMultiplier = direction === 'left' ? -1 : 1;

    // Smooth curved path
    const pathRadius = 18;
    const x = Math.sin(t * 0.8) * pathRadius * directionMultiplier;
    const y = Math.sin(t * 1.2) * 5 + 2;
    const z = -Math.cos(t * 0.8) * 20 + 8;

    return new THREE.Vector3(x, y, z);
  };

  useFrame((state) => {
    if (reduced) return;
    if (!groupRef.current) return;

    const elapsed = (Date.now() - startTime) / 1000;
    const orbitDuration = 30;
    const progress = (elapsed % orbitDuration) / orbitDuration;

    const position = calculatePosition(progress);
    const nextPosition = calculatePosition(progress + 0.001);

    groupRef.current.position.copy(position);

    // Point rocket in direction of travel
    groupRef.current.lookAt(nextPosition);

    // Add to trail
    trailPoints.push(position.clone());
    if (trailPoints.length > maxTrailLength) {
      trailPoints.shift();
    }

    // Update trail
    if (trailRef.current && trailPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
      trailRef.current.geometry.dispose();
      trailRef.current.geometry = geometry;
    }

    // Slight rotation
    if (rocketRef.current) {
      rocketRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <>
      {/* Rocket trail — cool ion exhaust */}
      <line ref={trailRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={STELLAR_400}
          transparent
          opacity={0.4}
          linewidth={2}
        />
      </line>

      {/* Rocket group */}
      <group ref={groupRef}>
        <group ref={rocketRef}>
          {/* Rocket body - cone */}
          <mesh position={[0, 0, 0.4]}>
            <coneGeometry args={[0.15, 0.6, 8]} />
            <meshStandardMaterial
              color={INK}
              metalness={0.8}
              roughness={0.25}
              emissive={VOID_500}
              emissiveIntensity={0.2}
            />
          </mesh>

          {/* Rocket nose - tip */}
          <mesh position={[0, 0, 0.85]}>
            <coneGeometry args={[0.08, 0.3, 8]} />
            <meshStandardMaterial
              color={STELLAR_300}
              metalness={0.6}
              roughness={0.3}
              emissive={STELLAR_400}
              emissiveIntensity={0.4}
            />
          </mesh>

          {/* Wings */}
          {[0, 120, 240].map((angle, i) => (
            <mesh
              key={i}
              position={[
                Math.cos((angle * Math.PI) / 180) * 0.12,
                Math.sin((angle * Math.PI) / 180) * 0.12,
                0.2
              ]}
              rotation={[0, 0, (angle * Math.PI) / 180]}
            >
              <boxGeometry args={[0.25, 0.02, 0.3]} />
              <meshStandardMaterial
                color={NEBULA_500}
                metalness={0.7}
                roughness={0.3}
                emissive={NEBULA_700}
                emissiveIntensity={0.3}
              />
            </mesh>
          ))}

          {/* Engine glow */}
          <mesh position={[0, 0, -0.1]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial
              color={STELLAR_400}
              transparent
              opacity={0.5}
            />
          </mesh>

          {/* Engine plume */}
          <mesh position={[0, 0, -0.3]}>
            <coneGeometry args={[0.12, 0.4, 8]} />
            <meshBasicMaterial
              color={STELLAR_300}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Point light for engine */}
          <pointLight position={[0, 0, -0.2]} intensity={1.5} distance={3} color={STELLAR_400} />
        </group>
      </group>
    </>
  );
}

// Orbiting Asteroid that passes by the camera with trail
interface OrbitingAsteroidProps {
  delay: number;
  direction: 'left' | 'right';
}

function OrbitingAsteroid({ delay, direction }: OrbitingAsteroidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const asteroidRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);
  const [startTime] = useState(() => Date.now() + delay * 1000);
  const [trailPoints] = useState<THREE.Vector3[]>([]);
  const maxTrailLength = 80;
  const reduced = prefersReducedMotion();

  // Create asteroid texture with rocky surface
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Neutral slate-rock base tones (cool grey, sits within the void palette)
      const baseColors = ['#8b93a8', '#7c8494', '#9098ab', '#767e94', '#6d7488'];
      const baseColor = baseColors[Math.floor(Math.random() * baseColors.length)];

      // Create gradient for depth
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#aab2c6');
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, '#4a5270');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add craters and surface details
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 30 + 5;

        // Crater
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.5 + 0.3})`;
        ctx.fill();

        // Crater rim highlight
        ctx.beginPath();
        ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
        ctx.fill();
      }

      // Add rocks and surface irregularities
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 8 + 2;
        ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${105 + Math.random() * 50}, ${125 + Math.random() * 50}, 0.4)`;
        ctx.fillRect(x, y, size, size);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  // Smoother movement calculation
  const calculatePosition = (progress: number) => {
    // Simplified wave patterns for smoother, less erratic movement
    const t = progress * Math.PI * 2;
    const directionMultiplier = direction === 'left' ? -1 : 1;

    // Gentle curved path with minimal variation
    const spiralRadius = 12;
    const x = Math.sin(t * 0.8) * spiralRadius * directionMultiplier;
    const y = Math.sin(t * 0.9) * 3;
    const z = -Math.cos(t * 0.8) * 15 + 5;

    return new THREE.Vector3(x, y, z);
  };

  useFrame(() => {
    if (reduced) return;
    if (!groupRef.current) return;

    const elapsed = (Date.now() - startTime) / 1000;

    // Duration of one complete orbit (in seconds) - increased for slower movement
    const orbitDuration = 40;

    // Calculate progress (0 to 1, then loops)
    const progress = (elapsed % orbitDuration) / orbitDuration;

    // Get exotic position
    const position = calculatePosition(progress);
    groupRef.current.position.copy(position);

    // Add current position to trail
    trailPoints.push(position.clone());
    if (trailPoints.length > maxTrailLength) {
      trailPoints.shift();
    }

    // Update trail geometry
    if (trailRef.current && trailPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
      trailRef.current.geometry.dispose();
      trailRef.current.geometry = geometry;
    }

    // Rotate asteroid with gentle tumbling motion
    if (asteroidRef.current) {
      asteroidRef.current.rotation.y += 0.01;
      asteroidRef.current.rotation.x += 0.008;
      asteroidRef.current.rotation.z += 0.005;
    }
  });

  return (
    <>
      {/* Trail line — faint dust trail */}
      <line ref={trailRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#8b93a8"
          transparent
          opacity={0.35}
          linewidth={1}
        />
      </line>

      {/* Asteroid group */}
      <group ref={groupRef}>
        {/* Asteroid with irregular shape using icosahedron */}
        <mesh ref={asteroidRef}>
          <icosahedronGeometry args={[0.4, 1]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.9}
            metalness={0.05}
            bumpMap={texture}
            bumpScale={0.08}
            color="#9098ab"
          />
        </mesh>

        {/* Small debris particles around asteroid */}
        {[...Array(5)].map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          const radius = 0.6;
          return (
            <mesh key={i} position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 1.5) * 0.3,
              Math.sin(angle) * radius
            ]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial
                color="#7c8494"
                roughness={0.95}
                metalness={0.05}
              />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

// Shooting Star component
function ShootingStar({ delay }: { delay: number }) {
  const lineRef = useRef<THREE.Line>(null);
  const [startTime] = useState(() => Date.now() + delay * 1000);
  const [trailPoints] = useState<THREE.Vector3[]>([]);
  const maxTrailLength = 40;

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const duration = 5; // Each shooting star lasts 5 seconds (slower)
    const cycleDuration = 20; // New shooting star every 20 seconds

    const cycleTime = elapsed % cycleDuration;

    if (cycleTime < duration) {
      const progress = cycleTime / duration;

      // Shooting star trajectory - diagonal across view
      const startX = -30 + Math.random() * 20;
      const startY = 10 + Math.random() * 10;
      const startZ = -20 + Math.random() * 10;

      const x = startX + progress * 60;
      const y = startY - progress * 15;
      const z = startZ + progress * 20;

      const position = new THREE.Vector3(x, y, z);

      trailPoints.push(position);
      if (trailPoints.length > maxTrailLength) {
        trailPoints.shift();
      }
    } else {
      // Clear trail between shooting stars
      trailPoints.length = 0;
    }

    if (lineRef.current && trailPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
      lineRef.current.geometry.dispose();
      lineRef.current.geometry = geometry;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        color={STELLAR_200}
        transparent
        opacity={0.7}
        linewidth={3}
      />
    </line>
  );
}

// Main Space Scene
export default function SpaceScene() {
  // Detect if mobile device for performance optimization
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const reduced = prefersReducedMotion();

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.35} />

      {/* Point light from star — stellar tint */}
      <pointLight position={[0, 0, 0]} intensity={2.6} distance={40} color={STELLAR_300} />

      {/* Additional directional lighting for better visibility */}
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />

      {/* Starfield background — calm, near-white, the centerpiece of the scene */}
      <Stars
        radius={100}
        depth={50}
        count={isMobile ? 5000 : 15000}
        factor={6}
        saturation={0}
        fade
        speed={reduced ? 0 : 1}
      />
      {/* Sparse foreground twinkle layer with a faint cool tint — desktop only */}
      {!isMobile && (
        <Stars
          radius={150}
          depth={80}
          count={5000}
          factor={8}
          saturation={0.2}
          fade={false}
          speed={reduced ? 0 : 0.4}
        />
      )}

      {/* Central star with pulsing glow */}
      <Star />

      {/* Exoplanets — cohesive void / nebula / stellar tones (reduced on mobile) */}
      <Exoplanet distance={3} size={0.3} speed={0.009} color={VOID_500} tilt={0.1} type="rocky" />
      <Exoplanet distance={4.5} size={0.4} speed={0.007} color={NEBULA_700} tilt={0.05} type="rocky" />
      <Exoplanet distance={6} size={0.55} speed={0.005} color={NEBULA_500} tilt={-0.15} type="gas" />
      <Exoplanet distance={7.5} size={0.35} speed={0.004} color={VOID_500} tilt={0.2} type="rocky" />
      {!isMobile && (
        <>
          <Exoplanet distance={9} size={0.6} speed={0.0025} color={NEBULA_600} tilt={-0.1} type="gas" />
          <Exoplanet distance={10.5} size={0.32} speed={0.002} color={STELLAR_300} tilt={0.25} type="ice" />
          <Exoplanet distance={12} size={0.38} speed={0.0015} color={VOID_600} tilt={-0.2} type="rocky" />
          <Exoplanet distance={14} size={0.5} speed={0.001} color={NEBULA_500} tilt={0.15} type="gas" />
          <Exoplanet distance={15.5} size={0.28} speed={0.0008} color={STELLAR_200} tilt={-0.25} type="ice" />
        </>
      )}

      {/* Moving elements — omitted entirely under reduced motion for a calm scene */}
      {!reduced && (
        <>
          {/* Animated asteroids - reduced on mobile */}
          <OrbitingAsteroid delay={0} direction="left" />
          {!isMobile && (
            <>
              <OrbitingAsteroid delay={7} direction="right" />
              <OrbitingAsteroid delay={14} direction="left" />
            </>
          )}

          {/* Shooting stars - reduced on mobile */}
          <ShootingStar delay={0} />
          {!isMobile && (
            <>
              <ShootingStar delay={5} />
              <ShootingStar delay={10} />
            </>
          )}
        </>
      )}
    </>
  );
}
