/**
 * Integration test: fixture動画を使ったffmpeg変換テスト
 *
 * React Native の ffmpeg-kit はネイティブモジュールのため Node.js では実行不可。
 * このテストではコマンドライン ffmpeg を直接実行して変換結果を検証する。
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures');
const INPUT_MP4 = path.join(FIXTURES_DIR, 'test.mp4');
const INPUT_WEBM = path.join(FIXTURES_DIR, 'test.webm');

describe('ffmpeg integration tests', () => {
  let tmpDir: string = '';

  beforeAll(() => {
    // ffmpeg が利用可能か確認
    try {
      execSync('ffmpeg -version', { stdio: 'pipe' });
    } catch {
      throw new Error('ffmpeg is not installed or not in PATH');
    }

    // fixture ファイルの存在確認
    expect(fs.existsSync(INPUT_MP4)).toBe(true);
    expect(fs.existsSync(INPUT_WEBM)).toBe(true);
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'convert2gabigabi-test-'));
  });

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const convertAndVerify = (inputFile: string, outputExt: string) => {
    const outputFile = path.join(tmpDir, `output.${outputExt}`);
    // mpg (MPEG-1) requires standard frame rates (e.g. 25fps); upsample if needed
    const extraArgs = outputExt === 'mpg' ? '-r 25' : '';
    execSync(`ffmpeg -i "${inputFile}" ${extraArgs} "${outputFile}" -y`, { stdio: 'pipe' });

    // ファイルが存在すること
    expect(fs.existsSync(outputFile)).toBe(true);

    // ファイルが0バイトでないこと
    const stat = fs.statSync(outputFile);
    expect(stat.size).toBeGreaterThan(0);

    // 拡張子が正しいこと
    expect(path.extname(outputFile)).toBe(`.${outputExt}`);

    return outputFile;
  };

  describe('mp4 input → various formats', () => {
    it('mp4 → mp4', () => {
      convertAndVerify(INPUT_MP4, 'mp4');
    });

    it('mp4 → avi', () => {
      convertAndVerify(INPUT_MP4, 'avi');
    });

    it('mp4 → mov', () => {
      convertAndVerify(INPUT_MP4, 'mov');
    });

    it('mp4 → mpg', () => {
      convertAndVerify(INPUT_MP4, 'mpg');
    });

    it('mp4 → mkv', () => {
      convertAndVerify(INPUT_MP4, 'mkv');
    });

    it('mp4 → webm', () => {
      convertAndVerify(INPUT_MP4, 'webm');
    });
  });

  describe('webm input → various formats', () => {
    it('webm → mp4', () => {
      convertAndVerify(INPUT_WEBM, 'mp4');
    });

    it('webm → avi', () => {
      convertAndVerify(INPUT_WEBM, 'avi');
    });

    it('webm → mov', () => {
      convertAndVerify(INPUT_WEBM, 'mov');
    });

    it('webm → mpg', () => {
      convertAndVerify(INPUT_WEBM, 'mpg');
    });

    it('webm → mkv', () => {
      convertAndVerify(INPUT_WEBM, 'mkv');
    });

    it('webm → webm', () => {
      convertAndVerify(INPUT_WEBM, 'webm');
    });
  });
});
