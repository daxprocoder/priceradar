const axios = require('axios');

async function testAllOrigins() {
    try {
        const url = encodeURIComponent('https://www.flipkart.com/search?q=iphone');
        const res = await axios.get(`https://api.allorigins.win/get?url=${url}`);
        console.log("Status:", res.status);
        console.log("Data length:", res.data.contents.length);
        if (res.data.contents.includes('iPhone')) {
            console.log("✅ Success! It fetched the HTML.");
        } else {
            console.log("❌ Failed to find iPhone in HTML.");
        }
    } catch (e) {
        console.log("❌ Error:", e.message);
    }
}
testAllOrigins();
