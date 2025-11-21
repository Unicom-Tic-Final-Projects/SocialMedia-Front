import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Material state interface
interface MaterialState {
  color: THREE.Color;
  metalness: number;
  roughness: number;
  emissive: THREE.Color;
  emissiveIntensity: number;
}

@Component({
  selector: 'app-model-viewer-enhanced',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-viewer-enhanced.component.html',
  styleUrl: './model-viewer.component.css',
})
export class ModelViewerEnhancedComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true })
  canvasHost!: ElementRef<HTMLDivElement>;
  
  @Input() modelPath: string = 'assets/models/genkub_greeting_robot.glb';
  @Input() rotationSpeed: number = 0.005;
  @Input() enableInteractivity: boolean = true;
  @Input() enablePostProcessing: boolean = true;
  @Input() enablePhysics: boolean = false;

  // Scene components
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  
  // Model and animation
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();
  
  // Environment
  private environmentMap!: THREE.Texture;
  private fog!: THREE.Fog;
  
  // Materials and states
  private originalMaterials: Map<THREE.Mesh, MaterialState> = new Map();
  private currentState: 'idle' | 'hover' | 'click' | 'animate' = 'idle';
  
  // Physics (basic)
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  // Observers
  private resizeObserver?: ResizeObserver;
  private lazyObserver?: IntersectionObserver;
  public hasLoaded = false;
  private animationFrameId: number | null = null;

  // Event handlers
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.enableInteractivity || !this.canvasHost) return;
    
    const rect = this.canvasHost.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.handleMouseInteraction();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (!this.enableInteractivity) return;
    this.triggerClickState();
  }

  ngAfterViewInit(): void {
    this.attachLazyLoader();
  }

  //------------------------------------------------------
  // LAZY LOADER
  //------------------------------------------------------
  private attachLazyLoader() {
    this.lazyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasLoaded) {
            this.hasLoaded = true;
            this.initThree();
            this.loadEnvironment();
            this.loadModel(this.modelPath);
            this.startRenderingLoop();
            this.attachResizeHandler();
            this.lazyObserver?.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    this.lazyObserver.observe(this.canvasHost.nativeElement);
  }

  //------------------------------------------------------
  // INIT THREE.JS
  //------------------------------------------------------
  private initThree(): void {
    this.scene = new THREE.Scene();
    const { clientWidth, clientHeight } = this.canvasHost.nativeElement;

    this.setupCamera(clientWidth, clientHeight);
    this.setupRenderer();
    this.setupLights();
    this.setupFog();
    if (this.enableInteractivity) {
      this.setupControls();
    }
    if (this.enablePostProcessing) {
      this.setupPostProcessing();
    }
  }

  //------------------------------------------------------
  // CAMERA SETUP
  //------------------------------------------------------
  private setupCamera(width: number, height: number) {
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;

    this.camera = new THREE.PerspectiveCamera(
      isMobile ? 50 : 40,
      width / height,
      0.1,
      1000
    );

    if (isMobile) {
      this.camera.position.set(0.2, 1.1, 7.8);
    } else if (isTablet) {
      this.camera.position.set(0.3, 1.6, 6.0);
    } else {
      this.camera.position.set(0.5, 1.8, 5.5);
    }

    this.camera.lookAt(0, 1.0, 0);
  }

  //------------------------------------------------------
  // RENDERER WITH ENHANCED FEATURES
  //------------------------------------------------------
  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.canvasHost.nativeElement.appendChild(this.renderer.domElement);
    this.resizeRenderer();
  }

  //------------------------------------------------------
  // ENHANCED LIGHTING SYSTEM
  //------------------------------------------------------
  private setupLights() {
    // Ambient light with color
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(3, 5, 2);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4C6FFF, 0.4);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);

    // Rim light (accent)
    const rimLight = new THREE.DirectionalLight(0xBFC9FF, 0.5);
    rimLight.position.set(0, 3, -5);
    this.scene.add(rimLight);

    // Point lights for depth
    const pointLight1 = new THREE.PointLight(0x4C6FFF, 0.8, 10);
    pointLight1.position.set(2, 3, 2);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xBFC9FF, 0.6, 10);
    pointLight2.position.set(-2, 2, -2);
    this.scene.add(pointLight2);
  }

  //------------------------------------------------------
  // FOG SYSTEM
  //------------------------------------------------------
  private setupFog() {
    this.fog = new THREE.Fog(0xffffff, 10, 50);
    this.fog.color.setHex(0xffffff);
    this.scene.fog = this.fog;
  }

  //------------------------------------------------------
  // ENVIRONMENT MAP
  //------------------------------------------------------
  private loadEnvironment() {
    // Create procedural environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    // Create a simple environment
    const envScene = new THREE.Scene();
    const envLight = new THREE.AmbientLight(0xffffff, 1);
    envScene.add(envLight);
    
    const envDirLight = new THREE.DirectionalLight(0xffffff, 1);
    envDirLight.position.set(1, 1, 1);
    envScene.add(envDirLight);

    this.environmentMap = pmremGenerator.fromScene(envScene, 0.04).texture;
    this.scene.environment = this.environmentMap;
    pmremGenerator.dispose();
  }

  //------------------------------------------------------
  // ORBIT CONTROLS
  //------------------------------------------------------
  private setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.autoRotate = false;
  }

  //------------------------------------------------------
  // POST-PROCESSING PIPELINE
  //------------------------------------------------------
  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    this.composer.addPass(bloomPass);

    // Output pass (tone mapping)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  //------------------------------------------------------
  // LOAD AND ENHANCE MODEL
  //------------------------------------------------------
  private loadModel(path: string): void {
    const loader = new GLTFLoader();

    loader.load(
      path,
      (gltf) => {
        this.model = gltf.scene;
        this.processModelMaterials();
        this.setupModelPosition();
        this.setupAnimations(gltf);
        this.scene.add(this.model);
      },
      undefined,
      (error) => console.error('Error loading model:', error)
    );
  }

  //------------------------------------------------------
  // PROCESS MATERIALS - COLOR LAYERS & TEXTURES
  //------------------------------------------------------
  private processModelMaterials() {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        
        // Store original material state
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          const material = mesh.material;
          this.originalMaterials.set(mesh, {
            color: material.color.clone(),
            metalness: material.metalness,
            roughness: material.roughness,
            emissive: material.emissive.clone(),
            emissiveIntensity: material.emissiveIntensity,
          });

          // Enhance material with color layers
          material.color = new THREE.Color(0xffffff);
          
          // Add environment map
          if (this.environmentMap) {
            material.envMap = this.environmentMap;
            material.envMapIntensity = 1.0;
          }

          // Material layers enhancement
          material.metalness = Math.max(0.1, material.metalness || 0.3);
          material.roughness = Math.min(0.9, material.roughness || 0.7);
          
          // Emissive layer for glow effect
          material.emissive = new THREE.Color(0x000000);
          material.emissiveIntensity = 0;

          // Enable shadows
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Add texture support (if textures exist in model)
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
          }
          if (material.normalMap) {
            material.normalScale.set(1, 1);
          }
        }
      }
    });
  }

  //------------------------------------------------------
  // SETUP MODEL POSITION
  //------------------------------------------------------
  private setupModelPosition() {
    if (!this.model) return;

    const box = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const vw = window.innerWidth;
    const isMobile = vw <= 480;
    const isTablet = vw > 480 && vw <= 1024;

    this.model.position.sub(center);
    this.model.position.x = 0;

    if (!isMobile && !isTablet) {
      this.model.position.y += 0.8;
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 4.2 / maxDim;
      this.model.scale.setScalar(scale);
    } else if (isTablet) {
      const maxDim = Math.max(size.x, size.y, size.z);
      this.model.scale.setScalar(4.9 / maxDim);
      this.model.position.y = 1.35;
      this.model.position.x = -3.0;
      
      if (this.camera) {
        this.camera.fov = 68;
        this.camera.aspect = 1.25;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(0, 1.55, 8.2);
        this.camera.lookAt(0, 0.5, 0);
      }
    } else {
      const maxDim = Math.max(size.x, size.y, size.z);
      this.model.scale.setScalar(3.1 / maxDim);
      this.model.position.y = 1.85;
      this.model.position.x = -1.59;
    }
  }

  //------------------------------------------------------
  // ANIMATION SYSTEM
  //------------------------------------------------------
  private setupAnimations(gltf: any) {
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.model!);
      gltf.animations.forEach((clip: THREE.AnimationClip) => {
        const action = this.mixer!.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      });
    }
  }

  //------------------------------------------------------
  // INTERACTIVITY - MOUSE INTERACTION
  //------------------------------------------------------
  private handleMouseInteraction() {
    if (!this.model || !this.enableInteractivity) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.model, true);

    if (intersects.length > 0) {
      this.setState('hover');
      this.applyHoverEffect(intersects[0].object as THREE.Mesh);
    } else {
      this.setState('idle');
      this.resetMaterialStates();
    }
  }

  //------------------------------------------------------
  // STATE MANAGEMENT
  //------------------------------------------------------
  private setState(state: 'idle' | 'hover' | 'click' | 'animate') {
    if (this.currentState === state) return;
    this.currentState = state;
    this.applyStateEffects(state);
  }

  private applyStateEffects(state: string) {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;
        
        if (!material || !this.originalMaterials.has(mesh)) return;

        const original = this.originalMaterials.get(mesh)!;

        switch (state) {
          case 'hover':
            material.emissive.setHex(0x4C6FFF);
            material.emissiveIntensity = 0.3;
            material.color.lerp(new THREE.Color(0xBFC9FF), 0.2);
            break;
          case 'click':
            material.emissive.setHex(0x4C6FFF);
            material.emissiveIntensity = 0.6;
            material.color.lerp(new THREE.Color(0x4C6FFF), 0.3);
            break;
          case 'animate':
            // Pulse animation
            const time = this.clock.getElapsedTime();
            material.emissiveIntensity = 0.2 + Math.sin(time * 2) * 0.2;
            break;
          default:
            material.color.copy(original.color);
            material.emissive.copy(original.emissive);
            material.emissiveIntensity = original.emissiveIntensity;
        }
      }
    });
  }

  private applyHoverEffect(mesh: THREE.Mesh) {
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material && this.originalMaterials.has(mesh)) {
      material.emissive.setHex(0x4C6FFF);
      material.emissiveIntensity = 0.4;
    }
  }

  private resetMaterialStates() {
    if (!this.model) return;
    
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        const original = this.originalMaterials.get(mesh);
        if (original && mesh.material instanceof THREE.MeshStandardMaterial) {
          const material = mesh.material;
          material.color.copy(original.color);
          material.emissive.copy(original.emissive);
          material.emissiveIntensity = original.emissiveIntensity;
        }
      }
    });
  }

  private triggerClickState() {
    this.setState('click');
    setTimeout(() => {
      if (this.currentState === 'click') {
        this.setState('idle');
      }
    }, 300);
  }

  //------------------------------------------------------
  // RENDERING LOOP
  //------------------------------------------------------
  private startRenderingLoop(): void {
    const render = () => {
      const delta = this.clock.getDelta();
      
      // Update animations
      if (this.mixer) {
        this.mixer.update(delta);
      }

      // Update controls
      if (this.controls) {
        this.controls.update();
      }

      // Smooth rotation
      if (this.model && !this.controls) {
        this.model.rotation.y += this.rotationSpeed || 0.005;
      }

      // Animate state effects
      if (this.currentState === 'animate') {
        this.applyStateEffects('animate');
      }

      // Render with post-processing or standard
      if (this.enablePostProcessing && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  //------------------------------------------------------
  // RESIZE HANDLER
  //------------------------------------------------------
  private attachResizeHandler() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resizeRenderer());
      this.resizeObserver.observe(this.canvasHost.nativeElement);
    }
    window.addEventListener('resize', this.resizeRenderer, { passive: true });
  }

  private resizeRenderer = () => {
    const { clientWidth, clientHeight } = this.canvasHost.nativeElement;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();

    if (this.composer) {
      this.composer.setSize(clientWidth, clientHeight);
    }
  };

  //------------------------------------------------------
  // CLEANUP
  //------------------------------------------------------
  private cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.resizeRenderer);
    this.resizeObserver?.disconnect();
    this.lazyObserver?.disconnect();

    this.controls?.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
    
    if (this.environmentMap) {
      this.environmentMap.dispose();
    }

    this.mixer = null;
    this.model = null;
    this.originalMaterials.clear();

    const canvas = this.renderer?.domElement;
    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}

