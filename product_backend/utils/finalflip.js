import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { isIrrelevantProduct } from "./filterUtils.js";

dotenv.config();

// --------------------------------------------------------------
// USER AGENTS
// --------------------------------------------------------------
const DESKTOP_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
};

const MOBILE_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.110 Mobile Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
};

// --------------------------------------------------------------
// EXTRACT PID + LID FROM PRODUCT URL
// --------------------------------------------------------------
function extractPID(url) {
    const m = url.match(/[?&]pid=([^&]+)/);
    return m ? m[1] : null;
}

function extractLID(url) {
    const m = url.match(/[?&]lid=([^&]+)/);
    return m ? m[1] : null;
}

// --------------------------------------------------------------
// SCRAPE SEARCH RESULTS
// --------------------------------------------------------------
async function scrapeFlipkartSearchInternal(query) {
    let url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    
    // Route through ScraperAPI if key is available
    if (process.env.SCRAPER_API_KEY) {
        url = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&keep_headers=true&premium=true`;
    }

    const res = await axios.get(url, { headers: DESKTOP_HEADERS, timeout: 15000 });

    console.log("Response Data Status:", res.status);
    const $ = cheerio.load(res.data);
    const results = [];

    $("div[data-id]").each((_, el) => {
        const title = $(el).find(".RG5Slk, .KzDlHZ, ._4rR01T").text().trim();
        const price = $(el).find(".hZ3P6w.DeU9vF, .Nx9bqj, ._30jeq3").text().trim();
        const link = $(el).find("a").attr("href");
        const image = $(el).find("img").attr("src");

        if (title && link) {
            results.push({
                title,
                price,
                link: link.startsWith("http") ? link : "https://www.flipkart.com" + link,
                image,
            });
        }
    });

    return results.slice(0, 6);
}

// --------------------------------------------------------------
// MAIN SCRAPER TO GET BEST PRODUCT
// --------------------------------------------------------------
async function scrapeFlipkartRequest(query) {
    console.log("\n🔍 Searching Flipkart:", query);

    const list = await scrapeFlipkartSearchInternal(query);

    // Filter out irrelevant products
    const filtered = list.filter(
        (item) => !isIrrelevantProduct(item.title)
    );

    console.log("🔹 Flipkart Search filtered Results:", filtered.length);

    return filtered[0] || null;
}

// --------------------------------------------------------------
// FLIPKART INTERNAL API INSTANCE
// --------------------------------------------------------------
const flipkartAPI = axios.create({
    baseURL: "https://1.rome.api.flipkart.com",
    headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "User-Agent":
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        "X-User-Agent":
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36 FKUA/msite/0.0.3/msite/Mobile",
        flipkart_secure: "true",
        Origin: "https://www.flipkart.com",
        Referer: "https://www.flipkart.com/",
    },
});

let ud = process.env.FLIP_UD || "";
let at = process.env.FLIP_AT || "";
let rt = process.env.FLIP_RT || "";
let SN = process.env.FLIP_SN || "";
let S = process.env.FLIP_S || "";
let vd = process.env.FLIP_VD || "";

// Add Axios Interceptor to route all flipkartAPI traffic through ScraperAPI
flipkartAPI.interceptors.request.use((config) => {
    if (process.env.SCRAPER_API_KEY) {
        const targetUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
        config.baseURL = ""; // Clear base URL so it doesn't prepend to ScraperAPI
        config.url = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&keep_headers=true`;
        console.log(`🛡️ Routing through ScraperAPI: ${targetUrl.split('?')[0]}`);
    }
    return config;
});

flipkartAPI.defaults.headers.Cookie = `ud=${ud}; at=${at}; rt=${rt}; SN=${SN}; S=${S}; vd=${vd};`
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function stripRateLimitCookies() {
    console.log("🧹 Removing rate-limit cookies...");
    let cookieStr = flipkartAPI.defaults.headers.Cookie || "";
    cookieStr = cookieStr.replace(/AMCV[^;]+;?/g, "").replace(/AMCVS[^;]+;?/g, "");

    const removeList = ["dpr", "fonts-loaded", "h2NetworkBandwidth", "isH2EnabledBandwidth", "K-ACTION", "vh", "vw"];
    removeList.forEach((key) => {
        const regex = new RegExp(`${key}=[^;]+;?`, "g");
        cookieStr = cookieStr.replace(regex, "");
    });

    cookieStr = cookieStr.replace(/\s+/g, " ").replace(/;;+/g, ";").trim();
    flipkartAPI.defaults.headers.Cookie = cookieStr;
}

function refreshSessionCookies() {
    const timestamp = Date.now();
    console.log("\n🔄 Refreshing session cookies...");
    let currentCookies = flipkartAPI.defaults.headers.Cookie;
    currentCookies = currentCookies
        .replace(/S=[^;]+/, `S=fresh_${timestamp}`)
        .replace(/SN=[^;]+/, `SN=VIE${timestamp}.TOK${timestamp}.${timestamp}.LI`)
        .replace(/vd=[^;]+/, `vd=VIE${timestamp}-${timestamp}-1.${timestamp}.${timestamp}.${timestamp}`);
    flipkartAPI.defaults.headers.Cookie = currentCookies;
}

async function checkout(PID, LID, price) {
    console.log("\n🟢 Processing checkout...");
    const payload = {
        checkoutType: "PHYSICAL",
        cartRequest: {
            pageType: "ProductPage",
            cartContext: {
                [LID]: {
                    productId: PID,
                    quantity: 1,
                    cashifyDiscountApplied: false,
                    selectedActions: ["BUY_NOW"],
                    primaryProductPrice: price,
                },
            },
        },
    };

    try {
        const res = await flipkartAPI.post(`/api/5/checkout?infoLevel=order_summary&_=${Date.now()}`, payload, { timeout: 12000 });
        if(res.status===420) return null;
        return res.data;
    } catch (err) {
        console.log("❌ Checkout API error:", err.message);
        return null;
    }
}

async function extractOffersFromProductPage(fullUrl) {
    try {
        console.log("\n📄 Fetching product HTML to extract offers...");
        const res = await flipkartAPI.get(fullUrl, { headers: MOBILE_HEADERS, timeout: 12000 });
        const $ = cheerio.load(res.data);
        const script = $("script").filter((_, el) => $(el).html().includes("window.__INITIAL_STATE__")).first().html();
        if (!script) return null;

        const match = script.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*\});?/s);
        if (!match || !match[1]) return null;
        const state = JSON.parse(match[1]);
        const slots = state?.multiWidgetState?.widgetsData?.slots || [];
        const offersList = slots.filter(slot => slot?.slotData?.slotType === "WIDGET" && Array.isArray(slot?.slotData?.widget?.data?.offers)).flatMap(slot => slot.slotData.widget.data.offers);
        const bankOffers = offersList.flatMap(s => s?.value?.offerSummariesRC || []).filter(o => (o?.value?.offerTitle || "").toLowerCase() === "bank offers").map(o => o.value);
        const bankOfferGridRows = bankOffers.flatMap(offer => offer.bankOfferGrid || []);
        const filteredRows = bankOfferGridRows.filter(row => {
            const title = row?.value?.offerTitle || "";
            const contentValue = row?.value?.offerSubTitleRC?.value?.contentList?.[0]?.contentValue || "";
            return title !== "Multiple Banks" && contentValue !== "Debit Card";
        });

        return filteredRows.map(row => ({
            offerTitle: row.value?.offerTitle || null,
            discountedPriceText: row.value?.discountedPriceText || null,
        }));
    } catch (err) {
        console.log("❌ Offer extraction error:", err.message);
        return null;
    }
}

/**
 * Main scraper function called by the controller
 */
export async function scrapeFlipkartSearch(query) {
    try {
        stripRateLimitCookies();
        refreshSessionCookies();

        const best = await scrapeFlipkartRequest(query);
        if (!best) return null;

        const PID = extractPID(best.link);
        const LID = extractLID(best.link);
        const price = parseInt(best.price.replace(/[₹,]/g, ""), 10);

        const offers = await extractOffersFromProductPage(best.link);

        const chk = await checkout(PID, LID, price);
        if (chk != null) {
            const grandTotal = chk?.RESPONSE?.orderSummary?.checkoutSummary?.grandTotal ?? price;
            const finalOffers = (offers || []).map(offer => {
                let discountAmount = null;
                if (offer.discountedPriceText) {
                    const match = offer.discountedPriceText.match(/₹([\d,]+)/);
                    if (match && match[1]) {
                        const discountedPrice = parseInt(match[1].replace(/,/g, ""), 10);
                        discountAmount = price - discountedPrice;
                    }
                }
                return { offerTitle: offer.offerTitle, discountAmount };
            });

            return {
                title: best.title,
                link: best.link,
                price: price,
                grandTotal: grandTotal,
                image: best.image,
                offers: finalOffers,
                store: "Flipkart"
            };
        }

        return {
            title: best.title,
            link: best.link,
            price: price,
            Unavailable: true,
            image: best.image,
            offers: [],
            store: "Flipkart"
        };
    } catch (err) {
        console.log("❌ Flipkart scraping failed:", err.message);
        return null;
    }
}

export const scrapeProductDetails = async (productUrl) => {
    try {
        let url = productUrl;
        if (process.env.SCRAPER_API_KEY) {
            url = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&keep_headers=true`;
        }

        const res = await axios.get(url, { headers: DESKTOP_HEADERS, timeout: 15000 });
        const $ = cheerio.load(res.data);
        const title = $(".VU-Z7G, ._2NKhZn, .B_NuCI").first().text().trim();
        const priceRaw = $(".Nx9bqj.C_PkhZ, ._30jeq3._16Jk6d").first().text().trim();
        const image = $("img.DByo4Z, img._396csV").first().attr("src");
        return {
            title: title || null,
            price: priceRaw ? parseInt(priceRaw.replace(/[^0-9]/g, ""), 10) : null,
            image: image || null,
            url: productUrl
        };
    } catch (err) {
        return null;
    }
};