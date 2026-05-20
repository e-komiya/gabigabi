import { convertImage } from '../data/ffmpeg/FfmpegConverter';

const mockExecute = jest.fn();
const mockGetReturnCode = jest.fn();
const mockGetAllLogsAsString = jest.fn().mockResolvedValue('');
const mockGetOutput = jest.fn().mockResolvedValue('');

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
  ReturnCode: {
    isSuccess: jest.fn().mockReturnValue(true),
  },
}));

// Per-URI file info store for the File mock
const mockFileInfoMap = new Map<string, { exists: boolean; size: number }>();
const mockFileDelete = jest.fn();

jest.mock('expo-file-system', () => {
  class MockFile {
    _uri: string;
    constructor(uri: string) { this._uri = uri; }
    get exists() { return mockFileInfoMap.get(this._uri)?.exists ?? true; }
    get size() { return mockFileInfoMap.get(this._uri)?.size ?? 0; }
    delete() { mockFileDelete(this._uri); }
    move(_dest: unknown) {}
  }
  return { File: MockFile };
});

const mockGetFileSizeBytes = jest.fn().mockReturnValue(0);

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  buildFfmpegCommand: jest.fn().mockImplementation((args: string[]) => args.filter(Boolean).join(' ')),
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: jest.fn().mockResolvedValue('mock logs'),
  getCacheDir: jest.fn().mockReturnValue('file:///cache/'),
  getFileSizeBytes: (...args: unknown[]) => mockGetFileSizeBytes(...args),
}));

function setupSuccessSession() {
  const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
  const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
  ReturnCode.isSuccess.mockReturnValue(true);
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({
    getReturnCode: mockGetReturnCode,
    getAllLogsAsString: mockGetAllLogsAsString,
    getOutput: mockGetOutput,
  });
  ffmpegUtils.buildFfmpegCommand.mockImplementation((args: string[]) => args.filter(Boolean).join(' '));
  ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
  ffmpegUtils.extractErrorFromLogs.mockResolvedValue('mock logs');
  ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
}

describe('convertImage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFileInfoMap.clear();
    mockGetFileSizeBytes.mockReturnValue(500);
    const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
    ffmpegUtils.buildFfmpegCommand.mockImplementation((args: string[]) => args.filter(Boolean).join(' '));
    ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
    ffmpegUtils.extractErrorFromLogs.mockResolvedValue('mock logs');
    ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
    setupSuccessSession();
  });

  it('JPEG変換時に -q:v を使う', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(500);

    const result = await convertImage('file:///photos/in.png', { outputFormat: 'jpeg', quality: 99 });

    expect(mockExecute.mock.calls[0][0]).toContain('-q:v');
    expect(result.outputUri).toMatch(/\.jpg$/);
  });

  it('PNG変換時に -compression_level 6 を使う', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(900);

    await convertImage('file:///photos/in.jpg', { outputFormat: 'png' });

    expect(mockExecute.mock.calls[0][0]).toContain('-compression_level 6');
  });

  it.each([
    { format: 'jpeg', expectedExt: '.jpg', qualityArg: '-q:v' },
    { format: 'png', expectedExt: '.png', qualityArg: '-compression_level 6' },
    { format: 'webp', expectedExt: '.webp', qualityArg: '-quality' },
    { format: 'bmp', expectedExt: '.bmp', qualityArg: '' },
  ])('主要フォーマット変換を網羅できる: $format', async ({ format, expectedExt, qualityArg }) => {
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(600);

    const result = await convertImage('file:///photos/input.png', { outputFormat: format as 'jpeg' | 'png' | 'webp' | 'bmp' });
    const cmd = mockExecute.mock.calls[0][0] as string;

    expect(result.outputUri).toMatch(new RegExp(`${expectedExt.replace('.', '\\.')}$`));
    if (qualityArg) {
      expect(cmd).toContain(qualityArg);
    }
  });

  it('GIF変換時に2パス実行しパレットを削除する', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(700);

    const result = await convertImage('file:///photos/in.mp4', { outputFormat: 'gif' });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[0][0]).toContain('fps=10');
    expect(mockExecute.mock.calls[0][0]).toContain('palettegen');
    expect(mockExecute.mock.calls[1][0]).toContain('paletteuse');
    // palette file deletion: new File(`file:///cache/in_converted_12345_abc.gif.palette.png`).delete()
    expect(mockFileDelete).toHaveBeenCalledWith('file:///cache/in_converted_12345_abc.gif.palette.png');
    expect(result.outputUri).toMatch(/\.gif$/);
  });

  it('GIF変換時にfpsとscaleオプションを反映する', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(650);

    await convertImage('file:///photos/in.mp4', { outputFormat: 'gif', gifFps: 15, gifScale: 50 });

    expect(mockExecute.mock.calls[0][0]).toContain('fps=15');
    expect(mockExecute.mock.calls[0][0]).toContain('iw*50/100');
    expect(mockExecute.mock.calls[1][0]).toContain('fps=15');
    expect(mockExecute.mock.calls[1][0]).toContain('iw*50/100');
  });

  it('入力ファイルが存在しない場合はエラー', async () => {
    mockFileInfoMap.set('file:///photos/in.jpg', { exists: false, size: 0 });
    await expect(convertImage('file:///photos/in.jpg', { outputFormat: 'webp' })).rejects.toThrow('入力ファイルが存在しません');
  });

  it('入力ファイルが0バイトの場合はエラー', async () => {
    mockGetFileSizeBytes.mockReturnValue(0);
    await expect(convertImage('file:///photos/in.jpg', { outputFormat: 'webp' })).rejects.toThrow('入力ファイルが空（0バイト）です');
  });

  it('FFmpeg失敗時に出力を削除してエラー', async () => {
    const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
    ReturnCode.isSuccess.mockReturnValue(false);
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(0);

    await expect(convertImage('file:///photos/in.jpg', { outputFormat: 'webp' })).rejects.toThrow('FFmpegフォーマット変換に失敗しました');
    expect(mockFileDelete).toHaveBeenCalledWith('file:///cache/in_converted_12345_abc.webp');
  });

  it.each([
    { outputFormat: 'jpeg' as const, expectedExt: '.jpg', expectedArg: '-q:v' },
    { outputFormat: 'png' as const, expectedExt: '.png', expectedArg: '-compression_level 6' },
    { outputFormat: 'webp' as const, expectedExt: '.webp', expectedArg: '-quality' },
    { outputFormat: 'bmp' as const, expectedExt: '.bmp', expectedArg: '-frames:v 1' },
  ])('主要フォーマット変換($outputFormat)で拡張子とコマンドが一致する', async ({ outputFormat, expectedExt, expectedArg }) => {
    mockGetFileSizeBytes.mockReturnValueOnce(1200).mockReturnValue(640);

    const result = await convertImage('file:///photos/input.png', { outputFormat, quality: 50 });

    expect(result.outputUri).toBe(`file:///cache/input_converted_12345_abc${expectedExt}`);
    expect(mockExecute.mock.calls[0][0]).toContain(expectedArg);
  });

  it('GIF変換で出力拡張子と2-pass経路が一致する', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(2000).mockReturnValue(800);

    const result = await convertImage('file:///photos/anim.webp', { outputFormat: 'gif' });

    expect(result.outputUri).toBe('file:///cache/anim_converted_12345_abc.gif');
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[0][0]).toContain('palettegen');
    expect(mockExecute.mock.calls[1][0]).toContain('paletteuse');
  });

  it('BMP変換: FFmpeg失敗時に出力を削除してエラーをスローする', async () => {
    const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
    ReturnCode.isSuccess.mockReturnValue(false);
    mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(0);

    await expect(
      convertImage('file:///photos/in.jpg', { outputFormat: 'bmp' })
    ).rejects.toThrow('FFmpegフォーマット変換に失敗しました');
    expect(mockFileDelete).toHaveBeenCalledWith(
      'file:///cache/in_converted_12345_abc.bmp'
    );
  });

  it('GIF変換: パレット生成（pass1）失敗時にエラーをスローしパレットファイルを削除する', async () => {
    const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
    // pass1 失敗、pass2 は呼ばれない
    ReturnCode.isSuccess.mockReturnValueOnce(false);
    mockGetFileSizeBytes.mockReturnValueOnce(1000);

    await expect(
      convertImage('file:///photos/in.mp4', { outputFormat: 'gif' })
    ).rejects.toThrow('GIF パレット生成に失敗しました');
    // finally ブロックでパレットファイルが削除されること
    expect(mockFileDelete).toHaveBeenCalledWith(
      'file:///cache/in_converted_12345_abc.gif.palette.png'
    );
    // pass2 は実行されないこと
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('extMap が全 ImageFormat を網羅している（スナップショット）', async () => {
    // 各フォーマットで convertImage を呼んで出力拡張子を収集する
    const formats = ['jpeg', 'png', 'webp', 'bmp', 'gif'] as const;
    const extResults: Record<string, string> = {};

    for (const fmt of formats) {
      jest.resetAllMocks();
      mockFileInfoMap.clear();
      const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
      ffmpegUtils.buildFfmpegCommand.mockImplementation((args: string[]) => args.filter(Boolean).join(' '));
      ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
      ffmpegUtils.extractErrorFromLogs.mockResolvedValue('mock logs');
      ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
      mockGetFileSizeBytes.mockReturnValueOnce(1000).mockReturnValue(500);
      setupSuccessSession();

      const result = await convertImage('file:///photos/input.png', { outputFormat: fmt });
      const ext = result.outputUri.replace(/^.*(\.\w+)$/, '$1');
      extResults[fmt] = ext;
    }

    expect(extResults).toMatchSnapshot();
  });

  it('HEIC入力ファイルから JPEG へ変換できる', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(3000).mockReturnValue(800);

    const result = await convertImage('file:///photos/photo.heic', {
      outputFormat: 'jpeg',
      quality: 0,
    });

    expect(result.outputUri).toMatch(/\.jpg$/);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const cmd = mockExecute.mock.calls[0][0] as string;
    expect(cmd).toContain('photo.heic');
  });

  it('HEIF入力ファイルから PNG へ変換できる', async () => {
    mockGetFileSizeBytes.mockReturnValueOnce(3500).mockReturnValue(1200);

    const result = await convertImage('file:///photos/photo.heif', {
      outputFormat: 'png',
    });

    expect(result.outputUri).toMatch(/\.png$/);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
