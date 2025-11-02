import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, X, ZoomIn, ZoomOut, Info, Loader } from 'lucide-react';
import * as THREE from 'three';

// Gallery data configuration - replace with your own images
const galleryData = [
  {
    name: "Watching Waves",
    images: [
      { path: '/gallery/WatchingWaves/crash.jpg', name: 'Crash' },
      { path: '/gallery/WatchingWaves/erosion.jpg', name: 'Erosion' },
      { path: '/gallery/WatchingWaves/fall.jpg', name: 'Fall' },
      { path: '/gallery/WatchingWaves/floating.jpg', name: 'Floating' },
      { path: '/gallery/WatchingWaves/ice.jpg', name: 'Ice' },
      { path: '/gallery/WatchingWaves/octo.jpg', name: 'Octopussy' },
      { path: '/gallery/WatchingWaves/reflection.jpg', name: 'Reflection' },
      { path: '/gallery/WatchingWaves/greatWave.jpg', name: 'Great Wave' },
      { path: '/gallery/WatchingWaves/niagaraFalls.jpg', name: 'Niagara Falls' },
      { path: '/gallery/WatchingWaves/mountains.jpg', name: 'Mountain Range' },
    ]
  },
  {
    name: "Coloring Book",
    images: [
      { path: '/gallery/ColoringBook/hydrangeas.jpg', name: 'Hydrangeas' },
      { path: '/gallery/ColoringBook/jellyfishes.jpg', name: 'Jellyfishes' },
      { path: '/gallery/ColoringBook/lalQila.jpg', name: 'Lal Qila' },
      { path: '/gallery/ColoringBook/lotus.jpg', name: 'Lotus' },
      { path: '/gallery/ColoringBook/Owl.jpg', name: 'Owl' },
      { path: '/gallery/ColoringBook/rose.jpg', name: 'Rose' },
      { path: '/gallery/ColoringBook/sara.jpg', name: 'Girl' },
      { path: '/gallery/ColoringBook/violet.jpg', name: 'Violet' },
      { path: '/gallery/ColoringBook/cherryBlossoms.jpg', name: 'Cherry Blossoms' },
      { path: '/gallery/ColoringBook/love.jpg', name: 'Best Friends' },
    ]
  },
  {
    name: "That Which Remains",
    images: [
      { path: '/gallery/Misc/aspen.jpg', name: 'Aspen' },
      { path: '/gallery/Misc/bird.jpg', name: 'Bird' },
      { path: '/gallery/Misc/crazy.jpg', name: 'Crazy' },
      { path: '/gallery/Misc/eternalDance.jpg', name: 'Eternal Dance' },
      { path: '/gallery/Misc/heart.jpg', name: 'Heart' },
      { path: '/gallery/Misc/mangoes.jpg', name: 'Mangoes' },
      { path: '/gallery/Misc/mural.jpg', name: 'Mural' },
      { path: '/gallery/Misc/chick.jpg', name: 'Pretty Woman' },
      { path: '/gallery/Misc/old.jpg', name: 'Old' },
      { path: '/gallery/Misc/sumo.jpg', name: 'Sumo Wrestler' },
      { path: '/gallery/Misc/vase.jpg', name: 'Vase' },
    ]
  }
];

const InteractiveGallery = () => {
  const [currentFloor, setCurrentFloor] = useState(0);
  const [selectedPainting, setSelectedPainting] = useState(null);
  const [detailZoom, setDetailZoom] = useState(1);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const paintingsRef = useRef([]);
  const lightsRef = useRef([]);
  const moveStateRef = useRef({ forward: false, backward: false, left: false, right: false });
  const mouseStateRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const rotationRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const loadGalleryImages = async () => {
      try {
        setLoading(true);
        
        const floorsWithDimensions = await Promise.all(
          galleryData.map(async (floor) => {
            const imagesWithDimensions = await Promise.all(
              floor.images.map(async (img) => {
                try {
                  const dimensions = await loadImageDimensions(img.path);
                  return {
                    ...img,
                    width: dimensions.width,
                    height: dimensions.height,
                    aspectRatio: dimensions.width / dimensions.height,
                    usePlaceholder: false
                  };
                } catch (err) {
                  console.warn(`Failed to load ${img.path}, using placeholder`);
                  const randomAspect = 0.6 + Math.random() * 0.6;
                  return {
                    ...img,
                    width: 800,
                    height: 800 / randomAspect,
                    aspectRatio: randomAspect,
                    usePlaceholder: true
                  };
                }
              })
            );

            return {
              ...floor,
              images: imagesWithDimensions
            };
          })
        );

        setFloors(floorsWithDimensions);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadGalleryImages();
  }, []);

  const loadImageDimensions = (path) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = path;
    });
  };

  const distributePaintingsOnWalls = (images) => {
    const walls = ['north', 'east', 'south', 'west'];
    const paintings = [];

    const maxDisplayHeight = 2.5;
    const normalizedImages = images.map(img => {
      const displayHeight = Math.min(maxDisplayHeight, img.height / 400);
      const displayWidth = displayHeight * img.aspectRatio;
      return {
        ...img,
        displayWidth,
        displayHeight
      };
    });

    const imagesPerWall = Math.ceil(normalizedImages.length / 4);
    
    walls.forEach((wall, wallIndex) => {
      const wallImages = normalizedImages.slice(
        wallIndex * imagesPerWall,
        (wallIndex + 1) * imagesPerWall
      );

      if (wallImages.length === 0) return;

      const spacing = 0.5;
      const totalWidth = wallImages.reduce((sum, img) => sum + img.displayWidth, 0) + 
                        (wallImages.length - 1) * spacing;
      
      let currentX = -totalWidth / 2;

      wallImages.forEach((img) => {
        const x = currentX + img.displayWidth / 2;
        currentX += img.displayWidth + spacing;

        let position;
        if (wall === 'north') {
          position = { x, y: 1.8, z: -9.8 };
        } else if (wall === 'south') {
          position = { x: -x, y: 1.8, z: 9.8 };
        } else if (wall === 'east') {
          position = { x: 9.8, y: 1.8, z: x };
        } else {
          position = { x: -9.8, y: 1.8, z: -x };
        }

        paintings.push({
          ...img,
          wall,
          ...position
        });
      });
    });

    return paintings;
  };

  useEffect(() => {
    if (!mountRef.current || floors.length === 0) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    scene.fog = new THREE.Fog(0xf5f5f5, 15, 30);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main ceiling light
    const mainLight = new THREE.SpotLight(0xffffff, 1.0);
    mainLight.position.set(0, 5, 0);
    mainLight.angle = Math.PI / 3;
    mainLight.penumbra = 0.5;
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 15;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // Additional ceiling lights
    const light2 = new THREE.SpotLight(0xffffff, 0.4);
    light2.position.set(5, 5, 5);
    light2.castShadow = true;
    scene.add(light2);

    const light3 = new THREE.SpotLight(0xffffff, 0.4);
    light3.position.set(-5, 5, -5);
    light3.castShadow = true;
    scene.add(light3);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorTexture = createWoodTexture();
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0
    });

    const northWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 4),
      wallMaterial
    );
    northWall.position.set(0, 2, -10);
    northWall.receiveShadow = true;
    scene.add(northWall);

    const southWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 4),
      wallMaterial
    );
    southWall.position.set(0, 2, 10);
    southWall.rotation.y = Math.PI;
    southWall.receiveShadow = true;
    scene.add(southWall);

    const eastWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 4),
      wallMaterial
    );
    eastWall.position.set(10, 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    eastWall.receiveShadow = true;
    scene.add(eastWall);

    const westWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 4),
      wallMaterial
    );
    westWall.position.set(-10, 2, 0);
    westWall.rotation.y = Math.PI / 2;
    westWall.receiveShadow = true;
    scene.add(westWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(20, 20);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    ceiling.receiveShadow = true;
    scene.add(ceiling);

    const paintings = distributePaintingsOnWalls(floors[currentFloor].images);
    createPaintings(scene, paintings);
    createGalleryLights(scene, paintings);

    // Raycaster for clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      if (mouseStateRef.current.isDragging) return;
      if (event.target.closest('button')) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(paintingsRef.current);

      if (intersects.length > 0) {
        const painting = intersects[0].object.userData.painting;
        if (painting) {
          setSelectedPainting(painting);
          setDetailZoom(1);
        }
      }
    };

    const onMouseDown = (event) => {
      if (event.target.closest('button')) return;
      mouseStateRef.current.isDragging = true;
      mouseStateRef.current.lastX = event.clientX;
      mouseStateRef.current.lastY = event.clientY;
    };

    const onMouseMove = (event) => {
      if (!mouseStateRef.current.isDragging) return;

      const deltaX = event.clientX - mouseStateRef.current.lastX;
      const deltaY = event.clientY - mouseStateRef.current.lastY;

      rotationRef.current.yaw -= deltaX * 0.003;
      rotationRef.current.pitch -= deltaY * 0.003;
      rotationRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.pitch));

      mouseStateRef.current.lastX = event.clientX;
      mouseStateRef.current.lastY = event.clientY;
    };

    const onMouseUp = () => {
      mouseStateRef.current.isDragging = false;
    };

    const onKeyDown = (event) => {
      switch(event.key.toLowerCase()) {
        case 'w': moveStateRef.current.forward = true; break;
        case 's': moveStateRef.current.backward = true; break;
        case 'a': moveStateRef.current.left = true; break;
        case 'd': moveStateRef.current.right = true; break;
        case 'arrowleft': rotationRef.current.yaw += 0.05; break;
        case 'arrowright': rotationRef.current.yaw -= 0.05; break;
        case 'arrowup': rotationRef.current.pitch = Math.min(rotationRef.current.pitch + 0.05, Math.PI / 3); break;
        case 'arrowdown': rotationRef.current.pitch = Math.max(rotationRef.current.pitch - 0.05, -Math.PI / 3); break;
      }
    };

    const onKeyUp = (event) => {
      switch(event.key.toLowerCase()) {
        case 'w': moveStateRef.current.forward = false; break;
        case 's': moveStateRef.current.backward = false; break;
        case 'a': moveStateRef.current.left = false; break;
        case 'd': moveStateRef.current.right = false; break;
      }
    };

    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      camera.rotation.y = rotationRef.current.yaw;
      camera.rotation.x = rotationRef.current.pitch;

      const moveSpeed = 0.1;
      const direction = new THREE.Vector3();
      
      if (moveStateRef.current.forward) {
        direction.x += Math.sin(rotationRef.current.yaw) * moveSpeed;
        direction.z -= Math.cos(rotationRef.current.yaw) * moveSpeed;
      }
      if (moveStateRef.current.backward) {
        direction.x -= Math.sin(rotationRef.current.yaw) * moveSpeed;
        direction.z += Math.cos(rotationRef.current.yaw) * moveSpeed;
      }
      if (moveStateRef.current.left) {
        direction.x -= Math.cos(rotationRef.current.yaw) * moveSpeed;
        direction.z -= Math.sin(rotationRef.current.yaw) * moveSpeed;
      }
      if (moveStateRef.current.right) {
        direction.x += Math.cos(rotationRef.current.yaw) * moveSpeed;
        direction.z += Math.sin(rotationRef.current.yaw) * moveSpeed;
      }

      camera.position.x = Math.max(-9, Math.min(9, camera.position.x + direction.x));
      camera.position.z = Math.max(-9, Math.min(9, camera.position.z + direction.z));

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [floors, currentFloor]);

  useEffect(() => {
    if (!sceneRef.current || floors.length === 0) return;
    
    paintingsRef.current.forEach(painting => {
      if (painting.parent) {
        sceneRef.current.remove(painting.parent);
      }
    });
    lightsRef.current.forEach(light => {
      sceneRef.current.remove(light);
      if (light.target) {
        sceneRef.current.remove(light.target);
      }
    });
    paintingsRef.current = [];
    lightsRef.current = [];

    const paintings = distributePaintingsOnWalls(floors[currentFloor].images);
    createPaintings(sceneRef.current, paintings);
    createGalleryLights(sceneRef.current, paintings);
  }, [currentFloor, floors]);

  const createWoodTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(139, 90, 43, ${Math.random() * 0.3 + 0.1})`;
      ctx.lineWidth = Math.random() * 3 + 1;
      ctx.beginPath();
      const y = Math.random() * 512;
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + Math.random() * 20 - 10);
      ctx.stroke();
    }

    for (let i = 0; i < 512; i += 128) {
      ctx.strokeStyle = 'rgba(100, 60, 30, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  };

  const createPaintingTexture = (painting) => {
    if (painting.usePlaceholder) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#faf5eb';
      ctx.fillRect(0, 0, 512, 640);

      ctx.fillStyle = '#654321';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const words = painting.name.split(' ');
      const lineHeight = 45;
      const startY = 320 - (words.length * lineHeight) / 2;

      words.forEach((word, i) => {
        ctx.fillText(word, 256, startY + i * lineHeight);
      });

      return new THREE.CanvasTexture(canvas);
    } else {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(painting.path);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  };

  const createGalleryLights = (scene, paintings) => {
    paintings.forEach(painting => {
      const spotlight = new THREE.SpotLight(0xffffff, 1.0);
      
      let lightPos;
      if (painting.wall === 'north') {
        lightPos = new THREE.Vector3(painting.x, 3.5, painting.z + 1.5);
      } else if (painting.wall === 'south') {
        lightPos = new THREE.Vector3(painting.x, 3.5, painting.z - 1.5);
      } else if (painting.wall === 'east') {
        lightPos = new THREE.Vector3(painting.x - 1.5, 3.5, painting.z);
      } else {
        lightPos = new THREE.Vector3(painting.x + 1.5, 3.5, painting.z);
      }
      
      spotlight.position.copy(lightPos);
      spotlight.target.position.set(painting.x, painting.y, painting.z);
      spotlight.angle = Math.PI / 8;
      spotlight.penumbra = 0.4;
      spotlight.decay = 2;
      spotlight.distance = 10;
      spotlight.castShadow = true;
      spotlight.shadow.mapSize.width = 512;
      spotlight.shadow.mapSize.height = 512;
      spotlight.shadow.bias = -0.0001;

      scene.add(spotlight);
      scene.add(spotlight.target);
      lightsRef.current.push(spotlight);

      const fixtureGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.15, 8);
      const fixtureMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x222222
      });
      const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
      fixture.position.copy(lightPos);
      fixture.position.y -= 0.1;
      scene.add(fixture);
    });
  };

  const createPaintings = (scene, paintings) => {
    paintings.forEach(painting => {
      const frameDepth = 0.08;
      const frameWidth = 0.08;
      
      const frameGeometry = new THREE.BoxGeometry(
        painting.displayWidth + frameWidth * 2, 
        painting.displayHeight + frameWidth * 2, 
        frameDepth
      );
      const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x654321,
        roughness: 0.5,
        metalness: 0.3
      });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.castShadow = true;
      frame.receiveShadow = true;

      const canvasGeometry = new THREE.PlaneGeometry(
        painting.displayWidth, 
        painting.displayHeight
      );
      const canvasTexture = createPaintingTexture(painting);
      const canvasMaterial = new THREE.MeshStandardMaterial({ 
        map: canvasTexture,
        roughness: 0.7,
        metalness: 0.0
      });
      const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
      canvas.position.z = frameDepth / 2 + 0.01;
      canvas.castShadow = true;
      canvas.receiveShadow = true;

      const group = new THREE.Group();
      group.add(frame);
      group.add(canvas);
      group.position.set(painting.x, painting.y, painting.z);

      if (painting.wall === 'north') {
        group.rotation.y = 0;
      } else if (painting.wall === 'south') {
        group.rotation.y = Math.PI;
      } else if (painting.wall === 'east') {
        group.rotation.y = -Math.PI / 2;
      } else if (painting.wall === 'west') {
        group.rotation.y = Math.PI / 2;
      }

      canvas.userData.painting = painting;
      
      scene.add(group);
      paintingsRef.current.push(canvas);
    });
  };

  const changeFloor = (direction) => {
    const newFloor = currentFloor + direction;
    if (newFloor >= 0 && newFloor < floors.length) {
      setCurrentFloor(newFloor);
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 1.6, 5);
        rotationRef.current = { yaw: 0, pitch: 0 };
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl">Loading Gallery...</p>
          <p className="text-sm text-gray-400 mt-2">Preparing exhibition spaces</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center max-w-2xl p-8">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Error Loading Gallery</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg pointer-events-auto z-10">
        <h2 className="text-xl font-bold mb-2">{floors[currentFloor]?.name || 'Gallery'}</h2>
        <div className="text-sm opacity-80">Floor {currentFloor + 1} of {floors.length}</div>
        <div className="text-xs opacity-60 mt-1">{floors[currentFloor]?.images.length || 0} paintings</div>
      </div>

      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 pointer-events-auto z-10">
        <button
          onClick={() => changeFloor(1)}
          disabled={currentFloor === floors.length - 1}
          className="bg-black bg-opacity-70 text-white p-3 rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronUp size={24} />
        </button>
        <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-center font-bold">
          {currentFloor + 1}
        </div>
        <button
          onClick={() => changeFloor(-1)}
          disabled={currentFloor === 0}
          className="bg-black bg-opacity-70 text-white p-3 rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg pointer-events-auto z-10">
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} />
          <span className="font-bold">Controls</span>
        </div>
        <div className="text-xs space-y-1">
          <div>WASD - Move around</div>
          <div>Mouse Drag - Look around</div>
          <div>Arrows - Look up/down/rotate</div>
          <div>Click painting - View detail</div>
        </div>
      </div>

      {selectedPainting && (
        <div className="absolute inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-8 pointer-events-auto">
          <div className="relative max-w-6xl w-full">
            <button
              onClick={() => setSelectedPainting(null)}
              className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors z-10"
            >
              <X size={24} />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="w-full h-[600px] flex items-center justify-center overflow-hidden bg-gray-100">
                {selectedPainting.usePlaceholder ? (
                  <div 
                    className="text-5xl font-bold text-amber-900 transition-transform duration-300"
                    style={{ transform: `scale(${detailZoom})` }}
                  >
                    {selectedPainting.name}
                  </div>
                ) : (
                  <img 
                    src={selectedPainting.path} 
                    alt={selectedPainting.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{ transform: `scale(${detailZoom})` }}
                  />
                )}
              </div>
              
              <div className="p-6">
                <h3 className="text-3xl font-bold mb-2">{selectedPainting.name}</h3>
                <p className="text-gray-600 mb-4 text-lg">Wall: {selectedPainting.wall}</p>
                <p className="text-gray-500 text-sm mb-4">
                  Dimensions: {selectedPainting.width} × {selectedPainting.height}px
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailZoom(prev => Math.min(prev + 0.2, 3))}
                    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    <ZoomIn size={20} /> Zoom In
                  </button>
                  <button
                    onClick={() => setDetailZoom(prev => Math.max(prev - 0.2, 0.5))}
                    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    <ZoomOut size={20} /> Zoom Out
                  </button>
                  <button
                    onClick={() => setDetailZoom(1)}
                    className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                  >
                    Reset View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveGallery;