// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'jest-canvas-mock';

const createCanvasContext = () => {
  const gradient = { addColorStop: jest.fn() };
  return {
    arc: jest.fn(),
    beginPath: jest.fn(),
    bezierCurveTo: jest.fn(),
    clearRect: jest.fn(),
    closePath: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
    createRadialGradient: jest.fn(() => gradient),
    drawImage: jest.fn(),
    ellipse: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    lineTo: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    moveTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    restore: jest.fn(),
    rotate: jest.fn(),
    roundRect: jest.fn(),
    save: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
    stroke: jest.fn(),
    strokeRect: jest.fn(),
    translate: jest.fn(),
  };
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: jest.fn(() => createCanvasContext()),
});

global.requestAnimationFrame = jest.fn(() => 1);
global.cancelAnimationFrame = jest.fn();

class MockWebSocket {
  constructor() {
    this.close = jest.fn();
  }
}

global.WebSocket = MockWebSocket;
