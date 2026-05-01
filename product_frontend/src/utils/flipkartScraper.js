import { Capacitor, CapacitorHttp } from '@capacitor/core';
import axios from 'axios';

export const scrapeFlipkartNative = async (query) => {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&as=on&as-show=on&otracker=search&marketplace=FLIPKART`;

  try {
    console.log("🚀 FRONTEND_SCAN_INITIATED: Flipkart");
    
    let html = "";
    
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // ON ANDROID/iOS: Use native HTTP to bypass CORS and use phone's real IP
      const options = {
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      };
      const response = await CapacitorHttp.get(options);
      html = response.data;
    } else {
      // ON WEB BROWSER: Use a free public CORS proxy to fetch the HTML
      console.log("🌐 Using free Web Proxy for Flipkart...");
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { timeout: 15000 });
      html = response.data.contents;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const products = [];
    const cards = doc.querySelectorAll('div[data-id], ._1AtVbE, ._13oc-S');

    cards.forEach((el) => {
      if (products.length >= 1) return;

      const titleEl = el.querySelector('._4rR01T, .KzDlHZ, .RG5Slk, .IRpwTa, a[title]');
      const priceEl = el.querySelector('._30jeq3, .Nx9bqj, ._1vC4OE');
      const linkEl = el.querySelector('a[href*="/p/"]');
      const imgEl = el.querySelector('img');

      if (titleEl && priceEl && linkEl) {
          const title = titleEl.textContent.trim();
          const priceRaw = priceEl.textContent.trim();
          const link = linkEl.getAttribute('href');
          const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : null;

          if (title && !title.toLowerCase().includes("protect") && !title.toLowerCase().includes("warranty")) {
              products.push({
                  site: "Flipkart",
                  title,
                  price: parseInt(priceRaw.replace(/[^0-9]/g, ''), 10),
                  url: link.startsWith('http') ? link : `https://www.flipkart.com${link}`,
                  image,
                  store: "Flipkart"
              });
          }
      }
    });

    console.log("✅ FRONTEND_SCAN_SUCCESS: Flipkart", products[0]?.title);
    return products[0] || null;

  } catch (err) {
    console.error("❌ FRONTEND_SCAN_ERROR: Flipkart", err.message);
    return null;
  }
};
