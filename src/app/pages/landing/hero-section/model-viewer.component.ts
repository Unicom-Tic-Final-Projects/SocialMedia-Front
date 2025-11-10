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
		// Scene
		this.scene = new THREE.Scene();

		// Camera
		const { clientWidth, clientHeight } = this.canvasHost.nativeElement;
		this.camera = new THREE.PerspectiveCamera(45, Math.max(clientWidth, 1) / Math.max(clientHeight, 1), 0.1, 1000);
		this.camera.position.set(0, 1.2, 3.0);
		this.camera.lookAt(new THREE.Vector3(-0.45, 1.0, 0));

		// Renderer (transparent)
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setClearColor(0x000000, 0); // transparent
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.canvasHost.nativeElement.appendChild(this.renderer.domElement);
		this.resizeRendererToDisplaySize();

		// Lights
		const ambient = new THREE.AmbientLight(0xffffff, 0.9);
		this.scene.add(ambient);

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
		dirLight.position.set(3, 5, 2);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 1024;
		dirLight.shadow.mapSize.height = 1024;
		this.scene.add(dirLight);

		// Subtle rim light for nicer highlights
		const rimLight = new THREE.DirectionalLight(0x00b78e, 0.6);
		rimLight.position.set(-3, 2, -2);
		this.scene.add(rimLight);

		// Add very subtle ground to help AO perception (but still transparent since no background)
		const ground = new THREE.PlaneGeometry(10, 10);
		const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
		const groundMesh = new THREE.Mesh(ground, groundMat);
		groundMesh.receiveShadow = true;
		groundMesh.rotation.x = -Math.PI / 2;
		groundMesh.position.y = -0.75;
		this.scene.add(groundMesh);
	}

	private loadModel(modelPath: string): void {
		const loader = new GLTFLoader();
		loader.load(
			modelPath,
			(gltf) => {
				// eslint-disable-next-line no-console
				console.log('GLB loaded:', modelPath, gltf);
				this.model = gltf.scene;
				this.model.traverse((child: any) => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				// Center and scale to fit
				const box = new THREE.Box3().setFromObject(this.model);
				const size = new THREE.Vector3();
				const center = new THREE.Vector3();
				box.getSize(size);
				box.getCenter(center);

				this.model.position.sub(center); // center the model at origin
				this.model.position.y += 0.55; // lift slightly for better view
				this.model.position.x -= 0.65; // shift further to the left

				// Scale to a nice size relative to view
				const maxDim = Math.max(size.x, size.y, size.z) || 1;
				const targetSize = 3.2; // larger target size for a bigger appearance
				const scale = maxDim > 0 ? targetSize / maxDim : 1;
				this.model.scale.setScalar(scale);

				this.scene.add(this.model);
			},
			undefined,
			(error) => {
				// eslint-disable-next-line no-console
				console.error('Error loading GLB model:', error);
			}
		);
	}

	private startRenderingLoop(): void {
		const render = () => {
			// Auto-rotate
			if (this.model) {
				this.model.rotation.y += 0.003;
			}
			this.renderer.render(this.scene, this.camera);
			this.animationFrameId = requestAnimationFrame(render);
		};
		render();
	}

	private attachResizeHandler(): void {
		// ResizeObserver for container changes
		if ('ResizeObserver' in window) {
			this.resizeObserver = new ResizeObserver(() => {
				this.onResize();
			});
			this.resizeObserver.observe(this.canvasHost.nativeElement);
		}
		// Window resize as fallback
		window.addEventListener('resize', this.onResize, { passive: true });

		// If nothing shows after a short delay, add a fallback cube to verify rendering
		setTimeout(() => {
			if (!this.model) {
				const geom = new THREE.BoxGeometry(1, 1, 1);
				const mat = new THREE.MeshStandardMaterial({ color: 0x00b78e, metalness: 0.2, roughness: 0.4 });
				const cube = new THREE.Mesh(geom, mat);
				cube.position.y = 0.5;
				cube.castShadow = true;
				cube.receiveShadow = true;
				this.scene.add(cube);
				// eslint-disable-next-line no-console
				console.warn('Model not loaded yet; showing fallback cube to verify renderer.');
			}
		}, 3000);
	}

	private onResize = (): void => {
		this.resizeRendererToDisplaySize();
	};

	private resizeRendererToDisplaySize(): void {
		const { clientWidth, clientHeight } = this.canvasHost.nativeElement;
		const width = Math.max(clientWidth, 1);
		const height = Math.max(clientHeight, 1);

		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private cleanup(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		window.removeEventListener('resize', this.onResize);
		this.resizeObserver?.disconnect();

		// Dispose renderer and its context
		this.renderer?.dispose();
		(this.renderer?.domElement?.parentNode as HTMLElement | null)?.removeChild(this.renderer.domElement);
	}
}


