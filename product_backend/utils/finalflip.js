import axios from "axios";
import { computeMatchScore } from "../utils/scoreUtils.js";
import { isIrrelevantProduct } from "../utils/filterUtils.js";

// Flipkart's internal Rome API — used by their own mobile app
// Not protected by Akamai, returns clean JSON
const ROME_API_BASE = "https://2.rome.api.flipkart.com/api/3/page/fetch";

const HEADERS = {
  "User-Agent": "Flipkart/7.15.0 (Android; 14; Google; Pixel 8; en_IN)",
  "Accept": "application/json",
  "Accept-Language": "en-IN,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "X-User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 FKUA/1.0",
  "Connection": "keep-alive",
};

/**
 * Extracts product data from a Rome API widget section.
 */
function parseRomeProducts(responseData) {
  const results = [];

  try {
    // Rome API response structure: pageData -> slots -> widget -> data -> products
    const slots = responseData?.pageData?.page?.slots || [];

    for (const slot of slots) {
      const widget = slot?.widget;
      if (!widget) continue;

      // Products can be nested inside different widget types
      const products =
        widget?.data?.products ||
        widget?.data?.response?.data?.products ||
        [];

      for (const product of products) {
        if (results.length >= 10) break;

        const value = product?.value || product;
        const title =
          value?.productInfo?.value?.title ||
          value?.title ||
          null;

        const priceObj =
          value?.productInfo?.value?.pricing ||
          value?.pricing ||
          null;

        const rawPrice =
          priceObj?.finalPrice?.decimalValue ||
          priceObj?.mrp?.decimalValue ||
          null;

        const image =
          value?.productInfo?.value?.media?.videos?.[0]?.url ||
          value?.productInfo?.value?.media?.images?.[0]?.url ||
          value?.media?.images?.[0]?.url ||
          null;

        const pid =
          value?.productInfo?.value?.id ||
          value?.id ||
          null;

        const link = pid
          ? `https://www.flipkart.com/${pid}`
          : null;

        if (title && rawPrice) {
          results.push({
            title,
            price: parseInt(String(rawPrice).replace(/[^0-9]/g, ""), 10),
            image: image || null,
            link: link || "https://www.flipkart.com",
            store: "Flipkart",
          });
        }
      }

      if (results.length >= 10) break;
    }
  } catch (e) {
    console.error("Flipkart Rome parse error:", e.message);
  }

  return results;
}

/**
 * Scrapes Flipkart for products matching the query using the Rome internal API.
 */
export const scrapeFlipkartSearch = async (query) => {
  const params = new URLSearchParams({
    q: query,
    as: "on",
    "as-show": "on",
    otracker: "search",
    otracker1: "search",
    marketplace: "FLIPKART",
    "as-pos": "1",
    "as-type": "RECENT",
  });

  const url = `${ROME_API_BASE}?${params.toString()}`;

  try {
    console.log("🛍️ Flipkart Rome API:", url);
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 3000 });

    const results = parseRomeProducts(data);

    if (results.length > 0) {
      console.log(`✅ Flipkart Rome: ${results.length} products found`);

      // Rank by match score and return best match
      const ranked = results
        .filter((r) => r.title && !isIrrelevantProduct(r.title))
        .map((r) => ({ ...r, matchScore: computeMatchScore(r.title, query) }))
        .sort((a, b) => b.matchScore - a.matchScore);

      console.log("🎯 Best Flipkart Match:", ranked[0]?.title);
      return ranked[0] || null;
    }

    // Fallback: try the HTML search page JSON embed
    console.log("🔄 Rome API returned no results, trying fallback...");
    return await flipkartFallback(query);

  } catch (error) {
    console.error("Flipkart Rome API Error:", error.message);
    // Try fallback on error
    try {
      return await flipkartFallback(query);
    } catch (fallbackErr) {
      console.error("Flipkart Fallback Error:", fallbackErr.message);
      return null;
    }
  }
};

/**
 * Fallback: use Flipkart's search-suggest/autocomplete API which is less protected.
 */
async function flipkartFallback(query) {
  const url = `https://www.flipkart.com/api/4/page/fetch?q=${encodeURIComponent(query)}&as=on&as-show=on&otracker=search&marketplace=FLIPKART`;

  const fallbackHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.flipkart.com/",
    "X-User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36 FKUA/1.0",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  console.log("🔄 Flipkart fallback URL:", url);
  const { data } = await axios.get(url, { headers: fallbackHeaders, timeout: 3000 });
  const results = parseRomeProducts(data);

  if (results.length > 0) {
    const ranked = results
      .filter((r) => r.title && !isIrrelevantProduct(r.title))
      .map((r) => ({ ...r, matchScore: computeMatchScore(r.title, query) }))
      .sort((a, b) => b.matchScore - a.matchScore);
    console.log("🎯 Flipkart Fallback Match:", ranked[0]?.title);
    return ranked[0] || null;
  }

  return null;
}

/**
 * Detailed Scrape for a single product URL (for Active Alerts)
 * Uses Flipkart's product page JSON API.
 */
export const scrapeProductDetails = async (productUrl) => {
  try {
    // Extract product ID from URL
    const pidMatch = productUrl.match(/\/p\/(itm[a-zA-Z0-9]+)/);
    const pid = pidMatch ? pidMatch[1] : null;

    if (!pid) {
      console.error("Could not extract PID from URL:", productUrl);
      return null;
    }

    const apiUrl = `https://2.rome.api.flipkart.com/api/3/page/fetch?pid=${pid}`;
    const { data } = await axios.get(apiUrl, { headers: HEADERS, timeout: 3000 });

    const slots = data?.pageData?.page?.slots || [];
    for (const slot of slots) {
      const value = slot?.widget?.data?.productInfo?.value;
      if (!value) continue;

      const title = value?.title;
      const rawPrice = value?.pricing?.finalPrice?.decimalValue;
      const image = value?.media?.images?.[0]?.url;

      if (title && rawPrice) {
        return {
          title,
          price: parseInt(String(rawPrice).replace(/[^0-9]/g, ""), 10),
          image: image || null,
          url: productUrl,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Flipkart Detail Scrape Error:", error.message);
    return null;
  }
};