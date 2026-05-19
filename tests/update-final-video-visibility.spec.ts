import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../src/app/api/github/update-final-video-visibility/route';

describe('update-final-video-visibility route', () => {
  beforeEach(() => {
    // reset env
    process.env.GITHUB_TOKEN = 'fake-token';
    process.env.GITHUB_OWNER = 'owner';
    process.env.GITHUB_REPO = 'repo';
    process.env.GITHUB_BRANCH = 'main';
    vi.restoreAllMocks();
  });

  it('updates finalVideo.visibility and commits to GitHub', async () => {
    const episode = {
      title: 'Test Episode',
      slug: 'test-episode',
      finalVideo: {
        id: 'final-video-1',
        type: 'final-story-video',
        status: 'saved',
        visibility: 'admin-only',
        url: 'https://example.com/video.mp4',
        createdAt: new Date().toISOString(),
      },
    };

    const encoded = Buffer.from(JSON.stringify(episode), 'utf-8').toString('base64');

    let putBody: any = null;

    // Mock fetch: first GET, then PUT
    // @ts-ignore
    globalThis.fetch = vi.fn(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sha: 'deadbeef', content: encoded }),
        } as any;
      }
      if (opts.method === 'PUT') {
        putBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ commit: { html_url: 'https://github.com/commit/1' } }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const fakeReq = { json: async () => ({ episodeSlug: 'test-episode', visibility: 'public-ready' }) } as unknown as Request;

    const res = await POST(fakeReq);
    const data = await res.json();

    expect(data).toBeTruthy();
    expect(data.ok).toBe(true);
    expect(data.status).toBe('final_video_visibility_updated');
    expect(putBody).toBeTruthy();

    const decoded = Buffer.from(putBody.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    expect(parsed.finalVideo).toBeTruthy();
    expect(parsed.finalVideo.visibility).toBe('public-ready');
  });
});
