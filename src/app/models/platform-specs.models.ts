  export interface PlatformSpec {
  platform: string;
  formats: MediaFormat[];
}

export interface MediaFormat {
  name: string;
  type: 'image' | 'video';
  dimensions: {
    width: number;
    height: number;
  };
  aspectRatio: string;
  format: string;
  fileTypes: string[];
  fileSize: string;
  settings?: string;
  notes: string;
  download?: boolean;
}

export const PLATFORM_SPECS: Record<string, MediaFormat[]> = {
  instagram: [
    {
      name: 'Square Feed Post',
      type: 'image',
      dimensions: { width: 1440, height: 1440 },
      aspectRatio: '1:1',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Ideal for balanced visual content across feeds.'
    },
    {
      name: 'Vertical Feed Post',
      type: 'image',
      dimensions: { width: 1080, height: 1350 },
      aspectRatio: '4:5',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Optimized for mobile screens; visually dominant on smaller devices.'
    },
    {
      name: 'Landscape Feed Post',
      type: 'image',
      dimensions: { width: 1080, height: 566 },
      aspectRatio: '1.91:1',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Best for horizontal or panoramic visuals.'
    },
    {
      name: 'Story Post',
      type: 'image',
      dimensions: { width: 1440, height: 2560 },
      aspectRatio: '9:16',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Keep design elements 250px from top, 340px bottom to avoid being obscured by UI.'
    },
    {
      name: 'Story Post',
      type: 'video',
      dimensions: { width: 1440, height: 2560 },
      aspectRatio: '9:16',
      format: 'Video',
      fileTypes: ['MP4', 'MOV', 'GIF'],
      fileSize: 'Up to 4GB',
      settings: 'H.264 compression, square pixels, fixed frame rate, progressive scan and stereo AAC audio compression at 128kbps+.',
      notes: 'Keep design elements 250px from top, 340px bottom to avoid being obscured by UI.'
    },
    {
      name: 'Reels',
      type: 'video',
      dimensions: { width: 1440, height: 2560 },
      aspectRatio: '9:16',
      format: 'Video',
      fileTypes: ['MP4', 'MOV', 'GIF'],
      fileSize: 'Up to 4GB',
      settings: 'H.264 compression, square pixels, fixed frame rate, progressive scan and stereo AAC audio compression at 128kbps+.',
      notes: 'Cover image should be same size. Reels appear as 1:1 in profile feed, 4:5 in home feed. Keep key elements centered.'
    }
  ],
  facebook: [
    {
      name: 'Square Post',
      type: 'image',
      dimensions: { width: 1080, height: 1080 },
      aspectRatio: '1:1',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Ideal for balanced content across desktop and mobile feeds.'
    },
    {
      name: 'Vertical Post',
      type: 'image',
      dimensions: { width: 1080, height: 1350 },
      aspectRatio: '4:5',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Optimized for mobile users; visually appealing on smaller screens.'
    },
    {
      name: 'Story Image',
      type: 'image',
      dimensions: { width: 1440, height: 2560 },
      aspectRatio: '9:16',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 30MB',
      notes: 'Leave a 250-pixel safe zone at top, 340-pixel safe zone at bottom for overlays.'
    }
  ],
  twitter: [
    {
      name: 'In-Feed Image (All ratios)',
      type: 'image',
      dimensions: { width: 1600, height: 900 },
      aspectRatio: '1.91:1',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 5MB',
      notes: 'Can use 1200x1200 (1:1), 1200x628 (1.91:1), 1080x1350 (4:5).'
    },
    {
      name: 'In-Feed Video',
      type: 'video',
      dimensions: { width: 1600, height: 900 },
      aspectRatio: '16:9',
      format: 'Video',
      fileTypes: ['MP4', 'MOV'],
      fileSize: 'Up to 1GB',
      settings: 'Audio codec: AAC LC (low complexity). Video codec recommendation: H264, Baseline, Main, or High Profile with a 4:2:0 color space.',
      notes: 'Maximum file size: 512 MB.'
    }
  ],
  linkedin: [
    {
      name: 'Post Image (Rec.)',
      type: 'image',
      dimensions: { width: 1200, height: 627 },
      aspectRatio: '1.91:1',
      format: 'Image',
      fileTypes: ['JPG', 'PNG', 'GIF'],
      fileSize: 'Up to 5MB',
      notes: 'Recommended for shared link previews and single image posts.'
    },
    {
      name: 'Post (Square)',
      type: 'image',
      dimensions: { width: 1080, height: 1080 },
      aspectRatio: '1:1',
      format: 'Image',
      fileTypes: ['JPG', 'PNG', 'GIF'],
      fileSize: 'Up to 5MB',
      notes: 'Ideal for general updates and balanced visuals.'
    },
    {
      name: 'Post (Vertical)',
      type: 'image',
      dimensions: { width: 1080, height: 1350 },
      aspectRatio: '4:5',
      format: 'Image',
      fileTypes: ['JPG', 'PNG', 'GIF'],
      fileSize: 'Up to 5MB',
      notes: 'Optimized for mobile viewing, but might be cropped on desktop.'
    }
  ],
  youtube: [
    {
      name: 'Video (HD)',
      type: 'video',
      dimensions: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
      format: 'Video',
      fileTypes: ['MPG', 'MP4', 'AVI'],
      fileSize: 'Up to 256GB',
      settings: 'MPEG-2 (Audio codec: MPEG Layer II or Dolby AC-3. Audio bitrate: 128 kbps or better), MPEG-4 (Video codec: H.264, Audio codec: AAC, Audio bitrate: 128 kbps or better)',
      notes: 'Minimum HD resolution for all uploads.'
    },
    {
      name: 'Video Thumbnail',
      type: 'image',
      dimensions: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      format: 'Image',
      fileTypes: ['JPG', 'PNG', 'GIF'],
      fileSize: 'Up to 5MB',
      notes: 'Have a resolution of 1280x720 (with a minimum width of 640 pixels). Remain under 2MB. Use a 16:9 aspect ratio.'
    }
  ],
  tiktok: [
    {
      name: 'In-Feed Video',
      type: 'video',
      dimensions: { width: 1080, height: 1920 },
      aspectRatio: '9:16',
      format: 'Video',
      fileTypes: ['MP4', 'MOV', 'MPEG'],
      fileSize: 'Up to 500MB',
      settings: 'Bitrate: ≥2,500kbps.',
      notes: 'Recommended size. Other dimensions will have black bars added for full-screen display.'
    },
    {
      name: 'In-Feed Ad',
      type: 'image',
      dimensions: { width: 1080, height: 1920 },
      aspectRatio: '9:16',
      format: 'Image',
      fileTypes: ['JPG', 'PNG'],
      fileSize: 'Up to 100KB',
      notes: 'Vertical (9:16) is highly recommended for best performance. Aspect ratio is 16:9, 1:1 or 9:16.'
    }
  ]
};

