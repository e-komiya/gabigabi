import React, {useRef, useCallback} from 'react';
import {View, PanResponder, StyleSheet, LayoutChangeEvent, ViewStyle} from 'react-native';

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: ViewStyle;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  minimumValue,
  maximumValue,
  step = 1,
  value,
  onValueChange,
  minimumTrackTintColor = '#ff4e50',
  maximumTrackTintColor = '#2a2a2a',
  thumbTintColor = '#ff4e50',
  style,
}) => {
  const trackWidth = useRef(0);
  const trackX = useRef(0);
  const trackRef = useRef<View>(null);

  const clamp = (v: number) => {
    let clamped = Math.min(maximumValue, Math.max(minimumValue, v));
    if (step > 0) {
      clamped = Math.round((clamped - minimumValue) / step) * step + minimumValue;
    }
    return clamped;
  };

  const getValueFromX = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / (trackWidth.current || 1)));
    return clamp(minimumValue + ratio * (maximumValue - minimumValue));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        if (!isNaN(x)) {
          onValueChange(getValueFromX(x));
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // locationX は PanResponder において grant 時の相対座標をベースにした累積値となり
        // ドラッグ中は grant 時点からのオフセット（dx）を加味しないと期待する相対座標にならない。
        // 最も安定しているのは moveX（絶対座標）から trackX（コンポーネントの画面開始位置）を引く方法。
        const x = gestureState.moveX - trackX.current;
        if (!isNaN(x)) {
          onValueChange(getValueFromX(x));
        }
      },
    }),
  ).current;

  const onLayout = useCallback((_e: LayoutChangeEvent) => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      trackWidth.current = width;
      trackX.current = pageX;
    });
  }, []);

  const rawRatio = (value - minimumValue) / (maximumValue - minimumValue);
  const ratio = isNaN(rawRatio) ? 0 : Math.min(1, Math.max(0, rawRatio));

  return (
    <View ref={trackRef} style={[styles.container, style]} onLayout={onLayout} {...panResponder.panHandlers}>
      <View style={styles.track}>
        <View style={[styles.trackFill, {flex: ratio, backgroundColor: minimumTrackTintColor}]} />
        <View style={[styles.trackEmpty, {flex: 1 - ratio, backgroundColor: maximumTrackTintColor}]} />
      </View>
      <View style={[styles.thumb, {left: `${ratio * 100}%`, backgroundColor: thumbTintColor}]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
  },
  trackEmpty: {
    height: 4,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    top: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default CustomSlider;
