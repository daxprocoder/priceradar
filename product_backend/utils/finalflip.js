import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import {isIrrelevantProduct} from "./filterUtils.js";
// Puppeteer removed from top level to prevent Netlify crashes

dotenv.config();
// import fs from "fs";

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
// EXTRACT PAGE URI FROM FULL FLIPKART URL
// --------------------------------------------------------------
// function extractPageUri(fullUrl) {
//     try {
//         const u = new URL(fullUrl);
//         return u.pathname + (u.search || "");
//     } catch {
//         return null;
//     }
// }

// --------------------------------------------------------------
// SIMPLE MATCH SCORE (for ranking search results)
// --------------------------------------------------------------
// function simpleMatchScore(title, query) {
//     title = title.toLowerCase();
//     query = query.toLowerCase();

//     let score = 0;

//     query.split(" ").forEach((q) => {
//         if (title.includes(q)) score += 1;
//     });

//     return score / query.split(" ").length;
// }

// --------------------------------------------------------------
// SCRAPE SEARCH RESULTS
// --------------------------------------------------------------
async function scrapeFlipkartSearch(query) {
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    
    let html = "";
    try {
        // Try axios first
        const res = await axios.get(url, { headers: DESKTOP_HEADERS });
        html = res.data;
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("⚠️ 403 Forbidden. Using Puppeteer fallback for Flipkart Search...");
            try {
                const puppeteer = (await import("puppeteer-extra")).default;
                const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
                puppeteer.use(StealthPlugin());
                const browser = await puppeteer.launch({ 
                    headless: "new",
                    args: ["--no-sandbox", "--disable-setuid-sandbox"] 
                });
                const page = await browser.newPage();
                await page.setUserAgent(DESKTOP_HEADERS["User-Agent"]);
                await page.goto(url, { waitUntil: "domcontentloaded" });
                html = await page.content();
                await browser.close();
            } catch (pErr) {
                console.error("Puppeteer fallback failed on Netlify (Size limits/missing binaries).", pErr.message);
                throw new Error("Flipkart blocked request and Puppeteer is unavailable on this serverless environment.");
            }
        } else {
            throw err;
        }
    }

    const $ = cheerio.load(html);
    const results = [];

    $("div[data-id]").each((_, el) => {
        const title = $(el).find(".KzDlHZ").text().trim() || $(el).find(".RG5Slk").text().trim() || $(el).find(".wjcEIp").text().trim();
        const price = $(el).find(".Nx9bqj._4b5DiR").text().trim() || $(el).find(".hZ3P6w.DeU9vF").text().trim() || $(el).find(".Nx9bqj").text().trim();
        const link = $(el).find("a").attr("href");
        const image = $(el).find("img").attr("src");

        if (title && link) {
            results.push({
                title,
                price,
                link: "https://www.flipkart.com" + link,
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

    const list = await scrapeFlipkartSearch(query);


    // Filter out irrelevant products
    const filtered = list.filter(
        (item) => !isIrrelevantProduct(item.title)
    );

    // const scored = list.map((x) => ({
    //     ...x,
    //     matchScore: simpleMatchScore(x.title, query),
    // }));

    // const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);

    console.log("🔹 Flipkart Search filtered Results:", filtered);

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
// --------------------------------------------------------------
// INSERT YOUR HAR COOKIES
// --------------------------------------------------------------
flipkartAPI.defaults.headers.Cookie = `
ud=${ud};
at=${at};
rt=${rt};
SN=${SN};
S=${S};
vd=${vd};
`
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function stripRateLimitCookies() {
    console.log("🧹 Removing rate-limit cookies...");

    let cookieStr = flipkartAPI.defaults.headers.Cookie || "";

    // Remove AMCV_* and AMCVS_* keys fully
    cookieStr = cookieStr.replace(/AMCV[^;]+;?/g, "");
    cookieStr = cookieStr.replace(/AMCVS[^;]+;?/g, "");

    const removeList = [
        "dpr",
        "fonts-loaded",
        "h2NetworkBandwidth",
        "isH2EnabledBandwidth",
        "K-ACTION",
        "vh",
        "vw"
    ];

    removeList.forEach((key) => {
        const regex = new RegExp(`${key}=[^;]+;?`, "g");
        cookieStr = cookieStr.replace(regex, "");
    });

    // Clean extra spaces/semicolons
    cookieStr = cookieStr
        .replace(/\s+/g, " ")
        .replace(/;;+/g, ";")
        .trim();

    flipkartAPI.defaults.headers.Cookie = cookieStr;

    console.log("✅ Rate-limit cookies removed");
}

// --------------------------------------------------------------
// 🆕 REFRESH SESSION COOKIES (Force Fresh Session)
// --------------------------------------------------------------
function refreshSessionCookies() {
    const timestamp = Date.now();

    console.log("\n🔄 Refreshing session cookies...");

    // Get current cookies
    let currentCookies = flipkartAPI.defaults.headers.Cookie;

    // Update session-specific cookies to force fresh session
    // Note: We keep at, rt, ud (auth) but refresh S, SN, vd (session)
    currentCookies = currentCookies
        .replace(/S=[^;]+/, `S=fresh_${timestamp}`)
        .replace(/SN=[^;]+/, `SN=VIE${timestamp}.TOK${timestamp}.${timestamp}.LI`)
        .replace(/vd=[^;]+/, `vd=VIE${timestamp}-${timestamp}-1.${timestamp}.${timestamp}.${timestamp}`);

    flipkartAPI.defaults.headers.Cookie = currentCookies;

    console.log("✅ Session cookies refreshed");
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

    console.log("📄 Checkout payload prepared, sending request...");

    let res;
    try {
        res = await flipkartAPI.post(
            `/api/5/checkout?infoLevel=order_summary&_=${Date.now()}`,
            payload
        );

    } catch (err) {
        console.log("❌ Checkout API error:", err.message);
        return null;
    }

    if(res.status===420){
        console.log("❌ Flipkart rate limit hit during checkout");
        return null;
    }

    console.log(res.status === 200 ? "✅ Checkout API responded" : "❌ Checkout API failed");

    // save response to file for debugging
    // fs.writeFileSync("flipkart_checkout_response.json", JSON.stringify(res.data, null, 2));

    if (res.data) {
        console.log("✅ Flipkart checkout successful");
    } else {
        console.log("❌ Flipkart checkout failed");
    }

    return res.data;
}


// --------------------------------------------------------------
// 🆕 EXTRACT OFFERS FROM PRODUCT PAGE (window.__INITIAL_STATE__)
// --------------------------------------------------------------
async function extractOffersFromProductPage(fullUrl) {
    try {
        console.log("\n📄 Fetching product HTML to extract offers...");

        const res = await flipkartAPI.get(fullUrl, { headers: MOBILE_HEADERS });
        const $ = cheerio.load(res.data);

        // Find script containing window.__INITIAL_STATE__
        const script = $("script")
            .filter((_, el) => $(el).html().includes("window.__INITIAL_STATE__"))
            .first()
            .html();

        if (!script) {
            console.log("❌ INITIAL_STATE script not found");
            return null;
        }

        // Extract JSON payload
        const match = script.match(
            /window\.__INITIAL_STATE__\s*=\s*(\{.*\});?/s
        );
        if (!match || !match[1]) {
            console.log("❌ Could not parse INITIAL_STATE JSON");
            return null;
        }

        let state;
        try {
            state = JSON.parse(match[1]);
            console.log("✓ INITIAL_STATE extracted successfully");
        } catch (err) {
            console.log("❌ JSON parsing error:", err.message);
            return null;
        }

        // Extract slots
        const slots =
            state?.multiWidgetState?.widgetsData?.slots || [];

        // Extract offers inside WIDGET slots
        const offersList = slots
            .filter(
                (slot) =>
                    slot?.slotData?.slotType === "WIDGET" &&
                    Array.isArray(slot?.slotData?.widget?.data?.offers)
            )
            .flatMap((slot) => slot.slotData.widget.data.offers);

        console.log("🔹 Total offers found:", offersList.length);

        // Extract only "Bank offers"
        const bankOffers = offersList
            .flatMap((s) => s?.value?.offerSummariesRC || [])
            .filter(
                (o) =>
                    (o?.value?.offerTitle || "")
                        .toLowerCase() === "bank offers"
            )
            .map((o) => o.value);

        console.log("🔹 Bank Offers Found:", bankOffers.length);

        // Extract bankOfferGrid rows
        const bankOfferGridRows = bankOffers.flatMap(
            (offer) => offer.bankOfferGrid || []
        );

        console.log(
            "🔹 Total bankOfferGrid rows:",
            bankOfferGridRows.length
        );

        // Filter rows
        const filteredRows = bankOfferGridRows.filter((row) => {
            const title = row?.value?.offerTitle || "";
            const contentValue =
                row?.value?.offerSubTitleRC?.value?.contentList?.[0]
                    ?.contentValue || "";

            return (
                title !== "Multiple Banks" &&
                contentValue !== "Debit Card"
            );
        });

        console.log("🔹 Filtered valid rows:", filteredRows.length);

        // Return simplified rows
        return filteredRows.map((row) => ({
            offerTitle: row.value?.offerTitle || null,
            discountedPriceText: row.value?.discountedPriceText || null,
        }));
    } catch (err) {
        console.log("❌ Offer extraction error:", err.message);
        return null;
    }
}

export async function scrapeFlipkartFull(query) {
    try {
        stripRateLimitCookies();
        refreshSessionCookies();
        // await removeAllFromCart();

        const best = await scrapeFlipkartRequest(query);
        console.log("Best Flipkart Product:", best ? best : "None");
        if (!best) return null;

        const PID = extractPID(best.link);
        const LID = extractLID(best.link);
        // const pageUri = extractPageUri(best.link);
        const price = parseInt(best.price.replace(/[₹,]/g, ""));

        const offers = await extractOffersFromProductPage(best.link);

        console.log("offers extracted:", offers ? offers : "None");

        // const cartResult = await addToCart(PID, LID);

        let grandTotal;
        let finalOffers = [];
        // stripRateLimitCookies();
        const chk = await checkout(PID, LID, price);
        console.log("Checkout result:");
        if (chk != null) {
            grandTotal = chk?.RESPONSE?.orderSummary?.checkoutSummary?.grandTotal ?? price;
            // now offers discountPriceText - grandTotal and create final offers list
            finalOffers = (offers || []).map(offer => {
                let discountAmount = null;
                if (offer.discountedPriceText) {
                    const match = offer.discountedPriceText.match(/₹([\d,]+)/);
                    if (match && match[1]) {
                        const discountedPrice = parseInt(match[1].replace(/,/g, ""), 10);
                        discountAmount = price - discountedPrice;
                    }
                }
                return {
                    offerTitle: offer.offerTitle,
                    discountAmount: discountAmount,
                };
            });


            console.log("Final Offers with discount amounts:", finalOffers);
            // convert best.price to number
            // price = parseInt(best.price.replace(/[₹,]/g, ""), 10);

            return {
                title: best.title,
                link: best.link,
                price: parseInt(best.price.replace(/[₹,]/g, ""), 10),
                grandTotal: grandTotal,
                image: best.image,
                offers: finalOffers,
            };
        }

        return {
            title: best.title,
            link: best.link,
            price: parseInt(best.price.replace(/[₹,]/g, ""), 10),
            Unavailable: true,
            image: best.image,
            offers: [],
        }


    } catch (err) {
        console.log("❌ Flipkart scraping failed:", err.message);
        return null;
    }
}