import { Injectable } from '@angular/core';

export interface ImageTransformationOptions {
  width?: number;
  height?: number;
  cropMode?: 'fill' | 'scale' | 'fit' | 'limit' | 'pad' | 'crop' | 'thumb';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  quality?: number | 'auto';
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'gif';
  effect?: 'blur' | 'sharpen' | 'grayscale' | 'sepia';
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export interface VideoTransformationOptions {
  width?: number;
  height?: number;
  format?: 'mp4' | 'webm' | 'ogv';
  quality?: number | 'auto';
  bitrate?: number;
}

/**
 * Service for generating Cloudinary transformation URLs
 * Provides utilities to transform images and videos on-the-fly
 */
@Injectable({
  providedIn: 'root',
})
export class CloudinaryTransformationService {
  /**
   * Generate transformed image URL from base Cloudinary URL
   */
  transformImageUrl(baseUrl: string, options: ImageTransformationOptions): string {
    if (!baseUrl || !this.isCloudinaryUrl(baseUrl)) {
      return baseUrl;
    }

    const parts = this.parseCloudinaryUrl(baseUrl);
    if (!parts) return baseUrl;

    const transformations: string[] = [];

    // Size
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);

    // Crop mode
    if (options.cropMode) transformations.push(`c_${options.cropMode}`);

    // Gravity
    if (options.gravity) transformations.push(`g_${options.gravity}`);

    // Quality
    if (options.quality !== undefined) {
      transformations.push(`q_${options.quality}`);
    } else {
      transformations.push('q_auto');
    }

    // Format
    if (options.format) {
      transformations.push(`f_${options.format}`);
    } else {
      transformations.push('f_auto');
    }

    // Effects
    if (options.effect === 'blur' && options.blur) {
      transformations.push(`e_blur:${options.blur}`);
    } else if (options.effect) {
      transformations.push(`e_${options.effect}`);
    }

    // Color adjustments
    if (options.brightness !== undefined) {
      transformations.push(`e_brightness:${options.brightness}`);
    }
    if (options.contrast !== undefined) {
      transformations.push(`e_contrast:${options.contrast}`);
    }
    if (options.saturation !== undefined) {
      transformations.push(`e_saturation:${options.saturation}`);
    }

    const transformationString = transformations.join(',');
    return `https://res.cloudinary.com/${parts.cloudName}/${parts.resourceType}/upload/${transformationString}/${parts.publicId}`;
  }

  /**
   * Generate transformed video URL from base Cloudinary URL
   */
  transformVideoUrl(baseUrl: string, options: VideoTransformationOptions): string {
    if (!baseUrl || !this.isCloudinaryUrl(baseUrl)) {
      return baseUrl;
    }

    const parts = this.parseCloudinaryUrl(baseUrl);
    if (!parts) return baseUrl;

    const transformations: string[] = [];

    // Size
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);

    // Format
    if (options.format) transformations.push(`f_${options.format}`);

    // Quality
    if (options.quality !== undefined) {
      transformations.push(`q_${options.quality}`);
    } else {
      transformations.push('q_auto');
    }

    // Bitrate
    if (options.bitrate) transformations.push(`br_${options.bitrate}`);

    const transformationString = transformations.join(',');
    return `https://res.cloudinary.com/${parts.cloudName}/${parts.resourceType}/upload/${transformationString}/${parts.publicId}`;
  }

  /**
   * Generate thumbnail URL for video
   */
  generateVideoThumbnailUrl(
    baseUrl: string,
    width: number = 800,
    height: number = 600,
    timeOffset?: number
  ): string {
    if (!baseUrl || !this.isCloudinaryUrl(baseUrl)) {
      return baseUrl;
    }

    const parts = this.parseCloudinaryUrl(baseUrl);
    if (!parts) return baseUrl;

    const transformations: string[] = [
      `w_${width}`,
      `h_${height}`,
      'c_fill',
      'q_auto',
      'f_jpg',
    ];

    if (timeOffset !== undefined) {
      transformations.push(`so_${timeOffset}`);
    } else {
      transformations.push('so_auto');
    }

    const transformationString = transformations.join(',');
    return `https://res.cloudinary.com/${parts.cloudName}/video/upload/${transformationString}/${parts.publicId}.jpg`;
  }

  /**
   * Generate responsive image URL (auto width based on device)
   */
  generateResponsiveImageUrl(baseUrl: string, maxWidth: number = 1920): string {
    return this.transformImageUrl(baseUrl, {
      width: maxWidth,
      cropMode: 'limit',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Generate optimized image URL for social media (square, high quality)
   */
  generateSocialMediaImageUrl(baseUrl: string, size: number = 1080): string {
    return this.transformImageUrl(baseUrl, {
      width: size,
      height: size,
      cropMode: 'fill',
      gravity: 'auto',
      quality: 90,
      format: 'jpg',
    });
  }

  /**
   * Check if URL is a Cloudinary URL
   */
  private isCloudinaryUrl(url: string): boolean {
    return url.includes('res.cloudinary.com');
  }

  /**
   * Parse Cloudinary URL to extract components
   */
  private parseCloudinaryUrl(url: string): {
    cloudName: string;
    resourceType: string;
    publicId: string;
  } | null {
    try {
      const match = url.match(/https?:\/\/([^.]+)\.cloudinary\.com\/([^/]+)\/upload\/(.+)/);
      if (!match) return null;

      const [, cloudName, resourceType, rest] = match;
      // Remove transformations if present
      const publicIdMatch = rest.match(/(?:[^/]+\/)*([^/]+)$/);
      const publicId = publicIdMatch ? publicIdMatch[1].split('.')[0] : rest.split('.')[0];

      return { cloudName, resourceType, publicId };
    } catch {
      return null;
    }
  }
}

