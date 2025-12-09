import { Injectable } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface VideoEditOptions {
  startTime?: number;
  endTime?: number;
  brightness?: number; // 0-200 (100 = normal)
  contrast?: number; // 0-200 (100 = normal)
  saturation?: number; // 0-200 (100 = normal)
  quality?: 'low' | 'medium' | 'high';
}

@Injectable({
  providedIn: 'root',
})
export class VideoEditorService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;

  /**
   * Load FFmpeg.wasm (only once)
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loading) {
      // Wait for existing load to complete
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.loading = true;
    try {
      this.ffmpeg = new FFmpeg();

      // Use CDN for FFmpeg.wasm files
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Trim video to specific time range
   */
  async trimVideo(
    videoFile: File,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const duration = endTime - startTime;
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    try {
      // Write input file
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

      // Execute trim command
      await this.ffmpeg.exec([
        '-i',
        inputFileName,
        '-ss',
        startTime.toString(),
        '-t',
        duration.toString(),
        '-c',
        'copy', // Copy codec (fast, no re-encoding)
        '-avoid_negative_ts',
        'make_zero',
        outputFileName,
      ]);

      // Read output file
      const data = await this.ffmpeg.readFile(outputFileName);
      // Convert FileData to Blob - FileData can be Uint8Array or string
      let blob: Blob;
      if (typeof data === 'string') {
        // If it's a string (base64), convert to Blob
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'video/mp4' });
      } else {
        // If it's Uint8Array, convert to ArrayBuffer for type compatibility
        const uint8Array = data as Uint8Array;
        // Create a new Uint8Array from the data to ensure type compatibility
        const buffer = new ArrayBuffer(uint8Array.length);
        const view = new Uint8Array(buffer);
        view.set(uint8Array);
        // @ts-ignore - ArrayBuffer is compatible with BlobPart, TypeScript just needs help here
        blob = new Blob([buffer], { type: 'video/mp4' });
      }

      // Cleanup
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return blob;
    } catch (error) {
      console.error('Error trimming video:', error);
      throw error;
    }
  }

  /**
   * Apply filters to video (brightness, contrast, saturation)
   */
  async applyFilters(
    videoFile: File,
    options: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
    }
  ): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const filters: string[] = [];
    const filterParts: string[] = [];

    if (options.brightness !== undefined && options.brightness !== 100) {
      const brightnessValue = (options.brightness - 100) / 100;
      filterParts.push(`brightness=${brightnessValue}`);
    }

    if (options.contrast !== undefined && options.contrast !== 100) {
      const contrastValue = options.contrast / 100;
      filterParts.push(`contrast=${contrastValue}`);
    }

    if (options.saturation !== undefined && options.saturation !== 100) {
      const saturationValue = options.saturation / 100;
      filterParts.push(`saturation=${saturationValue}`);
    }

    if (filterParts.length === 0) {
      // No filters to apply, return original
      return new Blob([await videoFile.arrayBuffer()], { type: 'video/mp4' });
    }

    const filterString = filterParts.join(':');
    filters.push(`eq=${filterString}`);

    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    try {
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

      await this.ffmpeg.exec([
        '-i',
        inputFileName,
        '-vf',
        filters.join(','),
        '-c:a',
        'copy', // Copy audio without re-encoding
        outputFileName,
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      // Convert FileData to Blob - FileData can be Uint8Array or string
      let blob: Blob;
      if (typeof data === 'string') {
        // If it's a string (base64), convert to Blob
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'video/mp4' });
      } else {
        // If it's Uint8Array, convert to ArrayBuffer for type compatibility
        const uint8Array = data as Uint8Array;
        // Create a new Uint8Array from the data to ensure type compatibility
        const buffer = new ArrayBuffer(uint8Array.length);
        const view = new Uint8Array(buffer);
        // @ts-ignore - FFmpeg's Uint8Array is compatible at runtime
        view.set(uint8Array);
        blob = new Blob([buffer], { type: 'video/mp4' });
      }

      // Cleanup
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return blob;
    } catch (error) {
      console.error('Error applying filters:', error);
      throw error;
    }
  }

  /**
   * Compress video with quality settings
   */
  async compressVideo(
    videoFile: File,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const crfMap = { low: 28, medium: 23, high: 18 };

    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    try {
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

      await this.ffmpeg.exec([
        '-i',
        inputFileName,
        '-c:v',
        'libx264',
        '-crf',
        crfMap[quality].toString(),
        '-preset',
        'medium',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        outputFileName,
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      // Convert FileData to Blob - FileData can be Uint8Array or string
      let blob: Blob;
      if (typeof data === 'string') {
        // If it's a string (base64), convert to Blob
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'video/mp4' });
      } else {
        // If it's Uint8Array, convert to ArrayBuffer for type compatibility
        const uint8Array = data as Uint8Array;
        // Create a new Uint8Array from the data to ensure type compatibility
        const buffer = new ArrayBuffer(uint8Array.length);
        const view = new Uint8Array(buffer);
        // @ts-ignore - FFmpeg's Uint8Array is compatible at runtime
        view.set(uint8Array);
        blob = new Blob([buffer], { type: 'video/mp4' });
      }

      // Cleanup
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return blob;
    } catch (error) {
      console.error('Error compressing video:', error);
      throw error;
    }
  }

  /**
   * Apply all edits (trim + filters + compress) in one operation
   */
  async applyEdits(videoFile: File, options: VideoEditOptions): Promise<Blob> {
    let processedVideo: Blob = videoFile as any;

    // Step 1: Trim if needed
    if (options.startTime !== undefined && options.endTime !== undefined) {
      processedVideo = await this.trimVideo(
        new File([processedVideo], 'temp.mp4', { type: 'video/mp4' }),
        options.startTime,
        options.endTime
      );
    }

    // Step 2: Apply filters if needed
    if (
      options.brightness !== undefined ||
      options.contrast !== undefined ||
      options.saturation !== undefined
    ) {
      processedVideo = await this.applyFilters(
        new File([processedVideo], 'temp.mp4', { type: 'video/mp4' }),
        {
          brightness: options.brightness,
          contrast: options.contrast,
          saturation: options.saturation,
        }
      );
    }

    // Step 3: Compress if quality is specified
    if (options.quality) {
      processedVideo = await this.compressVideo(
        new File([processedVideo], 'temp.mp4', { type: 'video/mp4' }),
        options.quality
      );
    }

    return processedVideo;
  }

  /**
   * Get video duration
   */
  async getVideoDuration(videoFile: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(videoFile);
    });
  }
}

