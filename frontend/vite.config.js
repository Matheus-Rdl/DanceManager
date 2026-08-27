import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  envDir: "../" //Busca o arquivo .env na raiz do projeto (fora da pasta frontend)
})
