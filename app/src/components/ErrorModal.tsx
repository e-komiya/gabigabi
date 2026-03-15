import React, {useState, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

const DARK_BG = '#0d0d0d';
const CARD_BG = '#1a1a1a';
const ACCENT = '#ff4e50';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title = 'エラー',
  message,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>{title}</Text>
          </View>

          {/* Scrollable error body */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator>
            <Text selectable style={styles.messageText}>
              {message}
            </Text>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonDone]}
              onPress={handleCopy}
              activeOpacity={0.8}>
              <Text style={styles.copyButtonText}>
                {copied ? 'コピー済み ✓' : 'コピー'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}>
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: DARK_BG,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  bodyScroll: {
    maxHeight: 280,
  },
  bodyContent: {
    padding: 16,
  },
  messageText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  copyButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  copyButtonDone: {
    backgroundColor: '#1e3a2a',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default ErrorModal;
