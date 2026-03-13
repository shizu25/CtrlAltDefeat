import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function ThreeAvatar({ isSpeaking }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const currentActionRef = useRef(null);
  const animationsRef = useRef({});
  const modelLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    console.log('[ThreeAvatar] Initializing with dimensions:', width, 'x', height);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera framing: pull back slightly and look a bit lower to avoid top clipping.
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.0, 6.8);
    camera.lookAt(0, 0.65, 0);

    // Renderer
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    console.log('[ThreeAvatar] Renderer created:', width, 'x', height);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    
    const keyLight = new THREE.DirectionalLight(0x8ab4f8, 1.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xa78bfa, 1.2, 12);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x34d399, 0.7, 10);
    rimLight.position.set(0, 5, -4);
    scene.add(rimLight);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0x080e1a, transparent: true, opacity: 0.6 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    console.log('[ThreeAvatar] Scene setup complete, loading model...');

    // Animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      renderer.render(scene, camera);
    };
    animate();

    // Load model
    const loader = new GLTFLoader();
    const modelUrl = 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
    
    loader.load(
      modelUrl,
      gltf => {
        console.log('[ThreeAvatar] Model loaded successfully');
        const model = gltf.scene;
        model.scale.set(0.82, 0.82, 0.82);
        model.position.set(0, -0.35, 0);
        
        model.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        
        scene.add(model);
        console.log('[ThreeAvatar] ✓ Model added to scene');

        // Setup animations
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;

        if (gltf.animations && gltf.animations.length > 0) {
          gltf.animations.forEach(clip => {
            animationsRef.current[clip.name] = mixer.clipAction(clip);
          });
          console.log('[ThreeAvatar] ✓ Animations loaded:', Object.keys(animationsRef.current));
        }

        modelLoadedRef.current = true;
        playAnimation('Idle', true);
      },
      xhr => {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        console.log('[ThreeAvatar] Loading:', percent + '%');
      },
      err => {
        console.error('[ThreeAvatar] Model load error:', err);
        buildFallback(scene);
        modelLoadedRef.current = true;
      }
    );

    const playAnimation = (name, loop = false) => {
      const animations = animationsRef.current;
      const target = animations[name] ? name : 'Idle';
      if (!animations[target]) {
        console.warn('[ThreeAvatar] Animation not found:', name);
        return;
      }

      const next = animations[target];
      if (currentActionRef.current && currentActionRef.current !== next) {
        currentActionRef.current.fadeOut(0.25);
      }

      next.reset();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
      next.clampWhenFinished = !loop;
      next.fadeIn(0.25).play();
      currentActionRef.current = next;
    };

    const playThenIdle = (name) => {
      playAnimation(name, false);
      setTimeout(() => playAnimation('Idle', true), 800);
    };

    // Click handler
    const handleClick = () => {
      if (modelLoadedRef.current) {
        playThenIdle('Wave');
      }
    };
    canvas.addEventListener('click', handleClick);

    // Resize handler
    const handleResize = () => {
      if (!container || !container.parentElement) return;
      const w = Math.max(container.clientWidth || 400, 1);
      const h = Math.max(container.clientHeight || 400, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Expose playAnimation to ref
    sceneRef.current.userData.playAnimation = playAnimation;

    console.log('[ThreeAvatar] Setup complete, animation loop started');

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      renderer.dispose();
    };
  }, []);

  // Handle isSpeaking
  useEffect(() => {
    if (!sceneRef.current?.userData?.playAnimation) return;
    const playAnimation = sceneRef.current.userData.playAnimation;
    if (isSpeaking) {
      playAnimation('Yes', true);
    } else {
      playAnimation('Idle', true);
    }
  }, [isSpeaking]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    />
  );
}

function buildFallback(scene) {
  const g = new THREE.Group();

  const headMat = new THREE.MeshStandardMaterial({
    color: 0x1a2f50,
    metalness: 0.8,
    roughness: 0.15,
  });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.65), headMat);
  head.position.y = 1.65;
  head.castShadow = true;
  g.add(head);

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0a1525,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.9,
  });
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.05), visorMat);
  visor.position.set(0, 1.68, 0.35);
  g.add(visor);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x4f8ef7,
    emissive: 0x4f8ef7,
    emissiveIntensity: 3,
  });
  const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.02), eyeMat);
  eye1.position.set(-0.14, 1.72, 0.38);
  g.add(eye1);
  const eye2 = eye1.clone();
  eye2.position.x = 0.14;
  g.add(eye2);

  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x34d399,
    emissiveIntensity: 2,
  });
  for (let i = 0; i < 4; i++) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), mouthMat);
    dot.position.set(-0.09 + i * 0.06, 1.57, 0.38);
    g.add(dot);
  }

  const antMat = new THREE.MeshStandardMaterial({
    color: 0xa78bfa,
    metalness: 0.9,
    roughness: 0.1,
  });
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), antMat);
  ant.position.set(0, 2.18, 0);
  g.add(ant);
  const antBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0xa78bfa,
      emissiveIntensity: 3,
    })
  );
  antBall.position.set(0, 2.38, 0);
  g.add(antBall);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x152035,
    metalness: 0.7,
    roughness: 0.2,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.55), bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  g.add(body);

  const chestLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.18, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x4f8ef7,
      emissive: 0x4f8ef7,
      emissiveIntensity: 1,
    })
  );
  chestLight.position.set(0, 0.95, 0.3);
  g.add(chestLight);

  const armMat = new THREE.MeshStandardMaterial({
    color: 0x1a2f50,
    metalness: 0.7,
    roughness: 0.2,
  });
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.65, 12), armMat);
    arm.position.set(side * 0.55, 0.85, 0);
    arm.rotation.z = side * 0.15;
    arm.castShadow = true;
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), armMat);
    hand.position.set(side * 0.62, 0.52, 0);
    g.add(hand);
  });

  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.6, 12), armMat);
    leg.position.set(side * 0.22, 0.3, 0);
    leg.castShadow = true;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.35), armMat);
    foot.position.set(side * 0.22, -0.02, 0.05);
    g.add(foot);
  });

  scene.add(g);
  console.log('[ThreeAvatar] ✓ Fallback avatar created');
}
