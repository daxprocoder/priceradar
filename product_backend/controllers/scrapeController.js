import { scrapeAmazonRequest } from "../utils/scrapeamz.js";
import { scrapeFlipkartSearch } from "../utils/finalflip.js";
import { extractRelianceInitialState } from "../utils/nodeparserreliance.js";

export const getAllPrices = async (req, res) => {
    try {
        const { query } = req.query || "Samsung Galaxy Flip6 256 GB, 12 GB RAM, Silver, Mobile Phone";

        const startTime = Date.now();
        console.log(`⏱️ Process started at: ${new Date(startTime).toLocaleString()}`);

        const [amazonResult, flipkartResult, relianceResult] =
            await Promise.allSettled([
                scrapeAmazonRequest(query),
                scrapeFlipkartSearch(query),
                extractRelianceInitialState(query)
            ]);

        // only relianceResult
        // const [relianceResult] =
        // await Promise.allSettled([
        //     extractRelianceInitialState(query),
        // ]);

        const resultData = {
            amazon: amazonResult.status === "fulfilled" ? amazonResult.value : null,
            flipkart: flipkartResult.status === "fulfilled" ? flipkartResult.value : null,
            reliance: relianceResult.status === "fulfilled" ? relianceResult?.value : null,
            successCount: [amazonResult, flipkartResult, relianceResult]
                .filter(r => r.status === "fulfilled" && r.value).length,
        };

        // resultData only reliance
        // const resultData = {
        //     amazon: null,
        //     flipkart: null,
        //     reliance: relianceResult.status === "fulfilled" ? relianceResult?.value : null,
        //     successCount: relianceResult.status === "fulfilled" && relianceResult.value ? 1 : 0,
        // };

        const endTime = Date.now();
        console.log(`⏱️ Total time taken: ${(endTime - startTime) / 1000} seconds`);

        return res.status(200).json({
            source: "scraper",
            ...resultData,
            totalTime: (endTime - startTime) / 1000,
        });

    } catch (err) {
        console.error("❌ ERROR in scraper:", err);
        return res.status(500).json({
            error: true,
            message: err.message,
        });
    }
};
