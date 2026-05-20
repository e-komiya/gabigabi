import {renderHook, act} from '@testing-library/react-native';
import {Image} from 'react-native';
import { File } from 'expo-file-system';
import {FFprobeKit} from 'ffmpeg-kit-react-native';
import {useFileInfo} from '../hooks/useFileInfo';
import * as ffmpegUtils from '../data/ffmpeg/ffmpegUtils';

// モック設定
jest.mock('expo-file-system', () => {
  class MockFile {
    exists: boolean = true;
    size: number = 1024;
    constructor(uri: string) {}
    delete() {}
    move(dest: any) {}
  }
  return {
    Paths: { cache: { uri: 'file:///cache/' }, join: (...args: string[]) => args.join('/') },
    File: MockFile,
    Directory: class {
      exists = true;
      constructor() {}
      list() { return []; }
    },
  };
});

jest.mock('ffmpeg-kit-react-native', () => ({
  FFprobeKit: {
    execute: jest.fn(),
  },
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  getFileSizeBytes: jest.fn(),
}));

const mockedGetFileSizeBytes = ffmpegUtils.getFileSizeBytes as jest.Mock;
const mockedFFprobeKit = FFprobeKit.execute as jest.Mock;

describe('useFileInfo', () => {
  let getSizeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getSizeSpy = jest.spyOn(Image, 'getSize').mockImplementation(() => {});
  });

  afterEach(() => {
    getSizeSpy.mockRestore();
  });

  it('selectedImage が null のとき fileInfo が null であること', () => {
    const {result} = renderHook(() => useFileInfo(null, null));
    expect(result.current.fileInfo).toBeNull();
  });

  it('画像ファイルのとき Image.getSize が呼ばれ正しい fileInfo が返ること', async () => {
    mockedGetFileSizeBytes.mockReturnValue(512 * 1024);
    getSizeSpy.mockImplementation(
      (_uri: string, success: (w: number, h: number) => void) => {
        success(1280, 720);
      },
    );

    const {result} = renderHook(() =>
      useFileInfo('file:///test/photo.jpg', 'image'),
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getSizeSpy).toHaveBeenCalledWith(
      'file:///test/photo.jpg',
      expect.any(Function),
      expect.any(Function),
    );
    expect(result.current.fileInfo).toEqual({
      name: 'photo.jpg',
      size: '512.0 KB',
      width: 1280,
      height: 720,
    });
  });

  it('動画ファイルのとき FFprobeKit.execute が呼ばれ width/height が取得されること', async () => {
    mockedGetFileSizeBytes.mockReturnValue(2 * 1024 * 1024);
    const mockSession = {
      getOutput: jest.fn().mockResolvedValue(
        JSON.stringify({
          streams: [{codec_type: 'video', width: 1920, height: 1080}],
        }),
      ),
    };
    mockedFFprobeKit.mockResolvedValue(mockSession);

    const {result} = renderHook(() =>
      useFileInfo('file:///test/video.mp4', 'video'),
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockedFFprobeKit).toHaveBeenCalledWith(
      expect.stringContaining('file:///test/video.mp4'),
    );
    expect(result.current.fileInfo).toEqual({
      name: 'video.mp4',
      size: '2.00 MB',
      width: 1920,
      height: 1080,
    });
  });

  it('ファイルサイズが 1MB 以上のとき MB 表示になること', async () => {
    const bytes = 1.5 * 1024 * 1024;
    mockedGetFileSizeBytes.mockReturnValue(bytes);
    getSizeSpy.mockImplementation(
      (_uri: string, success: (w: number, h: number) => void) => {
        success(800, 600);
      },
    );

    const {result} = renderHook(() =>
      useFileInfo('file:///test/large.jpg', 'image'),
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.fileInfo?.size).toMatch(/MB$/);
  });

  it('ファイルサイズが 1MB 未満のとき KB 表示になること', async () => {
    const bytes = 256 * 1024;
    mockedGetFileSizeBytes.mockReturnValue(bytes);
    getSizeSpy.mockImplementation(
      (_uri: string, success: (w: number, h: number) => void) => {
        success(400, 300);
      },
    );

    const {result} = renderHook(() =>
      useFileInfo('file:///test/small.jpg', 'image'),
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.fileInfo?.size).toMatch(/KB$/);
  });

  it('アンマウント時にキャンセルフラグが立ち state 更新が行われないこと', async () => {
    let resolveGetSize: (w: number, h: number) => void = () => {};
    mockedGetFileSizeBytes.mockReturnValue(100 * 1024);
    getSizeSpy.mockImplementation(
      (_uri: string, success: (w: number, h: number) => void) => {
        resolveGetSize = success;
      },
    );

    const {result, unmount} = renderHook(() =>
      useFileInfo('file:///test/cancel.jpg', 'image'),
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // アンマウント後に getSize のコールバックを呼ぶ
    unmount();
    act(() => {
      resolveGetSize(100, 200);
    });

    // キャンセル後なので fileInfo は null のまま
    expect(result.current.fileInfo).toBeNull();
  });
});
