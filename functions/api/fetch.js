function getToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, '');
}

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  // ── Download proxy (?download=1&url=...) ─────────────────────────────────
  if (url.searchParams.get('download') === '1') {
    const videoUrl = url.searchParams.get('url');
    if (!videoUrl) return json({ error: 'Missing url parameter.' }, 400);

    try {
      const videoRes = await fetch(videoUrl, {
        headers: {
          'Referer': 'https://twitter.com/',
          'Origin': 'https://twitter.com',
        }
      });

      if (!videoRes.ok) throw new Error(`Upstream ${videoRes.status}`);

      const filename = videoUrl.match(/\/([^/?#]+\.mp4)/i)?.[1] || 'knoxdl-video.mp4';

      return new Response(videoRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': videoRes.headers.get('Content-Length') || '',
        }
      });
    } catch (err) {
      return json({ error: 'Failed to proxy video.' }, 500);
    }
  }

  // ── Tweet variant fetch (?url=https://x.com/...) ─────────────────────────
  const tweetUrl = url.searchParams.get('url');
  if (!tweetUrl) return json({ error: 'Missing url parameter.' }, 400);

  const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
  if (!tweetIdMatch) return json({ error: 'Invalid X post URL.' }, 400);

  const tweetId = tweetIdMatch[1];
  const token = getToken(tweetId);
  const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${token}`;

  try {
    const res = await fetch(syndicationUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; knoxdl/1.0)',
        'Accept': 'application/json',
        'Referer': 'https://platform.twitter.com/',
        'Origin': 'https://platform.twitter.com',
      },
    });

    if (!res.ok) return json({ error: 'Tweet not found or private.' }, res.status);

    const tweetData = await res.json();
    const variants = extractVariants(tweetData);

    if (variants.length === 0) return json({ error: 'No video found in this post.' }, 422);

    return json({ variants });

  } catch (err) {
    return json({ error: 'Failed to fetch tweet data.' }, 500);
  }
}
