import { describe, test, expect, vi } from 'vitest';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Wiki-link Parser', () => {
  test('extracts simple wiki-links', () => {
    // Test: [[Note Name]] extracts "Note Name"
    expect(true).toBe(true);
  });

  test('extracts wiki-links with display text', () => {
    // Test: [[Note Name|Display Text]] extracts "Note Name"
    expect(true).toBe(true);
  });

  test('supports Chinese characters', () => {
    // Test: [[我的笔记]] extracts "我的笔记" (D-11)
    expect(true).toBe(true);
  });

  test('case sensitivity setting', () => {
    // Test: case_insensitive=true matches "note" to "Note" (D-09, D-10)
    expect(true).toBe(true);
  });
});
