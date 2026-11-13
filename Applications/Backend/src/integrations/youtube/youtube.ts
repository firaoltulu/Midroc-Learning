import { BadGateway, Unprocessable } from '../../core/http/app-error.js';

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const supportedHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be'
]);

export function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  if (videoIdPattern.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Unprocessable('Invalid YouTube link');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Unprocessable('Invalid YouTube link');
  }
  const host = url.hostname.toLowerCase();
  if (!supportedHosts.has(host)) throw new Unprocessable('Invalid YouTube link');

  const parts = url.pathname.split('/').filter(Boolean);
  const candidate =
    host.endsWith('youtu.be') ? parts[0] :
    url.pathname === '/watch' ? url.searchParams.get('v') :
    ['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '') ? parts[1] :
    undefined;
  if (!candidate || !videoIdPattern.test(candidate)) {
    throw new Unprocessable('Invalid YouTube link');
  }
  return candidate;
}

export type YoutubeMetadata = {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
};

export async function checkYoutube(youtubeVideoId: string): Promise<YoutubeMetadata> {
  if (!videoIdPattern.test(youtubeVideoId)) throw new Unprocessable('Invalid YouTube video id');
  let response: Response;
  try {
    response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeVideoId}`)}`
    );
  } catch {
    throw new BadGateway('YouTube is unreachable');
  }
  if ([401, 403, 404].includes(response.status)) {
    throw new Unprocessable('Video is private, deleted, or not embeddable');
  }
  if (!response.ok) throw new BadGateway('YouTube is unreachable');
  let metadata: unknown;
  try {
    metadata = await response.json();
  } catch {
    throw new BadGateway('YouTube returned an invalid response');
  }
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('title' in metadata) ||
    typeof metadata.title !== 'string' ||
    !('thumbnail_url' in metadata) ||
    typeof metadata.thumbnail_url !== 'string'
  ) {
    throw new BadGateway('YouTube returned an invalid response');
  }
  return {
    youtubeVideoId,
    title: metadata.title,
    thumbnailUrl: metadata.thumbnail_url
  };
}
