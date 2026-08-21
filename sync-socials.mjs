import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const repoDir = new URL(".", import.meta.url);
const dashboardDir = new URL("./public/dashboard/", repoDir);
const dataPath = new URL("./social-data.json", dashboardDir);
const snapshotsPath = new URL("./social-snapshots.json", dashboardDir);
const envPath = new URL("./.env", repoDir);

const publicProfiles = {
  linkedin: {
    handle: "joingild",
    url: "https://www.linkedin.com/company/joingild/?viewAsMember=true"
  },
  instagram: {
    handle: "@gild.hq",
    url: "https://www.instagram.com/gild.hq/"
  },
  youtube: {
    handle: "@GILDhq",
    url: "https://www.youtube.com/@GILDhq",
    channelId: "UCC0lbied2G_PVm_WVK-xhrw"
  },
  spotify: {
    handle: "GILD Podcast",
    url: "https://creators.spotify.com/pod/show/0TSnQszN4VY8tyOgIYPsQy/episodes",
    showId: "0TSnQszN4VY8tyOgIYPsQy"
  },
  newsletter: {
    handle: "Beehiiv",
    url: process.env.GILD_NEWSLETTER_URL || "https://www.beehiiv.com/"
  },
  website: {
    handle: "gildhq.com",
    url: process.env.GILD_WEBSITE_URL || "https://gildhq.com/"
  }
};

const baseChannels = [
  { id: "linkedin", name: "LinkedIn", metrics: { followers: 0, posts: 0, engagementRate: 0, reach: 0 } },
  { id: "instagram", name: "Instagram", metrics: { followers: 0, posts: 0, following: 0, engagementRate: 0, reach: 0 } },
  { id: "youtube", name: "YouTube", metrics: { subscribers: 0, videos: 0, views: 0, engagementRate: 0 } },
  { id: "spotify", name: "Spotify", metrics: { followers: 0, episodes: 0, popularity: 0, saves: 0 } },
  { id: "newsletter", name: "Newsletter", metrics: { subscribers: 0, posts: 0, openRate: 0, clickRate: 0, sent: 0 } },
  { id: "website", name: "Website", metrics: { users: 0, sessions: 0, pageViews: 0, events: 0 } }
];

async function loadDotEnv() {
  try {
    const body = await fs.readFile(envPath, "utf8");
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = rest.join("=").trim();
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const requiredConfig = {
  linkedin: ["GILD_LINKEDIN_ORG_ID", "LINKEDIN_ACCESS_TOKEN"],
  instagram: ["GILD_INSTAGRAM_BUSINESS_ID", "META_ACCESS_TOKEN"],
  youtube: ["GILD_YOUTUBE_CHANNEL_ID", "YOUTUBE_API_KEY"],
  spotify: ["GILD_SPOTIFY_SHOW_ID", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
  newsletter: ["BEEHIIV_API_KEY"],
  website: []
};

function statusFor(platform) {
  const hasRequired = (requiredConfig[platform] || []).every((key) => Boolean(process.env[key]));
  const hasGoogleCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const hasCloudflareCredentials = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
  if (platform === "website") return hasCloudflareCredentials || (process.env.GA4_PROPERTY_ID && hasGoogleCredentials) ? "connected" : "profile_linked";
  return hasRequired ? "connected" : publicProfiles[platform] ? "profile_linked" : "needs_credentials";
}

const decodeXml = (value = "") =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 GILD Social Dashboard"
    }
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": "Mozilla/5.0 GILD Social Dashboard",
      accept: "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${text.slice(0, 250)}`);
  return text ? JSON.parse(text) : {};
}

async function getYouTubePublicData(channelId) {
  const [feed, page] = await Promise.allSettled([
    fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`),
    fetchText("https://www.youtube.com/@GILDhq")
  ]);

  const entries =
    feed.status === "fulfilled"
      ? [...feed.value.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
          const body = match[1];
          const videoId = body.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1] || "";
          const title = body.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "Untitled YouTube video";
          const publishedAt = body.match(/<published>([\s\S]*?)<\/published>/)?.[1] || null;
          const href = body.match(/<link rel="alternate" href="([^"]+)"/)?.[1] || publicProfiles.youtube.url;
          return {
            id: `youtube:${videoId || href}`,
            platform: "youtube",
            format: "long_form_video",
            title: decodeXml(title.trim()),
            publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
            metric: "RSS público",
            url: href,
            metrics: {},
            score: null,
            signal: "public_rss"
          };
        })
      : [];

  const enrichedEntries = await Promise.all(
    entries.slice(0, 8).map(async (entry) => {
      const stats = await getYouTubePublicVideoStats(entry.url).catch(() => ({}));
      const views = Number(stats.views || 0);
      return {
        ...entry,
        metrics: { ...entry.metrics, views },
        score: views || null,
        metric: views ? `${views} views` : entry.metric
      };
    })
  );

  const subscriberMatch =
    page.status === "fulfilled"
      ? page.value.match(/"interactionType":\{"type":"FollowAction"\},"userInteractionCount":"(\d+)"/)
      : null;

  return {
    entries: enrichedEntries.length ? enrichedEntries : entries,
    subscribers: subscriberMatch ? Number(subscriberMatch[1]) : null
  };
}

async function getYouTubePublicVideoStats(url) {
  const html = await fetchText(url);
  const views = html.match(/"viewCount":"(\d+)"/)?.[1] || html.match(/"viewCount":\{"simpleText":"([\d,\.]+)\s+views?"/i)?.[1];
  return {
    views: views ? Number(String(views).replace(/[,.]/g, "")) : 0
  };
}

async function getSpotifyPublicData(showId) {
  try {
    const body = await fetchText(`https://open.spotify.com/oembed?url=https://open.spotify.com/show/${showId}`);
    const data = JSON.parse(body);
    return {
      id: `spotify:${showId}`,
      platform: "spotify",
      format: "podcast_show",
      title: data.title || "GILD Podcast",
      publishedAt: null,
      metric: "oEmbed público",
      url: `https://open.spotify.com/show/${showId}`,
      metrics: {},
      score: null,
      signal: "public_oembed"
    };
  } catch {
    return null;
  }
}

async function getLinkedInPublicData() {
  try {
    const html = await fetchText("https://www.linkedin.com/company/joingild/");
    const description =
      html.match(/<meta name="description" content="([^"]+)"/)?.[1] ||
      html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ||
      "";
    const followersMatch = description.match(/([\d,\.]+)\s+followers/i);
    return {
      metrics: {
        followers: followersMatch ? Number(followersMatch[1].replace(/[,.]/g, "")) : 0
      },
      description: decodeXml(description)
    };
  } catch {
    return null;
  }
}

async function getInstagramPublicData() {
  try {
    const html = await fetchText("https://www.instagram.com/gild.hq/");
    const description =
      html.match(/<meta name="description" content="([^"]+)"/)?.[1] ||
      html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ||
      "";
    const followersMatch = description.match(/([\d,.]+)\s+Followers/i);
    const postsMatch = description.match(/([\d,.]+)\s+Posts/i);
    return {
      metrics: {
        followers: followersMatch ? Number(followersMatch[1].replace(/[,.]/g, "")) : 0,
        posts: postsMatch ? Number(postsMatch[1].replace(/[,.]/g, "")) : 0
      },
      description: decodeXml(description)
    };
  } catch {
    return null;
  }
}

async function getYouTubeApiData(channelId, apiKey) {
  if (!channelId || !apiKey) return null;

  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "statistics,snippet");
  channelUrl.searchParams.set("id", channelId);
  channelUrl.searchParams.set("key", apiKey);

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "5");
  searchUrl.searchParams.set("key", apiKey);

  const [channelData, searchData] = await Promise.all([fetchJson(channelUrl), fetchJson(searchUrl)]);
  const stats = channelData.items?.[0]?.statistics || {};
  const entries = (searchData.items || []).map((item) => ({
      platform: "youtube",
      format: "long_form_video",
      title: item.snippet?.title || "Untitled YouTube video",
      publishedAt: item.snippet?.publishedAt || null,
      metric: "YouTube API",
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      metrics: {},
      score: null,
      signal: "youtube_api"
  }));

  return {
    metrics: {
      subscribers: Number(stats.subscriberCount || 0),
      videos: Number(stats.videoCount || 0),
      views: Number(stats.viewCount || 0)
    },
    entries
  };
}

async function getSpotifyToken(clientId, clientSecret) {
  if (!clientId || !clientSecret) return null;
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Spotify token returned ${response.status}: ${JSON.stringify(data).slice(0, 250)}`);
  return data.access_token;
}

async function getSpotifyApiData(showId, clientId, clientSecret) {
  if (!showId || !clientId || !clientSecret) return null;
  const token = await getSpotifyToken(clientId, clientSecret);
  const show = await fetchJson(`https://api.spotify.com/v1/shows/${showId}?market=US`, {
    headers: { authorization: `Bearer ${token}` }
  });

  return {
    metrics: {
      episodes: Number(show.total_episodes || show.episodes?.total || 0)
    },
    entries: (show.episodes?.items || []).slice(0, 5).map((episode) => ({
      platform: "spotify",
      format: "podcast_episode",
      title: episode.name,
      publishedAt: episode.release_date || null,
      metric: "Spotify API",
      url: episode.external_urls?.spotify || `https://open.spotify.com/show/${showId}`,
      metrics: {},
      score: null,
      signal: "spotify_api"
    }))
  };
}

async function getInstagramApiData(businessId, token) {
  if (!businessId || !token) return null;

  const accountUrl = new URL(`https://graph.facebook.com/v20.0/${businessId}`);
  accountUrl.searchParams.set("fields", "username,followers_count,follows_count,media_count");
  accountUrl.searchParams.set("access_token", token);

  const mediaUrl = new URL(`https://graph.facebook.com/v20.0/${businessId}/media`);
  mediaUrl.searchParams.set("fields", "caption,permalink,timestamp,media_type,like_count,comments_count");
  mediaUrl.searchParams.set("limit", "5");
  mediaUrl.searchParams.set("access_token", token);

  const [account, media] = await Promise.all([fetchJson(accountUrl), fetchJson(mediaUrl)]);
  return {
    handle: account.username ? `@${account.username}` : publicProfiles.instagram.handle,
    metrics: {
      followers: Number(account.followers_count || 0),
      following: Number(account.follows_count || 0),
      posts: Number(account.media_count || 0)
    },
    entries: (media.data || []).map((item) => ({
      platform: "instagram",
      format: item.media_type === "VIDEO" ? "short_video" : "post",
      title: item.caption ? item.caption.slice(0, 90) : item.media_type || "Instagram post",
      publishedAt: item.timestamp || null,
      metric: `${Number(item.like_count || 0)} likes`,
      url: item.permalink,
      metrics: {
        likes: Number(item.like_count || 0),
        comments: Number(item.comments_count || 0)
      },
      score: Number(item.like_count || 0) + Number(item.comments_count || 0) * 2,
      signal: "instagram_api"
    }))
  };
}

async function getLinkedInApiData(orgId, token) {
  if (!orgId || !token) return null;

  const restHeaders = {
    authorization: `Bearer ${token}`,
    "LinkedIn-Version": "202505",
    "X-Restli-Protocol-Version": "2.0.0"
  };

  const postsUrl = new URL("https://api.linkedin.com/rest/posts");
  postsUrl.searchParams.set("q", "author");
  postsUrl.searchParams.set("author", `urn:li:organization:${orgId}`);
  postsUrl.searchParams.set("count", "5");
  postsUrl.searchParams.set("sortBy", "LAST_MODIFIED");

  const posts = await fetchJson(postsUrl, { headers: restHeaders });
  return {
    entries: (posts.elements || []).map((post) => ({
      platform: "linkedin",
      format: "linkedin_post",
      title:
        post.commentary ||
        post.content?.article?.title ||
        post.content?.media?.title ||
        "LinkedIn post",
      publishedAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
      metric: "LinkedIn API",
      url: publicProfiles.linkedin.url,
      metrics: {},
      score: null,
      signal: "linkedin_api"
    }))
  };
}

async function getBeehiivApiData(apiKey, publicationId) {
  if (!apiKey) return null;
  const headers = { authorization: `Bearer ${apiKey}` };
  const publicationsUrl = new URL("https://api.beehiiv.com/v2/publications");
  publicationsUrl.searchParams.append("expand[]", "stats");
  publicationsUrl.searchParams.set("limit", "100");
  const publications = await fetchJson(publicationsUrl, { headers });
  const publication =
    (publications.data || []).find((item) => item.id === publicationId) ||
    (publications.data || [])[0];
  if (!publication) throw new Error("Beehiiv API key did not return publications.");

  const postsUrl = new URL(`https://api.beehiiv.com/v2/publications/${publication.id}/posts`);
  postsUrl.searchParams.append("expand[]", "stats");
  postsUrl.searchParams.set("limit", "10");
  postsUrl.searchParams.set("order_by", "publish_date");
  postsUrl.searchParams.set("direction", "desc");
  const posts = await fetchJson(postsUrl, { headers });
  const stats = publication.stats || {};

  return {
    handle: publication.name || "Beehiiv",
    publicationId: publication.id,
    metrics: {
      subscribers: Number(stats.active_subscriptions || stats.active_free_subscriptions || 0),
      posts: Number(posts.total_results || posts.data?.length || 0),
      openRate: Number(stats.average_open_rate || 0),
      clickRate: Number(stats.average_click_rate || 0),
      sent: Number(stats.total_sent || 0)
    },
    entries: (posts.data || []).map((post) => {
      const postStats = post.stats || {};
      const emailStats = postStats.email || {};
      const webStats = postStats.web || {};
      const opens = Number(emailStats.unique_opens || emailStats.opens || postStats.email_unique_opens || postStats.unique_opens || 0) || 0;
      const clicks = Number(emailStats.unique_clicks || emailStats.clicks || postStats.email_clicks || 0) || 0;
      const webViews = Number(webStats.views || 0) || 0;
      const openRate = Number(emailStats.open_rate || 0) || 0;
      const clickRate = Number(emailStats.click_rate || 0) || 0;
      const postScore = Math.max(1, opens + clicks * 3 + Math.round(webViews * 0.5));
      return {
        platform: "newsletter",
        format: "newsletter_post",
        title: post.title || post.subtitle || "Beehiiv post",
        publishedAt: post.publish_date || post.created || null,
        metric: `${opens} opens`,
        url: post.web_url || post.url || publicProfiles.newsletter.url,
        metrics: {
          opens,
          clicks,
          views: webViews,
          openRate,
          clickRate
        },
        score: postScore,
        signal: "beehiiv_api",
        nextUse: "Use top newsletter topics as LinkedIn POV posts and Instagram carousel/reel scripts."
      };
    })
  };
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function readGoogleServiceAccount() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  return JSON.parse(await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
}

async function getGoogleAccessToken() {
  const account = await readGoogleServiceAccount();
  if (!account?.client_email || !account?.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(account.private_key, "base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const tokenResponse = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${payload}.${signature}`
    })
  });
  return tokenResponse.access_token;
}

async function getGoogleAnalyticsData(propertyId) {
  if (!propertyId) return null;
  const token = await getGoogleAccessToken();
  if (!token) return null;
  const report = await fetchJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "eventCount" }
      ]
    })
  });
  const values = report.rows?.[0]?.metricValues || [];
  const activeUsers = Number(values[0]?.value || 0);
  const sessions = Number(values[1]?.value || 0);
  const pageViews = Number(values[2]?.value || 0);
  const events = Number(values[3]?.value || 0);
  return {
    metrics: {
      users: activeUsers,
      sessions,
      pageViews,
      events
    },
    entries: [
      {
        platform: "website",
        format: "website_traffic",
        title: "Website traffic last 30 days",
        publishedAt: new Date().toISOString(),
        metric: `${activeUsers} users`,
        url: publicProfiles.website.url,
        metrics: { users: activeUsers, sessions, pageViews, events },
        score: activeUsers + sessions * 0.4 + pageViews * 0.15,
        signal: "ga4_api",
        nextUse: "Use landing-page demand to decide which content themes deserve more LinkedIn and newsletter distribution."
      }
    ]
  };
}

async function getCloudflareWebsiteData(accountId, apiToken, workerName = "gildhq") {
  if (!accountId || !apiToken) return null;
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (zoneId) {
    const topPathsQuery = `query TopPaths($zoneTag: string!, $datetimeStart: Time!, $datetimeEnd: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            limit: 100
            orderBy: [count_DESC]
            filter: { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd, requestSource: "eyeball" }
          ) {
            count
            dimensions {
              clientRequestPath
            }
            sum {
              edgeResponseBytes
            }
          }
        }
      }
    }`;
    const response = await fetchJson("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: topPathsQuery,
        variables: {
          zoneTag: zoneId,
          datetimeStart: start.toISOString(),
          datetimeEnd: now.toISOString()
        }
      })
    });
    const groups = response.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ||
      response.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ||
      [];
    const contentPaths = groups
      .map((group) => ({
        path: group.dimensions?.clientRequestPath || "/",
        views: Number(group.count || 0),
        bytes: Number(group.sum?.edgeResponseBytes || 0)
      }))
      .filter((item) => isContentPath(item.path))
      .slice(0, 12);
    if (contentPaths.length) {
      const totalViews = contentPaths.reduce((sum, item) => sum + item.views, 0);
      return {
        metrics: {
          users: 0,
          sessions: 0,
          pageViews: totalViews,
          events: contentPaths.length,
          errors: 0
        },
        entries: contentPaths.map((item) => ({
          platform: "website",
          format: "website_section",
          title: sectionTitle(item.path),
          publishedAt: now.toISOString(),
          metric: `${item.views} views`,
          url: new URL(item.path, publicProfiles.website.url).toString(),
          metrics: {
            views: item.views,
            bytes: item.bytes
          },
          score: Math.max(1, item.views),
          signal: "cloudflare_zone_api",
          nextUse: "Use this section demand to decide what should be pushed next on LinkedIn, Instagram and newsletter."
        }))
      };
    }
  }

  const query = `query WorkerMetrics($accountTag: string!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: string!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(
          filter: { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd, scriptName: $scriptName }
          limit: 10000
        ) {
          sum {
            requests
            errors
            subrequests
          }
        }
      }
    }
  }`;
  const response = await fetchJson("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: accountId,
        datetimeStart: start.toISOString(),
        datetimeEnd: now.toISOString(),
        scriptName: workerName
      }
    })
  });
  const sums = response.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0]?.sum ||
    response.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0]?.sum ||
    {};
  const requests = Number(sums.requests || 0);
  const errors = Number(sums.errors || 0);
  const subrequests = Number(sums.subrequests || 0);
  return {
    metrics: {
      users: 0,
      sessions: 0,
      pageViews: requests,
      events: subrequests,
      errors
    },
    entries: [
      {
        platform: "website",
        format: "website_worker_metrics",
        title: "Website traffic last 24 hours",
        publishedAt: now.toISOString(),
        metric: `${requests} requests`,
        url: publicProfiles.website.url,
        metrics: {
          views: requests,
          events: subrequests,
          errors
        },
        score: Math.max(1, Math.round(requests - errors * 10)),
        signal: "cloudflare_api",
        nextUse: "Use Cloudflare traffic as live demand signal; add Web Analytics later for top pages and referrers."
      }
    ]
  };
}

function isContentPath(pathname) {
  const path = String(pathname || "/").split("?")[0];
  if (!path || path === "/favicon.ico" || path === "/robots.txt" || path === "/sitemap.xml") return false;
  if (path.startsWith("/_") || path.startsWith("/__") || path.startsWith("/assets/") || path.startsWith("/cdn-cgi/")) return false;
  if (path.startsWith("/api") || path.startsWith("/wp-") || path.startsWith("/wordpress")) return false;
  if (path === "/fetch" || path === "/proxy" || path.includes("/wp-json/") || path.includes("/wp-content/")) return false;
  if (/\/\./.test(path)) return false;
  if (/\.(js|css|map|png|jpe?g|webp|gif|svg|ico|avif|mp4|mov|webm|woff2?|ttf|json|txt|xml|php|asp|aspx|env)$/i.test(path)) return false;
  return true;
}

function sectionTitle(pathname) {
  const path = String(pathname || "/").split("?")[0];
  if (path === "/") return "Website / Home";
  return `Website ${path}`;
}

async function readSnapshots() {
  try {
    return JSON.parse(await fs.readFile(snapshotsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function metricForHistory(channel) {
  return Number(channel.metrics.followers || channel.metrics.subscribers || channel.metrics.users || 0);
}

function buildAudienceHistory(snapshots) {
  const last = snapshots.slice(-8);
  const padded = [
    ...Array.from({ length: Math.max(0, 8 - last.length) }, (_, index) => ({
      label: `W-${8 - index}`,
      linkedin: 0,
      instagram: 0,
      youtube: 0,
      spotify: 0,
      newsletter: 0,
      website: 0
    })),
    ...last.map((snapshot, index) => ({
      label: index === last.length - 1 ? "Now" : `S-${last.length - index - 1}`,
      linkedin: snapshot.metrics.linkedin || 0,
      instagram: snapshot.metrics.instagram || 0,
      youtube: snapshot.metrics.youtube || 0,
      spotify: snapshot.metrics.spotify || 0,
      newsletter: snapshot.metrics.newsletter || 0,
      website: snapshot.metrics.website || 0
    }))
  ];
  return padded.slice(-8);
}

function monthKey(value) {
  if (!value) return "unknown";
  return new Date(value).toISOString().slice(0, 7);
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "number") return new Date(value < 10000000000 ? value * 1000 : value).toISOString();
  if (/^\d+$/.test(String(value))) {
    const numeric = Number(value);
    return new Date(numeric < 10000000000 ? numeric * 1000 : numeric).toISOString();
  }
  return new Date(value).toISOString();
}

function nextUseFor(item) {
  if (item.platform === "youtube") return "Clip for LinkedIn + Instagram; full episode stays YouTube.";
  if (item.platform === "spotify") return "Pair with YouTube clips and LinkedIn quote cards.";
  if (item.platform === "linkedin") return "Expand winning post into newsletter or event recap.";
  if (item.platform === "instagram") return "Retest strong creative as Reel and event proof.";
  return "Review manually.";
}

function normalizeContentItem(item) {
  const id = item.id || `${item.platform}:${item.url || item.title}`;
  const publishedAt = normalizeDate(item.publishedAt);
  return {
    id,
    platform: item.platform,
    format: item.format || "post",
    title: item.title,
    publishedAt,
    month: monthKey(publishedAt),
    url: item.url || "",
    metric: item.metric || "sin datos",
    metrics: item.metrics || {},
    score: item.score ?? null,
    signal: item.signal || item.metric || "unknown",
    nextUse: item.nextUse || nextUseFor(item)
  };
}

function profileScore(channel) {
  const metrics = channel.metrics || {};
  const audience = Number(metrics.followers || metrics.subscribers || metrics.users || 0);
  const library = Number(metrics.posts || metrics.videos || metrics.episodes || 0);
  const reach = Number(metrics.reach || metrics.views || metrics.pageViews || metrics.sessions || 0);
  const priority = channel.id === "linkedin" ? 1.35 : channel.id === "instagram" ? 1.25 : 1;
  return Math.max(1, Math.round((audience + library * 8 + reach * 0.08) * priority));
}

function profileProxyItem(channel, publishedAt) {
  const metrics = channel.metrics || {};
  const score = profileScore(channel);
  return normalizeContentItem({
    id: `${channel.id}:profile-signal:${monthKey(publishedAt)}`,
    platform: channel.id,
    format: "profile_signal",
    title: `${channel.name} profile signal`,
    publishedAt,
    url: channel.url,
    metric: `${score} proxy score`,
    metrics: {
      followers: metrics.followers || 0,
      subscribers: metrics.subscribers || 0,
      users: metrics.users || 0,
      posts: metrics.posts || 0,
      videos: metrics.videos || 0,
      episodes: metrics.episodes || 0,
      views: metrics.views || metrics.pageViews || 0,
      sessions: metrics.sessions || 0
    },
    score,
    signal: "profile_proxy",
    nextUse:
      channel.id === "linkedin"
        ? "Priority channel: import post analytics, then turn best POV posts into event and newsletter assets."
        : channel.id === "instagram"
          ? "Priority channel: import reel/post insights, then double down on rooms, clips and social proof."
          : channel.id === "newsletter"
            ? "Connect Beehiiv stats, then promote high-open topics through LinkedIn and Instagram."
            : channel.id === "website"
              ? "Connect GA4, then use traffic spikes to choose content themes for the editorial calendar."
          : nextUseFor({ platform: channel.id })
  });
}

async function main() {
  await loadDotEnv();
  publicProfiles.newsletter.handle = process.env.GILD_NEWSLETTER_HANDLE || publicProfiles.newsletter.handle;
  publicProfiles.newsletter.url = process.env.GILD_NEWSLETTER_URL || publicProfiles.newsletter.url;
  publicProfiles.website.handle = process.env.GILD_WEBSITE_HANDLE || publicProfiles.website.handle;
  publicProfiles.website.url = process.env.GILD_WEBSITE_URL || publicProfiles.website.url;
  const current = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const youtubePublic = await getYouTubePublicData(publicProfiles.youtube.channelId).catch(() => ({
    entries: [],
    subscribers: null
  }));
  const spotifyPublic = await getSpotifyPublicData(publicProfiles.spotify.showId);
  const linkedinPublic = await getLinkedInPublicData();
  const instagramPublic = await getInstagramPublicData();
  const apiData = {
    youtube: await getYouTubeApiData(
      process.env.GILD_YOUTUBE_CHANNEL_ID || publicProfiles.youtube.channelId,
      process.env.YOUTUBE_API_KEY
    ).catch((error) => ({ error: error.message })),
    spotify: await getSpotifyApiData(
      process.env.GILD_SPOTIFY_SHOW_ID || publicProfiles.spotify.showId,
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    ).catch((error) => ({ error: error.message })),
    instagram: await getInstagramApiData(process.env.GILD_INSTAGRAM_BUSINESS_ID, process.env.META_ACCESS_TOKEN).catch(
      (error) => ({ error: error.message })
    ),
    linkedin: await getLinkedInApiData(process.env.GILD_LINKEDIN_ORG_ID, process.env.LINKEDIN_ACCESS_TOKEN).catch(
      (error) => ({ error: error.message })
    ),
    newsletter: await getBeehiivApiData(process.env.BEEHIIV_API_KEY, process.env.BEEHIIV_PUBLICATION_ID).catch(
      (error) => ({ error: error.message })
    ),
    website:
      (await getCloudflareWebsiteData(
        process.env.CLOUDFLARE_ACCOUNT_ID,
        process.env.CLOUDFLARE_API_TOKEN,
        process.env.CLOUDFLARE_WORKER_NAME || "gildhq"
      ).catch((error) => ({ error: error.message }))) ||
      (await getGoogleAnalyticsData(process.env.GA4_PROPERTY_ID).catch((error) => ({ error: error.message })))
  };

  const syncedItems = [
    ...(apiData.instagram?.entries || []),
    ...(apiData.linkedin?.entries || []),
    ...(apiData.youtube?.entries || youtubePublic.entries),
    ...(apiData.spotify?.entries || (spotifyPublic ? [spotifyPublic] : [])),
    ...(apiData.newsletter?.entries || []),
    ...(apiData.website?.entries || [])
  ].map(normalizeContentItem);

  const currentById = Object.fromEntries((current.channels || []).map((channel) => [channel.id, channel]));
  const channels = baseChannels.map((baseChannel) => {
    const channel = { ...baseChannel, ...(currentById[baseChannel.id] || {}) };
    const publicProfile = publicProfiles[channel.id] || {};
    const metrics = { ...channel.metrics, ...(apiData[channel.id]?.metrics || {}) };
    if (channel.id === "linkedin" && !apiData.linkedin?.entries && linkedinPublic?.metrics.followers) {
      metrics.followers = linkedinPublic.metrics.followers;
    }
    if (channel.id === "instagram" && !apiData.instagram?.metrics && instagramPublic?.metrics) {
      if (instagramPublic.metrics.followers) metrics.followers = instagramPublic.metrics.followers;
      if (instagramPublic.metrics.posts) metrics.posts = instagramPublic.metrics.posts;
    }
    if (channel.id === "youtube") {
      if (!apiData.youtube?.metrics && youtubePublic.subscribers != null) metrics.subscribers = youtubePublic.subscribers;
      if (!apiData.youtube?.metrics && youtubePublic.entries.length) metrics.videos = youtubePublic.entries.length;
    }
    if (channel.id === "newsletter" && apiData.newsletter?.publicationId) {
      publicProfile.publicationId = apiData.newsletter.publicationId;
    }

    return {
      ...channel,
      ...publicProfile,
      metrics,
      handle:
        apiData[channel.id]?.handle ||
        process.env[`GILD_${channel.id.toUpperCase()}_HANDLE`] ||
        publicProfile.handle ||
        channel.handle,
      status: statusFor(channel.id)
    };
  });

  const now = new Date().toISOString();
  const platformsWithRealItems = new Set(syncedItems.map((item) => item.platform));
  const proxyItems = channels
    .filter((channel) => !platformsWithRealItems.has(channel.id))
    .map((channel) => profileProxyItem(channel, now));
  const contentItems = [...proxyItems, ...syncedItems];

  const next = {
    ...current,
    lastSyncAt: now,
    mode: "api-ready",
    sourceStatus: {
      linkedin: {
        url: publicProfiles.linkedin.url,
        sync: apiData.linkedin?.entries ? "api" : "profile_linked",
        note: apiData.linkedin?.error || "LinkedIn needs OAuth for posts and analytics."
      },
      instagram: {
        url: publicProfiles.instagram.url,
        sync: apiData.instagram?.metrics ? "api" : "profile_linked",
        note: apiData.instagram?.error || "Instagram needs Graph API token for durable metrics."
      },
      youtube: {
        url: publicProfiles.youtube.url,
        sync: apiData.youtube?.metrics ? "api" : "public_rss",
        note: apiData.youtube?.error || "YouTube public RSS is active; API key adds views and full stats."
      },
      spotify: {
        url: publicProfiles.spotify.url,
        sync: apiData.spotify?.metrics ? "api" : "public_oembed",
        note: apiData.spotify?.error || "Spotify oEmbed is active; API credentials add episode count."
      },
      newsletter: {
        url: publicProfiles.newsletter.url,
        sync: apiData.newsletter?.metrics ? "api" : "profile_linked",
        note: apiData.newsletter?.error || "Beehiiv API is active."
      },
      website: {
        url: publicProfiles.website.url,
        sync: apiData.website?.metrics ? apiData.website.entries?.[0]?.signal || "api" : "profile_linked",
        note: apiData.website?.error || "Cloudflare website metrics are active."
      }
    },
    channels,
    contentItems,
    recentPosts: contentItems.slice(0, 8)
  };

  const snapshots = await readSnapshots();
  const snapshot = {
    at: next.lastSyncAt,
    metrics: Object.fromEntries(next.channels.map((channel) => [channel.id, metricForHistory(channel)])),
    content: Object.fromEntries(
      next.channels.map((channel) => [
        channel.id,
        Number(channel.metrics.posts || channel.metrics.videos || channel.metrics.episodes || 0)
      ])
    )
  };
  const dedupedSnapshots = [...snapshots, snapshot]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.at === item.at) === index)
    .slice(-120);
  next.audienceHistory = buildAudienceHistory(dedupedSnapshots);

  await fs.writeFile(dataPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await fs.writeFile(snapshotsPath, `${JSON.stringify(dedupedSnapshots, null, 2)}\n`, "utf8");

  const report = next.channels.map((channel) => `${channel.name}: ${channel.status}`).join("\n");
  console.log(`GILD social sync finished\n${report}\n\nUpdated ${fileURLToPath(dataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
