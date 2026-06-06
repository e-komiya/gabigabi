import { formatBytes } from '../utils/formatBytes';

describe('formatBytes', () => {
  it('ゼロバイトを正しく表示する', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('1024未満はバイト単位で表示する', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('境界値 1024 は KB 単位で表示する', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('1024以上 1MB未満は KB 単位で表示する', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('境界値 1048576 (1MB) は MB 単位で表示する', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
  });

  it('1MB以上は MB 単位で表示する', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.00 MB');
  });
});
