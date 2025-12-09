import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { PostEditor } from './post-editor';

/**
 * Guard to check for unsaved changes before leaving the post editor
 */
export const postEditorGuard: CanDeactivateFn<PostEditor> = (component: PostEditor) => {
  return component.canLeave();
};

