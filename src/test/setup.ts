import "@testing-library/jest-dom";
import { vi } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(globalThis.URL, "createObjectURL", {
  configurable: true,
  writable: true,
  value: vi.fn(() => "blob:mock"),
});

Object.defineProperty(globalThis.URL, "revokeObjectURL", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});
