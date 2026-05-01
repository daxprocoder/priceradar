import axios from "axios";
import { parse } from "node-html-parser";
import { computeMatchScore, filterValidPhones } from "../utils/scoreUtils.js";
import { isIrrelevantProduct } from "../utils/filterUtils.js";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-IN,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.google.co.in/",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};

export const scrapeAmazonRequest = async (query) => {
  try {
    let scrapedData = [];

    // --------------------------------------------------------
    // SEARCH PAGE SCRAPING
    // --------------------------------------------------------
    const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    console.log("🔍 Requesting:", url);

    const response = await axios.get(url, { headers });
    const root = parse(response.data);

    const items = root.querySelectorAll(".s-main-slot > div[data-asin]");

    for (const el of items) {
      const isSponsored = el.querySelector("span.s-sponsored-label-text")?.innerText.trim();
      if (isSponsored) continue;

      const title = el.querySelector("h2 span")?.innerText.trim();
      let price = el.querySelector(".a-price .a-offscreen")?.innerText.trim();
      const linkSuffix = el.querySelector("a.a-link-normal")?.getAttribute("href");
      const image = el.querySelector("img")?.getAttribute("src");

      if (!linkSuffix) continue;

      const link = "https://www.amazon.in" + linkSuffix;

      if (title && !isIrrelevantProduct(title)) {
        scrapedData.push({ title, price, link, image });
      }
    }

    console.log(`🛒 Amazon Scraped Items Count: ${scrapedData.length}`);

    if (!scrapedData.length) return null;

    // BEST MATCH FINDING
    const ranked = scrapedData.map((item) => ({
      ...item,
      matchScore: computeMatchScore(item.title, query),
    }));

    const valid = filterValidPhones(ranked).sort((a, b) => b.matchScore - a.matchScore);
    // const filtered = scrapedData.filter(
    //     (item) => !isIrrelevantProduct(item.title)
    // );
    const bestMatch = valid[0];

    if (!bestMatch) return null;

    console.log("✅ Best Amazon Match:", bestMatch.title);


    // --------------------------------------------------------
    // PRODUCT PAGE SCRAPING
    // --------------------------------------------------------
    const mobileHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://www.amazon.in/",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    };

    const amazonAPI = axios.create({
      baseURL: "https://www.amazon.in",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        "X-User-Agent":
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        Origin: "https://www.amazon.in",
        Referer: "https://www.amazon.in/",
      },
    });

    let sid = process.env.AMZ_SESSION_ID || "";
    let sidt = process.env.AMZ_SESSION_ID_TIME || "";
    let st = process.env.AMZ_SESSION_TOKEN || "";
    let ubid = process.env.AMZ_UBID || "";
    // let atbin = process.env.AMZ_AT_ACBIN || "";
    // let satbin = process.env.AMZ_SESS_AT_ACBIN || "";
    // let xbin = process.env.AMZ_X_ACBIN || "";

    amazonAPI.defaults.headers.Cookie = `
    session-id=${sid};
    session-id-time=${sidt};
    session-token=${st};
    ubid-acbin=${ubid};
    `
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    function refreshSessionCookies() {
      const timestamp = Date.now();

      console.log("\n🔄 Refreshing session cookies...");

      // Get current cookies
      let currentCookies = amazonAPI.defaults.headers.Cookie;

      // Update session-specific cookies to force fresh session
      // Note: We keep at, rt, ud (auth) but refresh S, SN, vd (session)
      currentCookies = currentCookies
        .replace(/session-token=[^;]+/, `session-token=fresh_${timestamp}`)
      // .replace(/SN=[^;]+/, `SN=VIE${timestamp}.TOK${timestamp}.${timestamp}.LI`)
      // .replace(/vd=[^;]+/, `vd=VIE${timestamp}-${timestamp}-1.${timestamp}.${timestamp}.${timestamp}`);

      amazonAPI.defaults.headers.Cookie = currentCookies;

      console.log("✅ Session cookies refreshed");
    }

    refreshSessionCookies()

    console.log("🔁 Fetching product page:", bestMatch.link);

    // Strip the full URL query string to get a clean product page URL (avoids referral tokens that trigger bot checks)
    const cleanProductUrl = bestMatch.link.split('?')[0];
    const productRes = await axios.get(cleanProductUrl, { headers: mobileHeaders });
    const parsedPage = parse(productRes.data);

    const offers = [];
    const cashback = [];

    const cards = parsedPage.querySelectorAll("li.a-carousel-card");

    for (const card of cards) {
      const headerText =
        card.querySelector(".cardification-combo-card-header span")?.innerText?.trim().toLowerCase() || "";

      const priceText = card.querySelector(".smx-saving-amount")?.innerText?.trim();
      if (!headerText || !priceText) continue;

      // ❌ Skip coupon / emi / with
      if (/coupon|emi|with/.test(headerText)) continue;

      const rows = card.querySelectorAll(".cardification-combo-header");

      for (const row of rows) {
        const provider = row.querySelector("span.a-truncate-full")?.innerText?.trim();
        const money = row.querySelector(".cardification-combo-header-money")?.innerText?.trim();

        if (!provider || !money) continue;

        const amountMatch = money.match(/₹[\d,]+/);
        if (!amountMatch) continue;

        const amount = amountMatch[0];
        const className = row.getAttribute("class") || "";

        // -----------------------------------------------------
        // ✔️ CASHBACK (only via CLASS)
        // -----------------------------------------------------
        if (className.includes("CASHBACK")) {
          cashback.push({
            provider,
            amount: parseInt(amount.replace(/[₹,]/g, ""), 10),
          });
          continue; // ⛔ ensure it does NOT go to offers[]
        }

        // -----------------------------------------------------
        // ✔️ NORMAL OFFER (all others)
        // -----------------------------------------------------
        offers.push({
          offerTitle: provider,
          discountAmount: parseInt(priceText.replace(/[₹,]/g, ""), 10),
        });
      }
    }


    bestMatch.offers = offers;
    bestMatch.cashback = cashback;
    
    // Safety check: only replace if price exists
    if (bestMatch.price && typeof bestMatch.price === 'string') {
      bestMatch.price = parseInt(bestMatch.price.replace(/[₹,]/g, ""), 10);
    } else if (typeof bestMatch.price !== 'number') {
      bestMatch.price = 0; // Default if missing
    }

    return bestMatch;
  } catch (err) {
    console.error("💥 Amazon scraping failed:", err);
    return null;
  }
};


