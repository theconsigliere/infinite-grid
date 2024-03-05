import glsl from "vite-plugin-glsl"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    host: true, // Open to local network and display URL
    open: !("SANDBOX_URL" in process.env || "CODESANDBOX_HOST" in process.env), // Open if it's not a CodeSandbox
  },
  plugins: [glsl()],
})
