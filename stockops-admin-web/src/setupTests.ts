import '@testing-library/jest-dom'

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  value: 800,
})

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  value: 320,
})

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  value: 800,
})

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  value: 320,
})

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    x: 0,
    y: 0,
    width: 800,
    height: 320,
    top: 0,
    right: 800,
    bottom: 320,
    left: 0,
    toJSON: () => ({}),
  }
}

class MockResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    const contentRect = {
      x: 0,
      y: 0,
      width: 800,
      height: 320,
      top: 0,
      right: 800,
      bottom: 320,
      left: 0,
      toJSON: () => ({}),
    } as DOMRectReadOnly

    const boxSize = [{ inlineSize: 800, blockSize: 320 }] as ResizeObserverSize[]
    this.callback(
      [
        {
          target,
          contentRect,
          borderBoxSize: boxSize,
          contentBoxSize: boxSize,
          devicePixelContentBoxSize: boxSize,
        },
      ],
      this
    )
  }

  unobserve(): void {}

  disconnect(): void {}
}

globalThis.ResizeObserver = MockResizeObserver

HTMLAnchorElement.prototype.click = function click() {}
