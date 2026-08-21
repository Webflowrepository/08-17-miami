const CHANNELS = ["linkedin", "instagram", "newsletter", "website", "youtube", "spotify"];
const PRIMARY_CHANNELS = ["linkedin", "instagram"];

const channelNames = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  newsletter: "Newsletter",
  website: "Website",
  youtube: "YouTube",
  spotify: "Spotify"
};

const state = {
  data: null,
  period: "month",
  periodKey: "",
  channel: "all",
  websiteRange: "day",
  newsletterRange: "month"
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en", { notation: Number(value) >= 1000000 ? "compact" : "standard" }).format(Number(value || 0));

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("es", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Sin fecha";

function monthKey(value) {
  if (!value) return "unknown";
  return new Date(value).toISOString().slice(0, 7);
}

function weekKey(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return start.toISOString().slice(0, 10);
}

function periodKeyFor(item) {
  if (state.period === "all") return "all";
  if (state.period === "week") return weekKey(item.publishedAt);
  return item.month || monthKey(item.publishedAt);
}

function periodLabel(key) {
  if (key === "all") return "Todo";
  if (key === "unknown") return "Sin fecha";
  if (state.period === "week") return `Semana de ${formatDate(key)}`;
  const [year, month] = key.split("-");
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1));
}

function contentItems() {
  return state.data.contentItems || [];
}

function periodOptions() {
  if (state.period === "all") return ["all"];
  const keys = [...new Set(contentItems().map(periodKeyFor))];
  const known = keys.filter((key) => key !== "unknown").sort().reverse();
  return [...known, ...(keys.includes("unknown") ? ["unknown"] : [])];
}

function filteredItems({ ignoreChannel = false } = {}) {
  return contentItems().filter((item) => {
    const periodMatch = state.period === "all" || periodKeyFor(item) === state.periodKey;
    const channelMatch = ignoreChannel || state.channel === "all" || item.platform === state.channel;
    return periodMatch && channelMatch;
  });
}

function score(item) {
  return item.score ?? null;
}

function isProxy(item) {
  return item.signal === "profile_proxy";
}

function engagementText(item) {
  const metrics = item.metrics || {};
  const parts = [];
  if (metrics.views) parts.push(`${formatNumber(metrics.views)} views`);
  if (metrics.users) parts.push(`${formatNumber(metrics.users)} users`);
  if (metrics.sessions) parts.push(`${formatNumber(metrics.sessions)} sessions`);
  if (metrics.opens) parts.push(`${formatNumber(metrics.opens)} opens`);
  if (metrics.clicks) parts.push(`${formatNumber(metrics.clicks)} clicks`);
  if (metrics.openRate) parts.push(`${metrics.openRate}% open`);
  if (metrics.clickRate) parts.push(`${metrics.clickRate}% click`);
  if (metrics.followers) parts.push(`${formatNumber(metrics.followers)} followers`);
  if (metrics.subscribers) parts.push(`${formatNumber(metrics.subscribers)} subscribers`);
  if (metrics.likes) parts.push(`${formatNumber(metrics.likes)} likes`);
  if (metrics.comments) parts.push(`${formatNumber(metrics.comments)} comments`);
  return parts.length ? parts.join(" · ") : "Pendiente";
}

function channelById() {
  return Object.fromEntries(state.data.channels.map((channel) => [channel.id, channel]));
}

function channelStats(channelId) {
  const channel = channelById()[channelId];
  const items = filteredItems({ ignoreChannel: true }).filter((item) => item.platform === channelId);
  const rankable = items.filter((item) => score(item) != null);
  const realRankable = rankable.filter((item) => !isProxy(item));
  const best = rankable.slice().sort((a, b) => score(b) - score(a))[0] || null;
  return { channel, items, rankable, realRankable, best };
}

function sourceLabel(item) {
  if (isProxy(item)) return "Proxy hasta conectar fuente";
  if (item.signal?.includes("api")) return "Dato real por API";
  if (item.signal?.includes("rss")) return "Dato publico";
  return "Dato importado";
}

function readingFor(item) {
  if (isProxy(item)) {
    if (item.platform === "linkedin") return "Falta conectar posts; es prioridad para medir POV y comentarios.";
    if (item.platform === "instagram") return "Falta conectar insights; es prioridad para reels, saves y shares.";
    if (item.platform === "newsletter") return "Falta Beehiiv; va a medir opens, clicks y crecimiento.";
    if (item.platform === "website") return "Falta GA4; va a medir demanda real del sitio.";
    return "Falta API/export para performance completa.";
  }
  return item.nextUse || "Usar como referencia para decidir proximos contenidos.";
}

function itemsForRange(platform, range) {
  const now = Date.now();
  const days = range === "day" ? 1 : range === "week" ? 7 : range === "month" ? 30 : 3650;
  const items = contentItems().filter((item) => item.platform === platform && !isProxy(item));
  const rangedItems = items.filter(
    (item) => range === "all" || (item.publishedAt && now - new Date(item.publishedAt).getTime() <= days * 24 * 60 * 60 * 1000)
  );
  return (rangedItems.length ? rangedItems : items)
    .sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1));
}

function renderBars(target, items, valueLabel = "views") {
  const max = Math.max(1, ...items.map((item) => score(item) || 0));
  document.querySelector(target).innerHTML =
    items.slice(0, 8).map((item, index) => {
      const value = score(item) || 0;
      const width = Math.max(4, Math.round((value / max) * 100));
      const title = item.url ? `<a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title;
      const detail = item.platform === "website" ? cleanWebsitePath(item.title) : `${formatDate(item.publishedAt)} · ${engagementText(item)}`;
      return `<article class="bar-row">
        <div class="bar-meta">
          <strong>${index + 1}. ${title}</strong>
          <span>${detail}</span>
        </div>
        <div class="bar-track"><span style="width:${width}%"></span></div>
        <b>${formatNumber(value)} ${valueLabel}</b>
      </article>`;
    }).join("") || `<article class="empty-insight">No hay datos reales para este rango todavia.</article>`;
}

function cleanWebsitePath(title) {
  return title.replace(/^Website\s*/, "") || "/";
}

function renderWebsiteInsight() {
  document.querySelectorAll("[data-website-range]").forEach((button) => {
    button.classList.toggle("active", button.dataset.websiteRange === state.websiteRange);
  });
  const items = itemsForRange("website", state.websiteRange);
  renderBars("#website-bars", items, "views");
  const top = items[0];
  const fallback = state.websiteRange !== "all" && !contentItems().some(
    (item) => item.platform === "website" && !isProxy(item) && item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() <= (state.websiteRange === "day" ? 1 : state.websiteRange === "week" ? 7 : 30) * 24 * 60 * 60 * 1000
  );
  document.querySelector("#website-read").innerHTML = top
    ? `<strong>Que mejorar</strong><p>${cleanWebsitePath(top.title)} concentra la mayor atencion disponible. Revisar CTA, continuidad hacia newsletter/podcast y si merece una pieza de LinkedIn o Instagram.</p><span>${fallback ? "Este rango todavia no tenia datos suficientes; muestro el mejor dato disponible." : "Cloudflare entrega paths por ventana corta; semana/mes se robustecen a medida que el sync acumula historial."}</span>`
    : `<strong>Que falta</strong><p>Cloudflare ya esta conectado. El historico semanal/mensual se va a fortalecer con cada sync horario.</p>`;
}

function renderNewsletterInsight() {
  document.querySelectorAll("[data-newsletter-range]").forEach((button) => {
    button.classList.toggle("active", button.dataset.newsletterRange === state.newsletterRange);
  });
  const items = itemsForRange("newsletter", state.newsletterRange);
  renderBars("#newsletter-bars", items, "score");
  const top = items[0];
  const fallback = state.newsletterRange !== "all" && !contentItems().some(
    (item) => item.platform === "newsletter" && !isProxy(item) && item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() <= (state.newsletterRange === "week" ? 7 : 30) * 24 * 60 * 60 * 1000
  );
  document.querySelector("#newsletter-read").innerHTML = top
    ? `<strong>Hacia donde apuntar</strong><p>El issue con mejor senal es "${top.title}". Usar ese tema como insumo para posts de LinkedIn, clips de Instagram y proxima editorial.</p><span>${fallback ? "Este rango todavia no tenia datos suficientes; muestro el mejor issue disponible." : engagementText(top)}</span>`
    : `<strong>Que falta</strong><p>Beehiiv esta conectado, pero este rango todavia no tiene issues con metricas disponibles.</p>`;
}

function renderSyncStatus() {
  document.querySelector("#sync-label").textContent = "Auto-sync activo";
  document.querySelector("#sync-time").textContent = `Ultimo sync: ${formatDate(state.data.lastSyncAt)}`;
  document.querySelector("#sidebar-mode").textContent = state.data.mode || "local";
}

function renderControls() {
  document.querySelectorAll(".period-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.period === state.period);
  });

  const periodSelect = document.querySelector("#month-filter");
  const channelSelect = document.querySelector("#content-channel-filter");
  const options = periodOptions();
  if (!options.includes(state.periodKey)) state.periodKey = options[0] || "all";
  periodSelect.innerHTML = options.map((key) => `<option value="${key}">${periodLabel(key)}</option>`).join("");
  periodSelect.value = state.periodKey;
  channelSelect.value = state.channel;
}

function renderSummary() {
  const items = filteredItems();
  const rankable = items.filter((item) => score(item) != null);
  const realItems = items.filter((item) => !isProxy(item));
  const proxyItems = items.filter(isProxy);
  const top = rankable.slice().sort((a, b) => score(b) - score(a))[0];

  const cards = [
    ["Publicaciones", formatNumber(realItems.length), proxyItems.length ? `${proxyItems.length} senales proxy` : "datos reales"],
    ["Rankeables", `${rankable.length}/${items.length}`, "con score"],
    ["Top canal", top ? channelNames[top.platform] : "Pendiente", top ? `${formatNumber(score(top))} score` : "sin data"],
    ["Prioridad", "LinkedIn + IG", "canales principales"]
  ];

  document.querySelector("#summary-grid").innerHTML = cards
    .map(([label, value, note]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>`)
    .join("");
}

function renderRegistry() {
  const rows = filteredItems()
    .slice()
    .sort((a, b) => Number(isProxy(a)) - Number(isProxy(b)) || (score(b) ?? -1) - (score(a) ?? -1));

  document.querySelector("#content-table-body").innerHTML =
    rows
      .map((item) => {
        const title = item.url ? `<a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title;
        return `<tr class="${isProxy(item) ? "proxy-row" : ""}">
          <td><strong>${title}</strong><span>${sourceLabel(item)}</span></td>
          <td><span class="channel-dot ${item.platform}"></span>${channelNames[item.platform] || item.platform}</td>
          <td>${formatDate(item.publishedAt)}</td>
          <td>${engagementText(item)}</td>
          <td>${score(item) == null ? "Sin score" : formatNumber(score(item))}</td>
          <td>${readingFor(item)}</td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="6" class="empty-cell">No hay registros para este periodo/canal.</td></tr>`;
}

function renderComparison() {
  document.querySelector("#comparison-grid").innerHTML = CHANNELS.map((id) => {
    const stats = channelStats(id);
    const connected = stats.channel.status === "connected";
    const primary = PRIMARY_CHANNELS.includes(id);
    return `<button class="comparison-card ${id} ${primary ? "primary" : ""}" data-channel-pick="${id}" type="button">
      <div class="platform"><span class="badge">${stats.channel.name[0]}</span>${stats.channel.name}${primary ? '<span class="priority-tag">Primary</span>' : ""}</div>
      <dl>
        <div><dt>Registros</dt><dd>${stats.items.length}</dd></div>
        <div><dt>Reales</dt><dd>${stats.realRankable.length}</dd></div>
        <div><dt>Estado</dt><dd>${connected ? "OK" : "Falta"}</dd></div>
        <div><dt>Top</dt><dd>${stats.best ? formatNumber(score(stats.best)) : "-"}</dd></div>
      </dl>
      <strong>${connected ? "Conectado" : "Necesita credenciales"}</strong>
    </button>`;
  }).join("");

  document.querySelectorAll("[data-channel-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      state.channel = button.dataset.channelPick;
      render();
    });
  });
}

function missingFor(channel) {
  const missing = {
    linkedin: "LinkedIn org ID + access token con lectura de posts/analytics.",
    instagram: "Meta token + Instagram Business ID.",
    newsletter: "Beehiiv API key y publication ID.",
    website: "GA4 property ID + service account con Viewer.",
    youtube: "YouTube API key para views/stats completos.",
    spotify: "Spotify client ID/secret para episodios."
  };
  return missing[channel.id] || "Credenciales de lectura.";
}

function renderQueue() {
  document.querySelector("#queue-list").innerHTML = state.data.channels
    .map((channel) => `<article class="queue-row">
      <div>
        <strong>${channel.name}</strong>
        <span class="queue-meta">${channel.status === "connected" ? "Listo: se actualiza en cada sync." : missingFor(channel)}</span>
      </div>
      <span class="pill ${channel.status === "connected" ? "connected" : "linked"}">${channel.status === "connected" ? "conectado" : "pendiente"}</span>
    </article>`)
    .join("");
}

function render() {
  renderSyncStatus();
  renderControls();
  renderSummary();
  renderWebsiteInsight();
  renderNewsletterInsight();
  renderRegistry();
  renderComparison();
  renderQueue();
}

async function loadData() {
  const response = await fetch(`/dashboard/social-data.json?ts=${Date.now()}`);
  if (!response.ok) throw new Error("No se pudo cargar social-data.json");
  state.data = await response.json();
  render();
}

document.querySelectorAll(".period-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.period = button.dataset.period;
    state.periodKey = "";
    render();
  });
});

document.querySelector("#month-filter").addEventListener("change", (event) => {
  state.periodKey = event.target.value;
  render();
});

document.querySelector("#content-channel-filter").addEventListener("change", (event) => {
  state.channel = event.target.value;
  render();
});

document.querySelectorAll("[data-website-range]").forEach((button) => {
  button.addEventListener("click", () => {
    state.websiteRange = button.dataset.websiteRange;
    render();
  });
});

document.querySelectorAll("[data-newsletter-range]").forEach((button) => {
  button.addEventListener("click", () => {
    state.newsletterRange = button.dataset.newsletterRange;
    render();
  });
});

loadData().catch((error) => {
  document.querySelector("#sync-label").textContent = "Error";
  document.querySelector("#sync-time").textContent = error.message;
});
