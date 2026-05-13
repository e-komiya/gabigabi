import {useState, useCallback} from 'react';
import {Animated} from 'react-native';

export const useSaveFeedback = () => {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageOpacity] = useState(new Animated.Value(0));

  const showSaveFeedback = useCallback(
    (message: string) => {
      setSaveMessage(message);
      Animated.sequence([
        Animated.timing(saveMessageOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(saveMessageOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => setSaveMessage(null));
    },
    [saveMessageOpacity],
  );

  return {saveMessage, saveMessageOpacity, showSaveFeedback};
};
