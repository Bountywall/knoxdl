export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname !== '/api/fetch') {
      return env.ASSETS.fetch(request);
    }

    const tweetUrl = url.searchParams.get('url');
    if (!tweetUrl) {
      return json({ error: 'Missing url parameter.' }, 400, corsHeaders);
    }

    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return json({ error: 'Invalid X post URL.' }, 400, corsHeaders);
    }

    const tweetId = tweetIdMatch[1];
    const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue&token=x`;

    let tweetData;
    try {
      const res = await fetch(syndicationUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; knoxdl/1.0)',
          'Accept': 'application/json',
          'Referer': 'https://platform.twitter.com/',
          'Origin': 'https://platform.twitter.com',
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return json({ error: 'Tweet not found or account is private.' }, 404, corsHeaders);
        }
        throw new Error(`Syndication API returned ${res.status}`);
      }

      tweetData = await res.json();
    } catch (err) {
      return json({ error: 'Failed to fetch tweet data. Please try again.' }, 500, corsHeaders);
    }

    const variants = extractVariants(tweetData);
    if (!variants || variants.length === 0) {
      return json({ error: 'No video found in this post.' }, 422, corsHeaders);
    }

    return json({ variants }, 200, corsHeaders);
  }
};

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

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
```

Commit this, wait for deployment, then test by visiting:
```
https://knoxdl.joshast772on.workers.dev/api/fetch?url=https://x.com/Twitter/status/1445078208190291973
