// Extract Reliance Digital product listings using Raven API JSON
import axios from "axios";
import { isIrrelevantProduct } from "../utils/filterUtils.js";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://www.reliancedigital.in",
    "Referer": "https://www.reliancedigital.in/",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
};

export async function extractRelianceInitialState(query = "") {
    const encoded = encodeURIComponent(query);

    let url;

    // Helper function to extract iPhone model
    function extractIPhoneModel(queryStr) {
        const lowerQuery = queryStr.toLowerCase();
        if (lowerQuery.includes("apple") || lowerQuery.includes("iphone")) {
            const modelMatch = queryStr.match(/iphone\s+(\d+\s*(?:pro|max|mini|plus|air)?)/i);
            return modelMatch ? `iPhone ${modelMatch[1].trim()}` : null;
        }
        return null;
    }

    function extractIPhoneModelNo(queryStr) {
        const lowerQuery = queryStr.toLowerCase();
        if (lowerQuery.includes("apple") || lowerQuery.includes("iphone")) {
            const modelMatch = queryStr.match(/iphone\s+(\d+)/i);
            return modelMatch ? modelMatch[1] : null;
        }
        return null;
    }

    const model = extractIPhoneModel(query);
    const modelNo = extractIPhoneModelNo(query);

    let allItems = [];

    if (model == null) {
        url =
            `https://www.reliancedigital.in/ext/raven-api/catalog/v1.0/products?` +
            `f=page_type%3Anumber&page_id=%2A&page_no=1&page_size=12&page_type=number&q=${encoded}`;

        console.log("🔗 Reliance URL:", url);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
            const state = res.data;
            allItems = state?.items || [];
        } catch (e) {
            console.log("❌ Reliance API error:", e.message);
            return null;
        }
    } else {
        // Loop through pages 1-2 for Apple/iPhone queries
        for (let pageNo = 1; pageNo <= 2; pageNo++) {
            url =
                `https://www.reliancedigital.in/ext/raven-api/catalog/v1.0/products?` +
                `f=page_type%3Anumber&page_id=%2A&page_no=${pageNo}&page_size=12&page_type=number&q=${encoded}`;

            console.log(`🔗 Reliance URL (Page ${pageNo}):`, url);
            try {
                const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
                const state = res.data;
                const items = state?.items || [];
                allItems.push(...items);
            } catch (e) {
                console.log(`❌ Reliance API error on page ${pageNo}:`, e.message);
            }
        }
    }

    try {
        // Map and process all items
        let items = allItems.map(item => ({
            title: item.name || null,
            link: item.slug
                ? "https://www.reliancedigital.in/" + item.slug
                : null,
            price: item.price?.effective?.max || null,
            mprice: item.price?.marked?.max || null,
            image: item.medias?.[0]?.url || null,
        }));

        console.log(`✅ Reliance extracted ${items.length} items`);

        // loop through items and log titles
        items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.title} - ₹${item.price}`);
        });

        // Filter irrelevant
        items = items.filter(p => p.title && !isIrrelevantProduct(p.title));

        console.log(`✅ Reliance filtered to ${items.length} relevant items`);

        // log items
        items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.title} - ₹${item.price}`);
        });

        if (!items.length) return null;

        // Pick first valid
        const bestMatch = items[0];

        console.log("🎯 Best Reliance Match:", bestMatch.title);

        return bestMatch;

    } catch (e) {
        console.log("❌ Reliance processing error:", e.message);
        return null;
    }
}

// extractRelianceInitialState("iphone 15 pro").then(data => {
//     console.log("Result:", data);
// });

