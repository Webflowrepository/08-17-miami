/**
 * Cloudflare Pages Function — /api/ig-feed
 * Fetches the latest @gild.hq posts from the Instagram Graph API.
 *
 * Required env vars (set in Cloudflare Pages → Settings → Environment Variables):
 *   META_ACCESS_TOKEN          — long-lived Meta user token (60 days; re-run get-instagram-token.mjs to refresh)
 *   GILD_INSTAGRAM_BUSINESS_ID — Instagram Business Account ID (found once by the setup script)
 */

export async function onRequest(context) {
  const token = context.env.META_ACCESS_TOKEN;
  const igId  = context.env.GILD_INSTAGRAM_BUSINESS_ID;

  if (!token || !igId) {
    return Response.json(
      { posts: [], configured: false, note: 'Set META_ACCESS_TOKEN and GILD_INSTAGRAM_BUSINESS_ID in env.' },
      { headers: corsHeaders() }
    );
  }

  try {
    const url = new URL(`https://graph.facebook.com/v20.0/${igId}/media`);
    url.searchParams.set('fields', 'id,media_type,media_url,thumbnail_url,permalink,timestamp');
    url.searchParams.set('limit', '12');
    url.searchParams.set('access_token', token);

    const res  = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      console.error('Instagram API error:', data.error);
      return Response.json(
        { posts: [], configured: true, error: data.error.message },
        { headers: corsHeaders() }
      );
    }

    const posts = (data.data || [])
      .filter(p => p.media_url || p.thumbnail_url)
      .map(p => ({
        id:  p.id,
        url: p.permalink,
        img: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
        type: p.media_type,
        ts:  p.timestamp,
      }));

    return Response.json(
      { posts, configured: true },
      {
        headers: {
          ...corsHeaders(),
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    console.error('ig-feed error:', err);
    return Response.json(
      { posts: [], configured: true, error: err.message },
      { headers: corsHeaders() }
    );
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
}
