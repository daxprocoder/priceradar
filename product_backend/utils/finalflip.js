import axios from "axios";
import * as cheerio from "cheerio";
import { isIrrelevantProduct } from "./filterUtils.js";
import { computeMatchScore } from "./scoreUtils.js";

// ─────────────────────────────────────────────────────────────
// Session cookies from env vars (set in Vercel dashboard).
// Requests WITH valid auth cookies bypass Flipkart's 403 block
// because they look like real, authenticated browser sessions.
// ─────────────────────────────────────────────────────────────
const ud = process.env.FLIP_UD || "";
const at = process.env.FLIP_AT || "";
const rt = process.env.FLIP_RT || "";
let   SN = process.env.FLIP_SN || "";
let   S  = process.env.FLIP_S  || "";
let   vd = process.env.FLIP_VD || "";

const hasCookies = () => !!(ud || at || rt);

// ─────────────────────────────────────────────────────────────
// AUTHENTICATED API INSTANCE  (used for ALL Flipkart requests)
// ─────────────────────────────────────────────────────────────
const flipkartAPI = axios.create({
  baseURL: "https://www.flipkart.com",
  timeout: 15000,
  headers: {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://www.google.co.in/",
  },
});

function buildCookieString() {
  return `ud=${ud}; at=${at}; rt=${rt}; SN=${SN}; S=${S}; vd=${vd};`
    .replace(/\s+/g, " ").trim();
}

flipkartAPI.defaults.headers.Cookie = buildCookieString();

// ─────────────────────────────────────────────────────────────
// Refresh volatile session values to avoid stale-session blocks
// ─────────────────────────────────────────────────────────────
function refreshSessionCookies() {
  const ts = Date.now();
  SN = `VIE${ts}.TOK${ts}.${ts}.LI`;
  S  = `fresh_${ts}`;
  vd = `VIE${ts}-${ts}-1.${ts}.${ts}.${ts}`;
  flipkartAPI.defaults.headers.Cookie = buildCookieString();
  console.log("✅ Flipkart session cookies refreshed");
}

// ─────────────────────────────────────────────────────────────
// SEARCH PAGE SCRAPER  (authenticated — avoids 403)
// ─────────────────────────────────────────────────────────────
async function fetchSearchResults(query) {
  const res = await flipkartAPI.get(`/search?q=${encodeURIComponent(query)}`);
  console.log(`🛍️ Flipkart search status: ${res.status}`);

  const $ = cheerio.load(res.data);
  const results = [];

  $("div[data-id]").each((_, el) => {
    if (results.length >= 8) return;

    // Flipkart changes class names often — try multiple variants
    const title =
      $(el).find(".KzDlHZ, .RG5Slk, .wjcEIp, ._4rR01T").first().text().trim();
    const priceRaw =
      $(el).find(".Nx9bqj, ._30jeq3, .hZ3P6w.DeU9vF").first().text().trim();
    const image = $(el).find("img").first().attr("src");
    const href  = $(el).find("a").first().attr("href");

    if (title && priceRaw && href) {
      results.push({
        title,
        price: priceRaw,
        image: image || null,
        link: href.startsWith("http")
          ? href
          : `https://www.flipkart.com${href}`,
      });
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────────
// OFFER EXTRACTION from product page __INITIAL_STATE__ JSON
// ─────────────────────────────────────────────────────────────
async function extractOffersFromProductPage(fullUrl) {
  try {
    console.log("📄 Extracting Flipkart bank offers...");

    const res = await flipkartAPI.get(fullUrl, {
      headers: {
        // Mobile UA loads the lightweight offer widget
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "Sec-Ch-Ua-Mobile": "?1",
      },
    });

    const $ = cheerio.load(res.data);
    const script = $("script")
      .filter((_, el) => $(el).html()?.includes("window.__INITIAL_STATE__"))
      .first()
      .html();

    if (!script) return [];

    const jsonMatch = script.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*\});?/s);
    if (!jsonMatch?.[1]) return [];

    let state;
    try { state = JSON.parse(jsonMatch[1]); } catch { return []; }

    const slots = state?.multiWidgetState?.widgetsData?.slots || [];

    const offersList = slots
      .filter(
        (slot) =>
          slot?.slotData?.slotType === "WIDGET" &&
          Array.isArray(slot?.slotData?.widget?.data?.offers)
      )
      .flatMap((slot) => slot.slotData.widget.data.offers);

    const bankOfferRows = offersList
      .flatMap((s) => s?.value?.offerSummariesRC || [])
      .filter((o) => (o?.value?.offerTitle || "").toLowerCase() === "bank offers")
      .flatMap((o) => o.value?.bankOfferGrid || [])
      .filter((row) => {
        const title   = row?.value?.offerTitle || "";
        const content = row?.value?.offerSubTitleRC?.value?.contentList?.[0]?.contentValue || "";
        return title !== "Multiple Banks" && content !== "Debit Card";
      });

    console.log(`✅ Flipkart bank offer rows: ${bankOfferRows.length}`);

    return bankOfferRows.map((row) => ({
      offerTitle: row.value?.offerTitle || null,
      discountedPriceText: row.value?.discountedPriceText || null,
    }));
  } catch (err) {
    console.error("❌ Flipkart offer extraction error:", err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT  (called by scrapeController)
// ─────────────────────────────────────────────────────────────
export const scrapeFlipkartSearch = async (query) => {
  // Without cookies Flipkart returns 403 from datacenter IPs.
  // Fail fast instead of hanging for the full 15 s timeout.
  if (!hasCookies()) {
    console.log("⚠️  Flipkart: no FLIP_* session cookies — skipping. Add them in Vercel env vars.");
    return null;
  }

  try {
    refreshSessionCookies();

    const list = await fetchSearchResults(query);
    if (!list.length) {
      console.log("⚠️  Flipkart: search page returned no products.");
      return null;
    }

    const ranked = list
      .filter((r) => r.title && !isIrrelevantProduct(r.title))
      .map((r) => ({ ...r, matchScore: computeMatchScore(r.title, query) }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const best = ranked[0];
    if (!best) return null;

    console.log(`✅ Best Flipkart match: ${best.title}`);

    // Pull bank offers from the product page
    const rawOffers = await extractOffersFromProductPage(best.link);
    const priceNum  = parseInt(String(best.price).replace(/[^0-9]/g, ""), 10);

    const offers = rawOffers.map((offer) => {
      let discountAmount = null;
      if (offer.discountedPriceText) {
        const m = offer.discountedPriceText.match(/₹([\d,]+)/);
        if (m) discountAmount = priceNum - parseInt(m[1].replace(/,/g, ""), 10);
      }
      return { offerTitle: offer.offerTitle, discountAmount };
    });

    return {
      title:  best.title,
      link:   best.link,
      price:  priceNum,
      image:  best.image,
      offers,
      store:  "Flipkart",
    };

  } catch (err) {
    console.error("Flipkart Scrape Error:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// ALERT: detailed scrape for a single product URL
// ─────────────────────────────────────────────────────────────
export const scrapeProductDetails = async (productUrl) => {
  if (!hasCookies()) return null;
  try {
    const res = await flipkartAPI.get(productUrl);
    const $ = cheerio.load(res.data);
    const title    = $(".VU-Z7G, ._2NKhZn, .B_NuCI").first().text().trim();
    const priceRaw = $(".Nx9bqj.C_PkhZ, ._30jeq3._16Jk6d").first().text().trim();
    const image    = $("img.DByo4Z, img._396csV").first().attr("src");
    return {
      title:  title || null,
      price:  priceRaw ? parseInt(priceRaw.replace(/[^0-9]/g, ""), 10) : null,
      image:  image || null,
      url:    productUrl,
    };
  } catch (err) {
    console.error("Flipkart Detail Scrape Error:", err.message);
    return null;
  }
};