import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API = "https://itspriceradar.netlify.app/";
//const LOCAL_API = "http://localhost:5000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    //    proxy: {
    //     "/api": {
    //       target: API,
    //      changeOrigin: true,
    //      secure: false,
    //   }
    //  }
  }
})
