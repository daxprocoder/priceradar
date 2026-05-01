import { useState, useEffect } from "react";
import ProductList from "./components/ProductList";
import SearchBar from "./components/SearchBar";
import AuthFlow from "./components/AuthFlow";
import { Heart, Bell, User, X, Smartphone, Cpu, Home, WifiOff } from "lucide-react";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("pr_token"));
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("pr_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [searchquery, setSearchquery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("home"); 

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("pr_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const [priceAlerts, setPriceAlerts] = useState(() => {
    const saved = localStorage.getItem("pr_alerts");
    return saved ? JSON.parse(saved) : [];
  });

  const [alertTarget, setAlertTarget] = useState(null); // Product being configured for alert
  const [alertInterval, setAlertInterval] = useState("1h");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    let netListener = null;
    let showSub = null;
    let hideSub = null;

    const setup = async () => {
      try { Device.getInfo().then(setDeviceInfo); } catch(e) {}
      try { LocalNotifications.requestPermissions(); } catch(e) {}

      // Network
      try {
        const status = await Network.getStatus();
        setIsOffline(!status.connected);
        netListener = await Network.addListener('networkStatusChange', s => setIsOffline(!s.connected));
      } catch(e) {}

      // Keyboard (native only)
      if (Capacitor.isNativePlatform()) {
        try { showSub = await Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true)); } catch(e) {}
        try { hideSub = await Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false)); } catch(e) {}
      }
    };

    setup();

    return () => {
      try { if (netListener?.remove) netListener.remove(); } catch(e) {}
      try { if (showSub?.remove) showSub.remove(); } catch(e) {}
      try { if (hideSub?.remove) hideSub.remove(); } catch(e) {}
    };
  }, []);

  const themeColor = isOffline ? "#ef4444" : "#00ff9d";
  const themeGlow = isOffline ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 255, 157, 0.3)";

  useEffect(() => {
    localStorage.setItem("pr_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("pr_alerts", JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  const handleAddAlert = async () => {
    if (!alertTarget) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("pr_token");
      const response = await axios.post("https://priceradar-rose.vercel.app/api/alerts/create", {
        productUrl: alertTarget.link,
        checkInterval: alertInterval,
        initialPrice: alertTarget.effectivePrice,
        title: alertTarget.title,
        image: alertTarget.image,
        store: alertTarget.store || "Flipkart"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPriceAlerts([...priceAlerts, response.data.alert]);
      setAlertTarget(null);
      setActiveView("alerts");
    } catch (err) {
      console.error("Failed to initialize radar:", err);
    } finally {
      setLoading(false);
    }
  };

  // Background Check Simulation
  useEffect(() => {
    const interval = setInterval(async () => {
      if (priceAlerts.length === 0) return;
      
      console.log("// INITIATING_PERIODIC_SCAN...");
      for (const alert of priceAlerts) {
        // In a real app, you'd fetch the latest price here
        // For demonstration, we'll simulate a 5% chance of price change
        if (Math.random() > 0.95) {
          const newPrice = alert.effectivePrice + (Math.random() > 0.5 ? 500 : -500);
          
          await LocalNotifications.schedule({
            notifications: [{
              title: "PRICE_FLUCTUATION_DETECTED",
              body: `${alert.title} is now ₹${newPrice.toLocaleString()}`,
              id: Math.floor(Math.random() * 10000),
              sound: 'beep.wav'
            }]
          });

          setPriceAlerts(prev => prev.map(p => 
            p.link === alert.link 
            ? { ...p, effectivePrice: newPrice, lastChecked: new Date().toISOString() } 
            : p
          ));
        }
      }
    }, 30000); // Check every 30 seconds for demo

    return () => clearInterval(interval);
  }, [priceAlerts]);

  const handleLogout = () => {
    localStorage.removeItem("pr_token");
    localStorage.removeItem("pr_user");
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated) {
    return <AuthFlow onComplete={(user) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-sans">
      {/* Subtle World Map Background (Matching AuthFlow) */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none flex items-center justify-center scale-150 sm:scale-100">
        <div className="font-mono text-[8px] text-neutral-500 leading-none tracking-widest whitespace-pre">
          {/* Re-using the logic from AuthFlow style */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i}>
              {Array.from({ length: 80 }).map((_, j) => (
                <span key={j} className="opacity-20">.</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Top Header Branding */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 flex items-center justify-center text-black font-black text-xs transition-colors duration-500"
              style={{ backgroundColor: themeColor }}
            >
              PR
            </div>
            <h1 className="text-white font-bold tracking-tighter text-2xl">
              PRICERADAR<span className="animate-pulse" style={{ color: themeColor }}>_</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[8px] font-mono tracking-[0.2em] uppercase transition-colors duration-500" style={{ color: isOffline ? "#ef4444" : "#525252" }}>
            <span>{isOffline ? "RADAR_DISCONNECTED" : "RADAR_ACTIVE"}</span>
            <div 
              className={`w-1.5 h-1.5 rounded-full ${!isOffline && "animate-pulse"}`}
              style={{ backgroundColor: themeColor }}
            ></div>
          </div>
        </div>

        {activeView === "home" && (
          <>
            {/* Search Section */}
            <div className="max-w-3xl mx-auto mb-12">
              <SearchBar setProducts={setProducts} setQuery={setQuery} query={query} setSearchquery={setSearchquery} setLoading={setLoading} loading={loading} />
            </div>

            {/* Products Grid / Empty State */}
            <div className="w-full">
              {products.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center py-20 relative">
                  {/* Central Radar Animation */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Pulsing Rings */}
                    <div 
                      className={`absolute inset-0 border rounded-full ${!isOffline ? "animate-[ping_3s_linear_infinite]" : ""}`}
                      style={{ borderColor: isOffline ? "rgba(239, 68, 68, 0.2)" : "rgba(0, 255, 157, 0.2)" }}
                    ></div>
                    <div 
                      className={`absolute inset-4 border rounded-full ${!isOffline ? "animate-[ping_2s_linear_infinite]" : ""}`}
                      style={{ borderColor: isOffline ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 255, 157, 0.3)" }}
                    ></div>
                    <div 
                      className={`absolute inset-8 border rounded-full ${!isOffline ? "animate-[ping_4s_linear_infinite]" : ""}`}
                      style={{ borderColor: isOffline ? "rgba(239, 68, 68, 0.4)" : "rgba(0, 255, 157, 0.4)" }}
                    ></div>
                    
                    {/* Rotating Scanner Line */}
                    <div className="absolute inset-0 rounded-full border border-neutral-900">
                       <div 
                        className={`absolute top-1/2 left-1/2 w-1/2 h-[1px] origin-left ${!isOffline ? "animate-[spin_4s_linear_infinite]" : "rotate-45"}`}
                        style={{ background: `linear-gradient(to right, transparent, ${themeColor})` }}
                       ></div>
                    </div>

                    {/* Central Target Dot */}
                    <div 
                      className="w-2 h-2 rounded-full z-10 transition-colors duration-500"
                      style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}` }}
                    ></div>
                  </div>

                  {/* Flowing Data Particles */}
                  <div className="mt-12 text-center space-y-2">
                    <p className={`font-mono text-[10px] tracking-[0.4em] uppercase transition-colors duration-500 ${!isOffline && "animate-pulse"}`} style={{ color: isOffline ? "#ef4444" : "#525252" }}>
                      {isOffline ? "// CONNECTION_FAILED: CHECK_INTERNET_CONNECTIVITY" : "// STANDBY: SYSTEM_READY_FOR_SCAN"}
                    </p>
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3].map(i => (
                        <div 
                          key={i} 
                          className={`w-1 h-1 rounded-full ${!isOffline ? "animate-bounce" : "opacity-30"}`} 
                          style={{ 
                            animationDelay: `${i * 0.2}s`,
                            backgroundColor: isOffline ? "#ef4444" : "#262626"
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <ProductList 
                  products={products} 
                  query={query} 
                  searchquery={searchquery} 
                  loading={loading} 
                  favorites={favorites}
                  setFavorites={setFavorites}
                  onSetAlert={setAlertTarget}
                />
              )}
            </div>
          </>
        )}

        {/* Alert Config Modal */}
        {alertTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 p-8 relative">
              <button onClick={() => setAlertTarget(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
                <X size={18} />
              </button>
              
              <h3 className="text-[#00ff9d] font-mono text-xs tracking-[0.2em] uppercase mb-6">// CONFIGURE_TRACKING_PROTOCOL</h3>
              
              <div className="flex gap-4 mb-8">
                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 p-2">
                  <img src={alertTarget.image} className="w-full h-full object-contain grayscale opacity-50" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium line-clamp-1">{alertTarget.title}</p>
                  <p className="text-neutral-500 font-mono text-[10px] uppercase">{alertTarget.site}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-3">CHECK_INTERVAL</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["1h", "6h", "24h"].map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setAlertInterval(interval)}
                        className={`py-2 border font-mono text-[10px] transition-all ${alertInterval === interval ? "border-[#00ff9d] text-[#00ff9d] bg-[#00ff9d]/5" : "border-neutral-800 text-neutral-500 hover:border-neutral-600"}`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleAddAlert}
                  className="w-full py-4 bg-[#00ff9d] text-black font-bold font-mono text-xs tracking-widest uppercase hover:bg-[#00cc7d] transition-all"
                >
                  INITIALIZE_RADAR
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === "account" && (
          <div className="max-w-xl mx-auto bg-neutral-900/30 border border-neutral-900 p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-none bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden">
                  <User size={48} className="text-neutral-700" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#00ff9d]"></div>
              </div>
              
              <div className="text-center space-y-1">
                <h2 className="text-white font-bold text-xl tracking-tight uppercase">{currentUser?.name || "OPERATOR"}</h2>
                <p className="text-[#00ff9d] font-mono text-[10px] tracking-widest uppercase opacity-60">Status: AUTHORIZED</p>
                <p className="text-neutral-500 font-mono text-[10px] tracking-tight">{currentUser?.email}</p>
              </div>

              <div className="w-full space-y-4 pt-8 border-t border-neutral-900">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-950 border border-neutral-900">
                    <p className="text-[9px] font-mono text-neutral-600 uppercase mb-1">TOTAL_SAVED</p>
                    <p className="text-white font-mono text-lg">{favorites.length}</p>
                  </div>
                  <div className="p-4 bg-neutral-950 border border-neutral-900">
                    <p className="text-[9px] font-mono text-neutral-600 uppercase mb-1">ACTIVE_ALERTS</p>
                    <p className="text-white font-mono text-lg">{priceAlerts.length}</p>
                  </div>
                </div>

                {deviceInfo && (
                  <div className="p-4 bg-neutral-950 border border-neutral-900 space-y-2">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-600 uppercase">
                      <Smartphone size={10} /> DEVICE_IDENTIFIER: <span className="text-white">{deviceInfo.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-600 uppercase">
                      <Cpu size={10} /> SYSTEM_OS: <span className="text-white">{deviceInfo.operatingSystem} {deviceInfo.osVersion}</span>
                    </div>
                  </div>
                )}

                <button className="w-full py-4 px-6 border border-neutral-800 text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-all">
                  UPDATE_IDENTITY
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 px-6 border border-red-900/30 text-red-500 font-mono text-xs tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all"
                >
                  TERMINATE_SESSION [LOGOUT]
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === "alerts" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[#00ff9d] font-mono text-[10px] tracking-[0.3em] uppercase">// PRICE_ALERT_SYSTEM</h2>
            </div>
            
            {priceAlerts.length === 0 ? (
              <div className="bg-neutral-900/20 border border-neutral-900 p-12 text-center">
                <Bell size={40} className="text-neutral-700 mx-auto mb-4" />
                <p className="text-neutral-500 font-mono text-xs tracking-tight">NO_ACTIVE_TRACKING_PROTOCOLS</p>
                <button 
                  onClick={() => setActiveView("home")}
                  className="mt-6 text-[#00ff9d] font-mono text-[10px] tracking-widest uppercase border-b border-[#00ff9d]/30 pb-1"
                >
                  + ADD_NEW_SCAN_TARGET
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {priceAlerts.map((alert, idx) => {
                  const currentPrice = alert.effectivePrice;
                  const diff = currentPrice - alert.targetPrice;
                  return (
                    <div key={idx} className="bg-[#0a0a0a] border border-neutral-900 p-6 flex items-center gap-6">
                      <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 p-2 shrink-0">
                        <img src={alert.image} className="w-full h-full object-contain grayscale" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate">{alert.title}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase">{alert.site}</span>
                          <span className="text-[10px] font-mono text-[#00ff9d] uppercase">INT: {alert.checkInterval}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold tracking-tighter">₹{currentPrice.toLocaleString("en-IN")}</p>
                        {diff !== 0 && (
                          <div className={`flex items-center justify-end gap-1 text-[10px] font-mono ${diff > 0 ? "text-red-500" : "text-[#00ff9d]"}`}>
                            {diff > 0 ? "+" : ""}₹{Math.abs(diff).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setPriceAlerts(priceAlerts.filter((_, i) => i !== idx))}
                        className="text-neutral-700 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === "fav" && (
          <div className="max-w-2xl mx-auto">
             <h2 className="text-[#00ff9d] font-mono text-[10px] tracking-[0.3em] uppercase mb-8">// SAVED_OBJECTS</h2>
             {favorites.length === 0 ? (
               <div className="bg-neutral-900/20 border border-neutral-900 p-12 text-center">
                <Heart size={40} className="text-neutral-700 mx-auto mb-4" />
                <p className="text-neutral-500 font-mono text-xs tracking-tight">VAULT_IS_EMPTY</p>
              </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {favorites.map((fav, idx) => (
                   <div key={idx} className="bg-[#0a0a0a] border border-neutral-900 p-4 flex gap-4 items-center">
                     <div className="w-12 h-12 bg-neutral-950 p-1 border border-neutral-800">
                        <img src={fav.image} className="w-full h-full object-contain grayscale" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{fav.title}</p>
                        <p className="text-[#00ff9d] text-[10px] font-mono uppercase">{fav.site}</p>
                     </div>
                     <button 
                        onClick={() => setFavorites(favorites.filter((_, i) => i !== idx))}
                        className="text-neutral-700 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
        {/* Bottom Navigation */}
        <div 
          className={`fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-neutral-900 pb-safe transition-transform duration-300 ${isKeyboardVisible ? "translate-y-full" : "translate-y-0"}`}
        >
          <div className="flex items-center justify-around h-20 px-6">
            <button 
              onClick={() => setActiveView("home")}
              className={`flex flex-col items-center gap-1 transition-all ${activeView === "home" ? "" : "text-neutral-500 hover:text-white"}`}
              style={{ color: activeView === "home" ? themeColor : undefined }}
            >
              <Home size={22} strokeWidth={activeView === "home" ? 2.5 : 1.5} />
              <span className="text-[8px] font-mono tracking-widest uppercase">RADAR</span>
            </button>

            <button 
              onClick={() => setActiveView("fav")}
              className={`flex flex-col items-center gap-1 transition-all ${activeView === "fav" ? "" : "text-neutral-500 hover:text-white"}`}
              style={{ color: activeView === "fav" ? themeColor : undefined }}
            >
              <Heart size={22} fill={activeView === "fav" ? themeColor : "transparent"} strokeWidth={activeView === "fav" ? 2.5 : 1.5} />
              <span className="text-[8px] font-mono tracking-widest uppercase">VAULT</span>
            </button>

            <button 
              onClick={() => setActiveView("alerts")}
              className={`flex flex-col items-center gap-1 transition-all ${activeView === "alerts" ? "" : "text-neutral-500 hover:text-white"}`}
              style={{ color: activeView === "alerts" ? themeColor : undefined }}
            >
              <div className="relative">
                <Bell size={22} strokeWidth={activeView === "alerts" ? 2.5 : 1.5} />
                {priceAlerts.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></div>
                )}
              </div>
              <span className="text-[8px] font-mono tracking-widest uppercase">ALERTS</span>
            </button>

            <button 
              onClick={() => setActiveView("account")}
              className={`flex flex-col items-center gap-1 transition-all ${activeView === "account" ? "" : "text-neutral-500 hover:text-white"}`}
              style={{ color: activeView === "account" ? themeColor : undefined }}
            >
              <User size={22} strokeWidth={activeView === "account" ? 2.5 : 1.5} />
              <span className="text-[8px] font-mono tracking-widest uppercase">OP_ID</span>
            </button>
          </div>
        </div>

        {/* Padding for Bottom Nav */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}

export default App;