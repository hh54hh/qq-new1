// Posts cache disabled - under development

export interface CachedPost {
  id: string;
  content: string;
}

export interface PostsCache {
  posts: CachedPost[];
}

export class PostsCacheManager {
  constructor(userId: string) {
    console.log("Posts cache disabled - under development");
  }

  async preloadOnLogin(): Promise<void> {
    // Disabled
  }

  async getPostsUltraFast(): Promise<CachedPost[]> {
    return [];
  }

  destroy(): void {
    // Disabled
  }
}

export function getPostsCache(userId: string): PostsCacheManager {
  return new PostsCacheManager(userId);
}

export function clearAllPostsCaches() {
  // Disabled
}
