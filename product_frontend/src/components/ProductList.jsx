import { TrendingDown, Heart, Bell } from 'lucide-react';

function ProductList({ products, query, searchquery, loading, favorites, setFavorites, onSetAlert }) {
  if (loading) {
    return (
      <div className="mt-12 w-full flex flex-col items-center gap-8">
        <div className="font-mono text-[#00ff9d] text-xs animate-pulse tracking-[0.4em]">
          // INITIALIZING_SCAN_PROTOCOLS...
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-neutral-900/20 border border-neutral-900 p-8 h-[400px] animate-pulse flex flex-col gap-4">
              <div className="w-full h-48 bg-neutral-900"></div>
              <div className="h-4 bg-neutral-900 w-3/4"></div>
              <div className="h-4 bg-neutral-900 w-1/2"></div>
              <div className="mt-auto h-10 bg-neutral-900 w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  // ✅ Compute effective price for each product before sorting
  const productsWithEffectivePrice = products.map((p) => {
    let rawPrice = p.price;
    if (typeof rawPrice === 'string') {
      rawPrice = parseFloat(rawPrice.replace(/[₹,]/g, "")) || 0;
    }
    
    let basePrice = p.discountAmount || rawPrice || Infinity;
    let effectivePrice = basePrice;

    // If it's a Flipkart and Amazon product and has offers → pick the *lowest* FinalPrice
    if ((p.site?.toLowerCase().includes("flipkart") || p.site?.toLowerCase().includes("amazon")) && Array.isArray(p.offers) && p.offers.length > 0) {
      const offerPrices = p.offers
        .map((o) => parseFloat(o.discountAmount?.toString().replace(/[₹,]/g, "")))
        .filter((v) => !isNaN(v));
      if (offerPrices.length > 0) {
        const lowestOfferPrice = Math.min(...offerPrices);
        effectivePrice = Math.min(basePrice, lowestOfferPrice);
      }
    }

    // 

    // if for amazon just use the base newPrice from p itself
    // if (p.site?.toLowerCase().includes("amazon")) {
    //   effectivePrice = parseFloat(p.newPrice?.replace(/[₹,]/g, "")) || effectivePrice;
    // }


    return { ...p, effectivePrice, rawPrice };
  });

  // ✅ Sort all products by effectivePrice ascending
  const sortedProducts = [...productsWithEffectivePrice].sort(
    (a, b) => a.effectivePrice - b.effectivePrice
  );

  const lowestPrice = sortedProducts[0]?.effectivePrice || Infinity;

  return (
    <div className="mt-1 w-full flex flex-col items-center">
      {!loading && (
        <h2 className="text-[#00ff9d] font-mono text-[10px] tracking-[0.3em] uppercase mb-8">
          // SCAN_RESULTS: {searchquery || "NULL"}
        </h2>
      )}
      {/* No changes needed here */}
      <div className="mt-10 w-full flex flex-wrap justify-center gap-8 max-w-7xl mx-auto">
        {sortedProducts.map((p, i) => {
          const isLowest = p.effectivePrice === lowestPrice;

          let offers = p.offers || [];

          return (
            <div
              key={i}
              className="relative group bg-[#0a0a0a] border border-neutral-900 transition-all duration-500 hover:border-[#00ff9d]/50 w-full max-w-sm overflow-hidden"
            >
              {/* Scanline effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff9d]/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 pointer-events-none opacity-20"></div>

              <div className="p-6">
                {/* Product Header: Site & Image */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">NODE_SOURCE</span>
                    <span className="text-white font-mono text-xs tracking-tighter uppercase">{p.site}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onSetAlert(p)}
                      className="p-1.5 text-neutral-600 hover:text-[#00ff9d] transition-colors"
                    >
                      <Bell size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        const isFav = favorites.some(f => f.link === p.link);
                        if (isFav) {
                          setFavorites(favorites.filter(f => f.link !== p.link));
                        } else {
                          setFavorites([...favorites, p]);
                        }
                      }}
                      className={`p-1.5 transition-colors ${favorites.some(f => f.link === p.link) ? "text-red-500" : "text-neutral-600 hover:text-white"}`}
                    >
                      <Heart size={14} fill={favorites.some(f => f.link === p.link) ? "currentColor" : "transparent"} />
                    </button>
                  </div>
                </div>

                {/* Product Image Wrapper */}
                <div className="relative mb-6 flex justify-center">
                  <div className="w-48 h-48 bg-neutral-950 border border-neutral-900 group-hover:border-[#00ff9d]/20 transition-colors p-4">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                  </div>
                  {/* Decorative corners */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-neutral-800 group-hover:border-[#00ff9d]"></div>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-neutral-800 group-hover:border-[#00ff9d]"></div>
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium text-sm line-clamp-2 mb-1 tracking-tight">
                      {p.title}
                    </h3>
                    {p.Unavailable && (
                      <span className="text-red-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">! OFFLINE</span>
                    )}
                  </div>

                  <div className="flex items-end justify-between border-t border-neutral-900 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-1">UNIT_COST</span>
                      <div className="flex items-baseline gap-2">
                        <span 
                          className="font-bold text-xl tracking-tighter"
                          title={`Effective Price: ₹${p.effectivePrice.toLocaleString("en-IN")}`}
                          style={{
                            color: isLowest ? '#00ff9d' : 'white',
                            textShadow: isLowest ? '0 0 15px rgba(0, 255, 157, 0.3)' : 'none'
                          }}
                        >
                          {p.effectivePrice.toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 0,
                          })}
                        </span>
                        {p.rawPrice > p.effectivePrice && (
                          <span className="text-neutral-600 line-through text-xs font-mono">
                             ₹{p.rawPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group/btn relative px-4 py-2 border border-neutral-800 hover:border-[#00ff9d] transition-all duration-300"
                    >
                      <span className="relative z-10 text-white group-hover/btn:text-[#00ff9d] font-mono text-[10px] tracking-widest uppercase">
                        INIT_DEAL
                      </span>
                    </a>
                  </div>
                </div>

                {/* Technical data fold (offers/cashback) */}
                {(Array.isArray(p.offers) && p.offers.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-neutral-900 space-y-1">
                    <span className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase block mb-2">AVAILABLE_PROTOCOLS</span>
                    {p.offers.slice(0, 2).map((offer, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] font-mono text-neutral-400">
                        <span className="truncate pr-4 uppercase opacity-60">{offer.offerTitle}</span>
                        <span className="text-[#00ff9d]">-₹{offer.discountAmount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductList;