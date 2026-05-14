import {renderHook, act} from '@testing-library/react-native';
import {Alert} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import {useImagePicker} from '../hooks/useImagePicker';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockRequestPermissions = ExpoImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchPicker = ExpoImagePicker.launchImageLibraryAsync as jest.Mock;

describe('useImagePicker', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermissions.mockResolvedValue({status: 'granted'});
  });

  it('isProcessing が true の場合は何もしないこと', async () => {
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: true, selectedMediaType: null, onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('権限が拒否された場合は Alert を表示すること', async () => {
    mockRequestPermissions.mockResolvedValue({status: 'denied'});
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: null, onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(Alert.alert).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('画像選択がキャンセルされたとき onSelect が呼ばれないこと', async () => {
    mockLaunchPicker.mockResolvedValue({canceled: true, assets: []});
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: null, onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('画像が選択されたとき onSelect が image タイプで呼ばれること', async () => {
    mockLaunchPicker.mockResolvedValue({
      canceled: false,
      assets: [{uri: 'file:///photo.jpg', type: 'image'}],
    });
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: 'image', onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(onSelect).toHaveBeenCalledWith('file:///photo.jpg', 'image');
  });

  it('動画が選択されたとき onSelect が video タイプで呼ばれること', async () => {
    mockLaunchPicker.mockResolvedValue({
      canceled: false,
      assets: [{uri: 'file:///video.mp4', type: 'video'}],
    });
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: 'video', onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(onSelect).toHaveBeenCalledWith('file:///video.mp4', 'video');
  });

  it('selectedMediaType が video のとき launchImageLibraryAsync に videos が渡されること', async () => {
    mockLaunchPicker.mockResolvedValue({canceled: true, assets: []});
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: 'video', onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(mockLaunchPicker).toHaveBeenCalledWith(
      expect.objectContaining({mediaTypes: ['videos']}),
    );
  });

  it('selectedMediaType が image のとき launchImageLibraryAsync に images が渡されること', async () => {
    mockLaunchPicker.mockResolvedValue({canceled: true, assets: []});
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: 'image', onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(mockLaunchPicker).toHaveBeenCalledWith(
      expect.objectContaining({mediaTypes: ['images']}),
    );
  });

  it('uri が動画拡張子の場合 video として判定されること', async () => {
    mockLaunchPicker.mockResolvedValue({
      canceled: false,
      assets: [{uri: 'file:///clip.mov', type: 'image'}],
    });
    const {result} = renderHook(() =>
      useImagePicker({isProcessing: false, selectedMediaType: null, onSelect}),
    );
    await act(async () => {
      await result.current.handleOpenPicker();
    });
    expect(onSelect).toHaveBeenCalledWith('file:///clip.mov', 'video');
  });
});
