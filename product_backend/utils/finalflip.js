import axios from "axios";
import * as cheerio from "cheerio";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-IN,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
  "Referer": "https://www.google.co.in/",
};

/**
 * Scrapes Flipkart for products matching the query using fast HTTP requests.
 */
export const scrapeFlipkartSearch = async (query) => {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const { data } = await client.get(url, { headers: HEADERS });
    const $ = cheerio.load(data);
    const results = [];

    // Target the main product containers in Flipkart's new layout
    $(".tUxRFH, ._75W9jW, ._1AtVbE, div[data-id]").each((i, el) => {
      if (results.length >= 10) return;

      const title = $(el).find(".KzDlHZ, .RG5Slk, .wjcEIp, ._4rR01T").first().text().trim();
      const priceRaw = $(el).find(".Nx9bqj, ._30jeq3").first().text().trim();
      const image = $(el).find("img").first().attr("src");
      const link = $(el).find("a").first().attr("href");

      if (title && priceRaw) {
        results.push({
          title,
          price: priceRaw,
          image: image || "https://via.placeholder.com/150",
          link: link ? (link.startsWith("http") ? link : `https://www.flipkart.com${link}`) : "#",
          store: "Flipkart",
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Flipkart Scrape Error:", error.message);
    return [];
  }
};

/**
 * Detailed Scrape for a single product URL (for Active Alerts)
 */
export const scrapeProductDetails = async (productUrl) => {
  try {
    const { data } = await client.get(productUrl, { headers: HEADERS });
    const $ = cheerio.load(data);
    
    const title = $(".VU-Z7G, ._2NKhZn").first().text().trim();
    const price = $(".Nx9bqj.C_PkhZ, ._30jeq3._16Jk6d").first().text().trim();
    const image = $("img.DByo4Z, img._396csV").first().attr("src");

    return {
      title,
      price: price ? parseInt(price.replace(/[^0-9]/g, "")) : null,
      image,
      url: productUrl
    };
  } catch (error) {
    console.error("Detail Scrape Error:", error.message);
    return null;
  }
};