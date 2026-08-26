import '@testing-library/jest-dom/vitest'

// jsdom does not implement matchMedia; polyfill for components that use prefers-reduced-motion.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom does not implement IntersectionObserver; mock for Reveal scroll-animation component.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  window.IntersectionObserver = MockIntersectionObserver as any
}
