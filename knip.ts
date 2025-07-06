import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    "packages/*": {
      entry: ["src/index.ts", "rolldown.config.ts"],
      project: ["src/**/*.ts"],
      ignore: ["src/typings/**/*"],
    },
  },
  ignoreDependencies: ["playwright", "@vitest/coverage-v8"],
};

export default config;
