/**
 * knoxvid — Cloudflare Worker
 * File: functions/api/fetch.js  (for Cloudflare Pages Functions)
 *
 * This Worker receives a ?url= query param containing an X/Twitter post URL,
 * fetches the tweet data from the Twitter syndication API (no auth required for public tweets),
 * and returns the available video variants (url + bitrate + resolution).
 *
 * Deploy path: /functions/api/fetch.js in your repo
 * This will automatically become the /api/fetch route on Cloudflare Pages.
 */

export async function onRequestGet(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://knoxvid.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const tweetUrl = url.searchParams.get('url');

  if (!tweetUrl) {
    return json({ error: 'Missing url parameter.' }, 400, corsHeaders);
  }

  // Extract tweet ID from URL
  // Supports: https://x.com/user/status/12345 or https://twitter.com/user/status/12345
  const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
  if (!tweetIdMatch) {
    return json({ error: 'Invalid X post URL. Could not extract tweet ID.' }, 400, corsHeaders);
  }

  const tweetId = tweetIdMatch[1];

  // Use Twitter's public syndication API — no API key required for public tweets
  const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue&token=x`;

  let tweetData;
  try {
    const res = await fetch(syndicationUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; knoxvid/1.0)',
        'Accept': 'application/json',
        'Referer': 'https://platform.twitter.com/',
        'Origin': 'https://platform.twitter.com',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return json({ error: 'Tweet not found. It may have been deleted or the account is private.' }, 404, corsHeaders);
      }
      throw new Error(`Syndication API returned ${res.status}`);
    }

    tweetData = await res.json();
  } catch (err) {
    return json({ error: 'Failed to fetch tweet data. Please try again.' }, 500, corsHeaders);
  }

  // Walk the tweet data to find video variants
  const variants = extractVariants(tweetData);

  if (!variants || variants.length === 0) {
    return json({ error: 'No video found in this post. Make sure the post contains a video (not just an image or GIF).' }, 422, corsHeaders);
  }

  return json({ variants }, 200, corsHeaders);
}

/**
 * Recursively extract video variants from tweet JSON.
 * Twitter embeds video in mediaDetails[].video_info.variants
 */
function extractVariants(data) {
  const variants = [];

  const mediaItems = data?.mediaDetails || data?.entities?.media || [];

  for (const media of mediaItems) {
    if (media.type === 'video' || media.type === 'animated_gif') {
      const videoInfo = media.video_info;
      if (videoInfo?.variants) {
        for (const v of videoInfo.variants) {
          if (v.content_type === 'video/mp4' && v.url) {
            const entry = { url: v.url };
            if (v.bitrate !== undefined) entry.bitrate = v.bitrate;

            // Try to get resolution from URL (e.g. /1280x720/)
            const resMatch = v.url.match(/\/(\d+x\d+)\//);
            if (resMatch) entry.resolution = resMatch[1].replace('x', ' × ') + 'p';

            variants.push(entry);
          }
        }
      }
    }
  }

  return variants;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
