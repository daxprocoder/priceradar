import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, ShieldCheck, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';

// Dev: use relative URL → Vite proxy forwards to Netlify (no CORS)
// Prod/Mobile: use full URL directly
const isNativeOrProd = import.meta.env.PROD;
const BASE = "https://priceradar-j3op.onrender.com";
const API_URL = `${BASE}/api/auth`;

const WORLD_MAP = [
  "      11111          1111111       ",
  "    111111111      111111111111    ",
  "   11111111111    111111111111111  ",
  "  1111111111111  11111111111111111 ",
  "   11111111111    1111111111111111 ",
  "    11111111       11111111111111  ",
  "      1111          1111111111111  ",
  "        11           11111111111   ",
  "         11           111111111    ",
  "          1111         1111111     ",
  "          11111         111        ",
  "           1111                    ",
  "            11                     ",
  "                                11 ",
  "                                11 ",
];

const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#$@";

function useGlitchText(text, delay = 0) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let timeout;
    let interval;
    let iterations = 0;
    const maxIterations = text.length * 2;

    timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayed(() =>
          text.split('').map((char, index) => {
            if (char === ' ') return ' ';
            if (index < Math.floor(iterations / 2)) {
              return char;
            }
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          }).join('')
        );

        if (iterations >= maxIterations) {
          clearInterval(interval);
          setDisplayed(text);
        }
        iterations += 1;
      }, 40);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, delay]);

  return displayed;
}

const MapChar = ({ isLand }) => {
  const [char, setChar] = useState('');

  useEffect(() => {
    if (!isLand) return;
    const chars = '?/$@10';
    setChar(chars[Math.floor(Math.random() * chars.length)]);
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setChar(chars[Math.floor(Math.random() * chars.length)]);
      }
    }, Math.random() * 2000 + 500);
    return () => clearInterval(interval);
  }, [isLand]);

  if (!isLand) return <span className="opacity-0">.</span>;

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.2, 0.8, 0.4] }}
      transition={{ duration: Math.random() * 3 + 2, repeat: Infinity }}
      className="inline-block w-4 h-4 text-center"
    >
      {char}
    </motion.span>
  );
};

const BRANDS = ['AMAZON', 'FLIPKART', 'RELIANCE', 'MYNTRA', 'CROMA'];

const FloatingBrand = ({ brand, delay, duration, startX }) => {
  return (
    <motion.div
      initial={{ y: '110vh', x: startX, opacity: 0 }}
      animate={{
        y: '-20vh',
        opacity: [0, 0.8, 1, 0.8, 0],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        delay: delay,
        ease: 'linear',
      }}
      className="absolute z-0 flex items-center justify-center"
    >
      <div className="border border-[#00ff9d]/30 bg-black/80 backdrop-blur-md text-[#00ff9d] font-mono text-xs px-4 py-2 shadow-[0_0_15px_rgba(0,255,157,0.2)]">
        <span className="animate-pulse mr-2">_</span>
        {brand}
      </div>
    </motion.div>
  );
};

function AuthFlow({ onComplete }) {
  const [step, setStep] = useState('email'); // email, otp, verified, onboarding, complete
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brands, setBrands] = useState([]);
  const [user, setUser] = useState(null);

  const headingText = useGlitchText("PRICERADAR", 100);
  const subText1 = useGlitchText("COMPARE EVERY STORE", 400);
  const subText2 = useGlitchText("IN SECONDS", 800);

  useEffect(() => {
    const newBrands = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      brand: BRANDS[Math.floor(Math.random() * BRANDS.length)],
      delay: Math.random() * 15,
      duration: 15 + Math.random() * 15,
      startX: `${Math.random() * 90}vw`,
    }));
    setBrands(newBrands);
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/send-otp`, { email });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/verify-otp`, {
        email,
        otp: otp.join('')
      });

      const { token, user } = response.data;
      localStorage.setItem('pr_token', token);
      localStorage.setItem('pr_user', JSON.stringify(user));
      setUser(user);

      setStep('verified');

      // After verification animation, check if we need onboarding
      setTimeout(() => {
        if (!user.onboarded) {
          setStep('onboarding');
        } else {
          setStep('complete');
          setTimeout(() => onComplete(user), 2000);
        }
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.error || "Invalid verification code.");
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pr_token');
      const response = await axios.put(`${API_URL}/onboard`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = response.data.user;
      localStorage.setItem('pr_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setStep('complete');

      setTimeout(() => onComplete(updatedUser), 2000);
    } catch (err) {
      setError("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden relative font-sans flex flex-col justify-center selection:bg-white selection:text-black">
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* World Map Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30 pointer-events-none scale-150 sm:scale-100">
        <div className="font-mono text-[10px] sm:text-xs text-neutral-500 leading-none tracking-widest">
          {WORLD_MAP.map((row, i) => (
            <div key={i} className="whitespace-pre flex">
              {row.split('').map((char, j) => (
                <MapChar key={`${i}-${j}`} isLand={char === '1'} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_80%)] z-0 pointer-events-none"></div>

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-60">
        {brands.map((brand) => (
          <FloatingBrand key={brand.id} {...brand} />
        ))}
      </div>

      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between">

        {/* Branding (Hidden during success states on mobile) */}
        <AnimatePresence>
          {(step === 'email' || step === 'otp') && (
            <motion.div
              exit={{ opacity: 0, x: -50 }}
              className="w-full md:w-1/2 mb-16 md:mb-0"
            >
              <h1 className="text-white font-bold tracking-tighter text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {headingText || <span className="opacity-0">P</span>}
                <span style={{ animation: 'cursorBlink 0.5s step-end 2', color: '#00ff9d' }}>_</span>
              </h1>
              <div className="mt-8 max-w-lg">
                <p className="text-[#00ff9d] font-mono text-xs sm:text-sm tracking-[0.2em] mb-4 flex items-center">
                  <span className="inline-block w-2 h-2 bg-[#00ff9d] mr-3 animate-ping"></span>
                  // TARGET ACQUIRED. PRICE OPTIMIZED.
                </p>
                <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight uppercase">
                  <span className="bg-white text-black px-2 mr-3 inline-block mb-2">
                    {subText1 || " "}
                  </span>
                  <br />
                  <span className="text-neutral-500">
                    {subText2 || " "}
                  </span>
                </h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Content Area */}
        <div className={`w-full ${step === 'email' || step === 'otp' ? 'md:w-[420px]' : 'max-w-xl mx-auto'}`}>
          <AnimatePresence mode="wait">

            {/* EMAIL STEP */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-[1px] bg-gradient-to-b from-neutral-700 to-transparent"
              >
                <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                  <form onSubmit={handleEmailSubmit} className="flex flex-col relative z-10">
                    <h3 className="text-white text-2xl font-semibold mb-2 tracking-wide">
                      GET STARTED <ArrowRight className="inline w-5 h-5 ml-1 text-[#00ff9d]" />
                    </h3>
                    <p className="text-neutral-400 text-sm mb-10 font-mono">
                      &gt; INITIATE_CONNECTION_PROTOCOLS
                    </p>

                    <div className="relative mb-8">
                      <input
                        type="email"
                        required
                        disabled={loading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-neutral-800 text-white px-0 py-3 outline-none focus:border-[#00ff9d] transition-colors peer font-mono"
                        placeholder=" "
                      />
                      <label className="absolute left-0 top-3 text-neutral-600 pointer-events-none transition-all peer-focus:-top-5 peer-focus:text-xs peer-focus:text-[#00ff9d] peer-focus:tracking-widest peer-[:not(:placeholder-shown)]:-top-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:tracking-widest font-mono">
                        ENTER_EMAIL_ADDRESS
                      </label>
                    </div>

                    {error && (
                      <p className="text-red-500 font-mono text-[10px] mb-6 flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full bg-white text-black py-4 font-bold tracking-[0.2em] flex items-center justify-center overflow-hidden transition-all hover:text-white"
                    >
                      <span className="absolute inset-0 w-full h-full bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></span>
                      <span className="relative z-10 flex items-center gap-3">
                        {loading ? <Loader2 className="animate-spin" /> : "CONTINUE"}
                      </span>
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* OTP STEP */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-[1px] bg-gradient-to-b from-neutral-700 to-transparent"
              >
                <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                  <form onSubmit={handleOtpSubmit} className="flex flex-col relative z-10">
                    <h3 className="text-white text-2xl font-semibold mb-2 tracking-wide">
                      VERIFY IDENTITY
                    </h3>
                    <p className="text-neutral-400 text-sm mb-10 font-mono">
                      &gt; AWAITING_CODE_FROM: <span className="text-[#00ff9d]">{email}</span>
                    </p>

                    <div className="flex justify-between gap-2 mb-10">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          type="text"
                          maxLength={1}
                          disabled={loading}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          className="w-10 h-12 sm:w-12 sm:h-14 bg-black border border-neutral-800 text-white text-center text-xl font-mono outline-none focus:border-[#00ff9d] focus:shadow-[0_0_10px_rgba(0,255,157,0.2)] transition-all"
                        />
                      ))}
                    </div>

                    {error && (
                      <p className="text-red-500 font-mono text-[10px] mb-6 flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={otp.join('').length < 6 || loading}
                      className="group relative w-full bg-white text-black py-4 font-bold tracking-[0.2em] flex items-center justify-center overflow-hidden transition-all hover:text-[#00ff9d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-black"
                    >
                      <span className="absolute inset-0 w-full h-full bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></span>
                      <span className="relative z-10 flex items-center gap-3">
                        {loading ? <Loader2 className="animate-spin" /> : "AUTHENTICATE"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-neutral-600 font-mono text-[10px] mt-6 hover:text-neutral-400"
                    >
                      CHANGE_EMAIL
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* VERIFIED ANIMATION */}
            {step === 'verified' && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -50 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.8, ease: "backOut" }}
                  className="w-32 h-32 bg-[#00ff9d] rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(0,255,157,0.5)] mb-8"
                >
                  <ShieldCheck size={64} className="text-black" />
                </motion.div>
                <h2 className="text-white text-4xl font-bold tracking-tighter mb-4">VERIFICATION_SUCCESSFUL</h2>
                <div className="flex justify-center items-center gap-2 text-[#00ff9d] font-mono tracking-widest text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={16} />
                  </motion.div>
                  SYNCING_USER_PROFILE...
                </div>
              </motion.div>
            )}

            {/* ONBOARDING STEP */}
            {step === 'onboarding' && (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md mx-auto"
              >
                <div className="bg-[#0a0a0a] border border-neutral-800 p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff9d]/5 blur-3xl rounded-full"></div>

                  <h2 className="text-white text-3xl font-bold mb-2">WELCOME OPERATOR</h2>
                  <p className="text-neutral-500 font-mono text-xs mb-10 tracking-widest uppercase">PLEASE_INITIALIZE_YOUR_IDENTITY</p>

                  <form onSubmit={handleOnboardingSubmit} className="space-y-8">
                    <div className="relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[#00ff9d]">
                        <UserIcon size={20} />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent border-b border-neutral-800 text-white pl-8 py-3 outline-none focus:border-[#00ff9d] transition-colors font-mono"
                        placeholder="ENTER_NAME"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#00ff9d] text-black py-4 font-bold tracking-[0.2em] flex items-center justify-center hover:bg-white transition-colors"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : "INITIALIZE_PROFILE"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* COMPLETE / FINAL ANIMATION */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="relative w-48 h-48 mx-auto mb-12">
                  {/* Radar Pulse Effect */}
                  <motion.div
                    animate={{ scale: [1, 2], opacity: [1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-4 border-[#00ff9d] rounded-full"
                  />
                  <div className="absolute inset-0 bg-[#00ff9d]/10 rounded-full flex items-center justify-center border border-[#00ff9d]/30">
                    <CheckCircle2 size={80} className="text-[#00ff9d]" />
                  </div>
                </div>
                <h2 className="text-white text-5xl font-bold tracking-tighter mb-4">ACCESS_GRANTED</h2>
                <p className="text-neutral-500 font-mono text-sm tracking-[0.3em] uppercase">REDIRECTING_TO_CONTROL_CENTER</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Footer Status Bar (Only visible in auth steps) */}
      {(step === 'email' || step === 'otp') && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-20 w-full max-w-7xl px-12 hidden md:flex justify-between items-center text-neutral-600 font-mono text-[10px] tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
            SYSTEM_ONLINE
          </div>
          <div className="flex gap-8">
            <span>AZURE_BACKEND: CONNECTED</span>
            <span>v1.0.42_STABLE</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthFlow;
