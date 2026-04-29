import React, {useCallback, useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {t} from '../i18n';

interface ImageModalProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const ImageModal: React.FC<ImageModalProps> = ({uri, visible, onClose}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const scaleValueRef = useRef(1);
  const translateXValueRef = useRef(0);
  const translateYValueRef = useRef(0);
  const initialDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const scaleId = scale.addListener(({value}) => {
      scaleValueRef.current = value;
    });
    const txId = translateX.addListener(({value}) => {
      translateXValueRef.current = value;
    });
    const tyId = translateY.addListener(({value}) => {
      translateYValueRef.current = value;
    });
    return () => {
      scale.removeListener(scaleId);
      translateX.removeListener(txId);
      translateY.removeListener(tyId);
    };
  }, [scale, translateX, translateY]);

  const reset = useCallback(() => {
    scale.setValue(1);
    lastScale.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  }, [scale, translateX, translateY]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateX.setOffset(lastTranslateX.current);
        translateY.setOffset(lastTranslateY.current);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (initialDistanceRef.current == null) {
            initialDistanceRef.current = distance;
          }
          const newScale = Math.max(
            0.5,
            Math.min(5, lastScale.current * (distance / initialDistanceRef.current)),
          );
          scale.setValue(newScale);
        } else {
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        initialDistanceRef.current = null;
        lastScale.current = scaleValueRef.current;
        translateX.flattenOffset();
        translateY.flattenOffset();
        lastTranslateX.current = translateXValueRef.current;
        lastTranslateY.current = translateYValueRef.current;
      },
    }),
  ).current;

  if (!uri) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} accessibilityViewIsModal={true}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('close')}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Animated.Image
          source={{uri}}
          style={[
            styles.image,
            {
              transform: [{scale}, {translateX}, {translateY}],
            },
          ]}
          resizeMode="contain"
          accessible={true}
          accessibilityRole="image"
          accessibilityLabel={t('previewImage')}
          {...panResponder.panHandlers}
        />
        <TouchableOpacity style={styles.resetBtn} onPress={reset}
          accessibilityRole="button"
          accessibilityLabel={t('reset')}>
          <Text style={styles.resetBtnText}>{t('reset')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  resetBtn: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default ImageModal;
