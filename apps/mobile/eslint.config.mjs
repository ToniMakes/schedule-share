import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off"
    }
  }
];
