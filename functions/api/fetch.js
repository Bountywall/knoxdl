export default {
  async fetch(request) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const tweetUrl = url.searchParams.get('url');
    if (!tweetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return new Response(JSON.stringify({ error: 'Invalid X post URL.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tweetId = tweetIdMatch[1];
    const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue&token=x`;

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
        return new Response(JSON.stringify({ error: 'Tweet not found or private.' }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tweetData = await res.json();
      const variants = [];
      const mediaItems = tweetData?.mediaDetails || tweetData?.entities?.media || [];

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

      if (variants.length === 0) {
        return new Response(JSON.stringify({ error: 'No video found in this post.' }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ variants }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to fetch tweet data.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
