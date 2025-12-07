import { Injectable } from '@angular/core';
import { PostResponse, SocialPost } from '../../models/post.models';

/**
 * Service for mapping backend post models to frontend models
 * Handles transformation of PostResponse (backend) to SocialPost (frontend)
 */
@Injectable({
  providedIn: 'root',
})
export class PostMappingService {
  /**
   * Map backend PostResponse to frontend SocialPost
   */
  mapPostResponse(post: PostResponse): SocialPost {
    // Extract title from content (first line or first 50 chars)
    // Handle case where content might be undefined or null
    const content = post.content || '';
    const contentLines = content.split('\n');
    const title = contentLines[0]?.substring(0, 50) || 'Untitled Post';

    // Get platforms from postTargets (handle undefined/null)
    const platforms = (post.postTargets || []).map((target) => target.platform.toLowerCase());

    // Get media URL if available
    const mediaUrl = post.media?.url;
    const mediaType = post.media?.fileType?.startsWith('image/')
      ? 'image'
      : post.media?.fileType?.startsWith('video/')
        ? 'video'
        : undefined;

    return {
      id: post.id,
      clientId: post.clientId,
      content: content, // Use the safe content variable
      status: post.status,
      scheduledAt: post.scheduledAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      title: title.length > 50 ? title + '...' : title,
      mediaUrl,
      mediaType,
      platforms,
      reactions: 0, // Will be populated from analytics later
      views: 0, // Will be populated from analytics later
    };
  }

  /**
   * Map array of PostResponse to array of SocialPost
   */
  mapPostResponseArray(posts: PostResponse[]): SocialPost[] {
    return posts.map((post) => this.mapPostResponse(post));
  }
}

