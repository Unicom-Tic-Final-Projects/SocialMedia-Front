import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-viewer.component.html'
})
export class ModelViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.initThree();
    this.loadModel('assets/models/hero-model.glb');
    this.startRenderingLoop();
    this.attachResizeHandler();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initThree(): void {
  this.scene = new THREE.Scene();

  const { clientWidth, clientHeight } = this.canvasHost.nativeElement;
  this.camera = new THREE.PerspectiveCamera(40, clientWidth / clientHeight, 0.1, 1000);
  // Move camera farther and slightly higher to show full model
  this.camera.position.set(0.5, 1.8, 5.5);
  this.camera.lookAt(0, 1.0, 0);

  this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  this.renderer.setClearColor(0x000000, 0);
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.canvasHost.nativeElement.appendChild(this.renderer.domElement);
  this.resizeRendererToDisplaySize();

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  this.scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(3, 5, 2);
  dirLight.castShadow = true;
  this.scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0x4c6fff, 0.5);
  rimLight.position.set(-3, 2, -3);
  this.scene.add(rimLight);

  const groundGeo = new THREE.PlaneGeometry(10, 10);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.9; // slightly lower
  ground.receiveShadow = true;
  this.scene.add(ground);
}

  private loadModel(modelPath: string): void {
  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      this.model = gltf.scene;
      this.model.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Fit and center model dynamically
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      this.model.position.sub(center);
      this.model.position.y += 0.8; // slightly higher to show base circle fully
      this.model.position.x = 0; // center horizontally

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 4.2 / maxDim; // increased scale factor to ensure proper framing
      this.model.scale.setScalar(scale);

      this.scene.add(this.model);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        gltf.animations.forEach((clip) => {
          const action = this.mixer!.clipAction(clip);
          action.play();
        });
      }
    },
    undefined,
    (error) => console.error('Error loading model:', error)
  );
}

  private startRenderingLoop(): void {
    const render = () => {
      const delta = this.clock.getDelta();
      if (this.mixer) {
        this.mixer.update(delta);
      }
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private attachResizeHandler(): void {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.canvasHost.nativeElement);
    }
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private onResize = (): void => this.resizeRendererToDisplaySize();

  private resizeRendererToDisplaySize(): void {
    const { clientWidth, clientHeight } = this.canvasHost.nativeElement;
    const width = Math.max(clientWidth, 1);
    const height = Math.max(clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private cleanup(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.mixer = null;
    this.model = null;
    (this.renderer?.domElement?.parentNode as HTMLElement | null)?.removeChild(this.renderer.domElement);
  }
}
