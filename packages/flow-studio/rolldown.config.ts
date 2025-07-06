import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "rolldown";

// Plugin to copy static assets
function copyAssets() {
  return {
    name: "copy-assets",
    generateBundle() {
      // Copy style.css
      const styleSrc = path.resolve(__dirname, "src/client/style.css");
      const styleDest = path.resolve(__dirname, "dist/style.css");
      if (fs.existsSync(styleSrc)) {
        const dir = path.dirname(styleDest);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(styleSrc, styleDest);
      }

      // Copy index.js (Camunda Modeler plugin manifest)
      const indexSrc = path.resolve(__dirname, "src/index.js");
      const indexDest = path.resolve(__dirname, "dist/index.js");
      if (fs.existsSync(indexSrc)) {
        fs.copyFileSync(indexSrc, indexDest);
      }

      // Create package.json in dist to force CommonJS interpretation
      const distPackageJson = path.resolve(__dirname, "dist/package.json");
      fs.writeFileSync(
        distPackageJson,
        JSON.stringify(
          {
            type: "commonjs",
          },
          null,
          2
        )
      );
    },
  };
}

// CommonJS build for Camunda Modeler - bundle all dependencies
export default [
  // Client bundle - standalone
  defineConfig({
    input: "src/client/index.ts",
    output: {
      file: "dist/client.js",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    treeshake: true,
  }),
  // Server bundle - standalone
  defineConfig({
    input: "src/server/index.ts",
    output: {
      file: "dist/server.js",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    treeshake: true,
  }),
  // Menu bundle - standalone
  defineConfig({
    input: "src/client/menu.ts",
    output: {
      file: "dist/menu.js",
      format: "cjs",
      exports: "default", // Export as module.exports for default export
      sourcemap: true,
    },
    plugins: [copyAssets()], // Only run copyAssets once
    treeshake: true,
  }),
];
