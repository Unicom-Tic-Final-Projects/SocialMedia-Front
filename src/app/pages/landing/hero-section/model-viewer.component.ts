import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-viewer.component.html',
})
export class ModelViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true })
  canvasHost!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();

  private resizeObserver?: ResizeObserver;
  private lazyObserver?: IntersectionObserver;
  private hasLoaded = false;

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
            this.loadModel('assets/models/hero-model.glb');
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
  // INIT THREE
  //------------------------------------------------------
  private initThree(): void {
    this.scene = new THREE.Scene();

    const { clientWidth, clientHeight } = this.canvasHost.nativeElement;

    this.setupCamera(clientWidth, clientHeight);
    this.setupRenderer();
    this.setupLights();
  }

  //------------------------------------------------------
  // CAMERA — MOBILE-FIRST
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
      this.camera.position.set(0.5, 1.8, 5.5); // desktop
    }

    this.camera.lookAt(0, 1.0, 0);
  }

  //------------------------------------------------------
  // RENDERER
  //------------------------------------------------------
  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.canvasHost.nativeElement.appendChild(this.renderer.domElement);

    this.resizeRenderer();
  }

  //------------------------------------------------------
  // LIGHTS
  //------------------------------------------------------
  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(3, 5, 2);
    this.scene.add(dir);
  }

  //------------------------------------------------------
  // LOAD GLB MODEL
  //------------------------------------------------------
private loadModel(path: string): void {
  const loader = new GLTFLoader();

  loader.load(
    path,
    (gltf) => {
      this.model = gltf.scene;

      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const vw = window.innerWidth;
      const isMobile = vw <= 480;
      const isTablet = vw > 480 && vw <= 1024;

      // ALWAYS center the model
      this.model.position.sub(center);
      this.model.position.x = 0;

        if (!isMobile && !isTablet) {
          this.model.position.y += 0.8;

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 4.2 / maxDim;

          this.model.scale.setScalar(scale);
          
        }
          else if (isTablet) {

            const maxDim = Math.max(size.x, size.y, size.z);

            // Perfect size
            this.model.scale.setScalar(4.9 / maxDim);

            // Balanced vertical
            this.model.position.y = 1.35;

            // Center (tablet needs smaller offset)
            this.model.position.x = -3.00;

            // ⭐ Tablet camera – prevent left/right crop
            if (this.camera) {
              this.camera.fov = 68;          // wider view
              this.camera.aspect = 1.25;     // tablet-like perspective
              this.camera.updateProjectionMatrix();

              this.camera.position.set(0, 1.55, 8.2);  // pull back for width
              this.camera.lookAt(0, 0.5, 0);           // slight tilt
            }
          }

  
      // DESKTOP → Same as your original settings
      // if (!isMobile) {
      //   this.model.position.y += 0.8;

      //   const maxDim = Math.max(size.x, size.y, size.z);
      //   const scale = 4.2 / maxDim;

      //   this.model.scale.setScalar(scale);
      // }

      else {

        const maxDim = Math.max(size.x, size.y, size.z);

        const scale = 3.1 / maxDim;
        this.model.scale.setScalar(scale);

        this.model.position.y = 1.85;
        this.model.position.x = -1.59;

        
     

      }




      this.scene.add(this.model);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        gltf.animations.forEach((clip) => {
          this.mixer!.clipAction(clip).play();
        });
      }
    },
    undefined,
    (error) => console.error('Error loading model:', error)
  );
}


  //------------------------------------------------------
  // ANIMATION LOOP
  //------------------------------------------------------
  private startRenderingLoop(): void {
    const render = () => {
      const delta = this.clock.getDelta();
      if (this.mixer) this.mixer.update(delta);

      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  //------------------------------------------------------
  // RESIZE HANDLER
  //------------------------------------------------------
  private attachResizeHandler() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() =>
        this.resizeRenderer()
      );
      this.resizeObserver.observe(this.canvasHost.nativeElement);
    }

    window.addEventListener('resize', this.resizeRenderer, {
      passive: true,
    });
  }

  private resizeRenderer = () => {
    const { clientWidth, clientHeight } = this.canvasHost.nativeElement;

    if (clientWidth <= 0 || clientHeight <= 0) return;

    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  };

  //------------------------------------------------------
  // CLEANUP
  //------------------------------------------------------
  private cleanup(): void {
    if (this.animationFrameId !== null)
      cancelAnimationFrame(this.animationFrameId);

    window.removeEventListener('resize', this.resizeRenderer);
    this.resizeObserver?.disconnect();
    this.lazyObserver?.disconnect();

    this.renderer?.dispose();
    this.mixer = null;
    this.model = null;

    const canvas = this.renderer?.domElement;
    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
