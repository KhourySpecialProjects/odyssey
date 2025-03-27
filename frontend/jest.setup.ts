import "@testing-library/jest-dom";

// Mock window.fetch and global fetch
global.fetch = jest.fn();
window.fetch = jest.fn();

// Mock Request
global.Request = class Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {}
} as any;

// Mock TextEncoder/TextDecoder
if (typeof TextEncoder === "undefined") {
  global.TextEncoder = require("util").TextEncoder;
}
if (typeof TextDecoder === "undefined") {
  global.TextDecoder = require("util").TextDecoder;
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock createRange
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

// Mock window.matchMedia
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

// Mock React.useId() for stable IDs in tests
let id = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useId: () => (++id).toString(),
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  id = 0; // Reset ID counter
});

const mockUseFormStatus = jest.fn(() => ({ pending: false }));
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => mockUseFormStatus(),
}));

// Mock useActionState
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: () => [{ ok: false, error: null }, jest.fn(), false],
}));
