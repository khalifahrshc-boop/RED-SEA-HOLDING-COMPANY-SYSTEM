import * as firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: ["dist/**/*", "node_modules/**/*"]
  },
  firebaseRulesPlugin.flatRecommended
];
