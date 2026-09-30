import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // 相對路徑：部署到 GitHub Pages 的任何 repo 名稱底下都能運作（單頁、無路由）
  base: './',
  // 固定埠號，避免 Playwright 的 reuseExistingServer 誤連到本機其他專案
  server: { port: 5190, strictPort: true },
  plugins: [
    vue(),
    tailwindcss(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
