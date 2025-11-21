import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

@Component({
  selector: 'app-click-spark',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './click-spark.component.html',
  styleUrl: './click-spark.component.css',
})
export class ClickSparkComponent implements AfterViewInit, OnDestroy {
  @Input() sparkColor: string = '#fff';
  @Input() sparkSize: number = 10;
  @Input() sparkRadius: number = 15;
  @Input() sparkCount: number = 8;
  @Input() duration: number = 400;
  @Input() easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' = 'ease-out';
  @Input() extraScale: number = 1.0;

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  private sparks: Spark[] = [];
  private startTime: number | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: any;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.setupCanvas();
        this.startAnimation();
      }, 0);
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const handleResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(resizeCanvas, 100);
    };

    this.resizeObserver = new ResizeObserver(handleResize);
    this.resizeObserver.observe(parent);
    resizeCanvas();
  }

  private easeFunc(t: number): number {
    switch (this.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t * (2 - t);
    }
  }

  private startAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.ngZone.runOutsideAngular(() => {
      const draw = (timestamp: number) => {
        const canvas = this.canvasRef?.nativeElement;
        if (!canvas) {
          this.animationId = requestAnimationFrame(draw);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          this.animationId = requestAnimationFrame(draw);
          return;
        }

        if (!this.startTime) {
          this.startTime = timestamp;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.sparks = this.sparks.filter((spark: Spark) => {
          const elapsed = timestamp - spark.startTime;
          if (elapsed >= this.duration) {
            return false;
          }

          const progress = elapsed / this.duration;
          const eased = this.easeFunc(progress);

          const distance = eased * this.sparkRadius * this.extraScale;
          const lineLength = this.sparkSize * (1 - eased);

          const x1 = spark.x + distance * Math.cos(spark.angle);
          const y1 = spark.y + distance * Math.sin(spark.angle);
          const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
          const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

          ctx.strokeStyle = this.sparkColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          return true;
        });

        this.animationId = requestAnimationFrame(draw);
      };

      this.animationId = requestAnimationFrame(draw);
    });
  }

  handleClick(e: MouseEvent): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const now = performance.now();
    const newSparks: Spark[] = Array.from({ length: this.sparkCount }, (_, i) => ({
      x,
      y,
      angle: (2 * Math.PI * i) / this.sparkCount,
      startTime: now
    }));

    this.sparks.push(...newSparks);
  }

  private cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    window.removeEventListener('resize', () => {});
  }
}

