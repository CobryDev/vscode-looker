// jest.config.js
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/test/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
