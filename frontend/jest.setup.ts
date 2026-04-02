import "@testing-library/jest-dom";

global.fetch = jest.fn();
window.fetch = jest.fn();

global.Request = class Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {}
} as any;

if (typeof TextEncoder === "undefined") {
  global.TextEncoder = require("util").TextEncoder;
}
if (typeof TextDecoder === "undefined") {
  global.TextDecoder = require("util").TextDecoder;
}

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn();
  range.getClientRects = () => {
    return {
      item: () => null,
      length: 0,
      [Symbol.iterator]: jest.fn(),
    };
  };
  return range;
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

let id = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useId: () => (++id).toString(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  id = 0;
});

const mockUseFormStatus = jest.fn(() => ({ pending: false }));
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => mockUseFormStatus(),
}));

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: () => [{ ok: false, error: null }, jest.fn(), false],
  cache: (fn: Function) => fn,
}));
// Mock the flat package
jest.mock("flat", () => ({
  flatten: (obj: any) => obj,
  unflatten: (obj: any) => obj,
}));

// Mock posthog-js to prevent network calls in tests
jest.mock("posthog-js", () => ({
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  onFeatureFlags: jest.fn(),
  isFeatureEnabled: jest.fn(),
  getFeatureFlag: jest.fn(),
  people: { set: jest.fn() },
}));
