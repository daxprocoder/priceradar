
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { scrapeFlipkartNative } from "../utils/flipkartScraper";

function SearchBar({ setProducts, setQuery, query,setSearchquery, loading, setLoading }) {
  const [suggestions, setSuggestions] = useState([]);
  const [blockSuggest, setBlockSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const wrapperRef = useRef(null);

  // --------------------------------------------------------
  // 🔵 Debounced Autosuggest
  // --------------------------------------------------------
  useEffect(() => {
    if (blockSuggest) return;
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSuggestLoading(true);

        const res = await fetch(
          `https://www.91mobiles.com/autosuggest/search_as_index4.php?back_fill=1&c=all&country=&q=${encodeURIComponent(
            query.trim()
          )}&source=web`
        );
        const data = await res.json();

        if (!data?.suggestions) {
          setSuggestions([]);
          setSuggestLoading(false);
          return;
        }

        const names = data.suggestions
          .filter((item) => item?.pro_id && item?.cat_id === 553)
          .map((item) => ({
            name: item.name,
            img: item.img || item.image || item.thumbnail || null,
          }))
          .slice(0, 4);

        setSuggestions(names);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Autosuggest error:", err);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, blockSuggest]);

  // --------------------------------------------------------
  // 🔵 Keyboard Navigation
  // --------------------------------------------------------
  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const selected = suggestions[activeIndex];
        setBlockSuggest(true);
        setQuery(selected.name);
        setSuggestions([]);
        handleSearch(selected.name);
        return;
      }
      handleSearch(query);
    }
  };

  // --------------------------------------------------------
  // 🔵 Search Handler
  // --------------------------------------------------------
  const handleSearch = async (value) => {
    setQuery(value);
    setSearchquery(value);
    setSuggestions([]);
    setLoading(true);

    try {
      // 10.0.2.2 works ONLY for Android emulator, using local IP makes it work on physical devices too.
      // Use relative URL in dev (Vite proxy) → full URL in prod/native (no CORS issue)
      const apiBase = "https://priceradar-rose.vercel.app";

      // 1. Fetch Backend (Amazon & Reliance) IMMEDIATELY
      let backendData = {};
      try {
        const res = await axios.get(`${apiBase}/api/scrape?query=${encodeURIComponent(value)}`);
        backendData = res.data;
      } catch (err) {
        console.error("Backend scrape failed:", err.message);
      }

      // Format Backend Results
      const sites = ["amazon", "reliance"];
      const initialProducts = sites
        .map((site) => {
          const data = backendData[site];
          if (!data) return null;
          return {
            site: site.charAt(0).toUpperCase() + site.slice(1),
            title: data.title,
            price: data.price,
            offers: data.offers,
            cashback: data.cashback,
            url: data.link,
            image: data.image,
            Unavailable: data.Unavailable || false,
          };
        })
        .filter(Boolean);

      // Show Amazon and Reliance immediately!
      setProducts(initialProducts);
      setLoading(false); // Stop the loading spinner early

      // Log search to backend
      try {
        const token = localStorage.getItem("pr_token");
        if (token) {
          axios.post(`${apiBase}/api/user/history`, { query: value }, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
        }
      } catch (_) {}

      // 2. Fetch Flipkart (Frontend) IN THE BACKGROUND
      try {
        const nativeFlipkart = await scrapeFlipkartNative(value);
        if (nativeFlipkart) {
          // Append Flipkart to the list once it's ready
          setProducts((prev) => {
            // Check if flipkart is already in there to avoid duplicates
            if (prev.some(p => p.site.toLowerCase() === 'flipkart')) return prev;
            return [...prev, nativeFlipkart];
          });
        }
      } catch (err) {
        console.error("Flipkart background fetch failed:", err);
      }

    } catch (err) {
      console.error("Scrape error:", err);
      // Set an empty state or error indication if needed
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // Highlight matched text
  // --------------------------------------------------------
  const highlightText = (text, query) => {
    const regex = new RegExp(`(${query})`, "i");
    const parts = text.split(regex);

    return parts.map((p, idx) =>
      regex.test(p) ? (
        <span key={idx} className="text-[#00ff9d]">
          {p}
        </span>
      ) : (
        <span key={idx}>{p}</span>
      )
    );
  };

  // --------------------------------------------------------
  // UI (with onBlur → pure react)
  // --------------------------------------------------------
  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      className="relative w-full max-w-2xl mx-auto"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setSuggestions([]); // close suggest box
        }
      }}
    >
      <label
        className="block text-[#00ff9d] font-mono text-[10px] tracking-[0.3em] uppercase mb-3 ml-1"
        htmlFor="search"
      >
        // INITIATE_PRODUCT_SCAN
      </label>

      <div className="relative group">
        {/* INPUT */}
        <input
          type="text"
          id="search"
          className="w-full px-6 py-5 text-white text-base outline-none bg-neutral-900/50 border border-neutral-800 rounded-none transition-all duration-300 focus:border-[#00ff9d] focus:bg-neutral-900/80 font-mono tracking-tight"
          placeholder="ENTER_MODEL_IDENTIFIER..."
          value={query}
          onChange={(e) => {
            setBlockSuggest(false);
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        
        {/* Glowing edge on focus */}
        <div className="absolute bottom-0 left-0 h-[1px] bg-[#00ff9d] w-0 group-focus-within:w-full transition-all duration-500 shadow-[0_0_10px_#00ff9d]"></div>

        {/* Search Button */}
        <button
          onClick={() => handleSearch(query)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-3 text-neutral-500 hover:text-[#00ff9d] transition-colors disabled:opacity-30"
          disabled={!query || loading}
        >
          <Search size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* SUGGESTIONS */}
      {(suggestions.length > 0 || suggestLoading) && (
        <ul className="absolute w-full mt-1 bg-[#0a0a0a] border border-neutral-800 shadow-2xl max-h-72 overflow-y-auto z-50 rounded-none divide-y divide-neutral-900">
          {/* Loading spinner */}
          {suggestLoading && (
            <li className="px-6 py-4 text-[#00ff9d] font-mono text-xs flex gap-4 items-center">
              <div className="w-3 h-3 border border-[#00ff9d] border-t-transparent animate-spin rounded-full"></div>
              ACCESSING_DATABASE...
            </li>
          )}

          {!suggestLoading &&
            suggestions.map((s, i) => (
              <li
                key={i}
                tabIndex={0}
                className={`px-6 py-3 cursor-pointer flex items-center gap-4 transition-colors ${
                  i === activeIndex ? "bg-neutral-900" : "hover:bg-neutral-900/50"
                }`}
                onMouseDown={() => {
                  setBlockSuggest(true);
                  setQuery(s.name);
                  setSuggestions([]);
                  handleSearch(s.name);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {s.img && (
                  <div className="w-8 h-8 rounded-none overflow-hidden border border-neutral-800 shrink-0">
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover grayscale opacity-70" />
                  </div>
                )}

                <span className={`font-mono text-xs tracking-tight ${i === activeIndex ? "text-[#00ff9d]" : "text-neutral-400"}`}>
                  {highlightText(s.name, query)}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;