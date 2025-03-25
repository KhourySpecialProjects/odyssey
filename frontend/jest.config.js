const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/types$": "<rootDir>/types",
    "^@/(.*)$": "<rootDir>/$1",
  },
  modulePaths: ["<rootDir>"],
  coverageDirectory: "../coverage",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: ".*\\.(spec|test)\\.(ts|js)$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
};
