// vite.config.ts
import { defineConfig } from "file:///Users/haozhisheng/Desktop/Kyrie%E7%9A%84%E5%A4%96%E8%B4%B8%E7%9B%92%E5%AD%902/node_modules/.pnpm/vitest@2.1.9_jsdom@25.0.1/node_modules/vitest/dist/config.js";
import react from "file:///Users/haozhisheng/Desktop/Kyrie%E7%9A%84%E5%A4%96%E8%B4%B8%E7%9B%92%E5%AD%902/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client"
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: ["tests/server/**", "node_modules/**", "dist/**"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaGFvemhpc2hlbmcvRGVza3RvcC9LeXJpZVx1NzY4NFx1NTkxNlx1OEQzOFx1NzZEMlx1NUI1MDJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9oYW96aGlzaGVuZy9EZXNrdG9wL0t5cmllXHU3Njg0XHU1OTE2XHU4RDM4XHU3NkQyXHU1QjUwMi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvaGFvemhpc2hlbmcvRGVza3RvcC9LeXJpZSVFNyU5QSU4NCVFNSVBNCU5NiVFOCVCNCVCOCVFNyU5QiU5MiVFNSVBRCU5MDIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdC9jbGllbnQnLFxuICB9LFxuICB0ZXN0OiB7XG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBzZXR1cEZpbGVzOiAnLi9zcmMvdGVzdC9zZXR1cC50cycsXG4gICAgZXhjbHVkZTogWyd0ZXN0cy9zZXJ2ZXIvKionLCAnbm9kZV9tb2R1bGVzLyoqJywgJ2Rpc3QvKionXSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRVLFNBQVMsb0JBQW9CO0FBQ3pXLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFNBQVM7QUFBQSxJQUNULFlBQVk7QUFBQSxJQUNaLFNBQVMsQ0FBQyxtQkFBbUIsbUJBQW1CLFNBQVM7QUFBQSxFQUMzRDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
