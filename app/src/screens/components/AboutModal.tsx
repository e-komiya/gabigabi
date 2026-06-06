import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  StyleSheet,
} from 'react-native';

import { ACCENT, BORDER } from './sharedStyles';
import { t } from '../../i18n';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
    accessibilityViewIsModal
    accessibilityLabel={t('appDescription')}
  >
    <View style={styles.overlay} accessible={false}>
      <View style={styles.dialog} accessibilityRole="summary" accessible>
        <Text style={styles.title} accessibilityRole="header">
          GabiGabi
        </Text>
        <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
        <Text style={styles.bodyText}>{t('appDescription')}</Text>
        <Text style={styles.bodyText}>{t('license')}</Text>
        <Text style={styles.bodyText}>{t('ffmpegUsage')}</Text>
        <TouchableOpacity
          onPress={() => {
            Linking.openURL('https://github.com/e-komiya/gabigabi');
          }}
          accessibilityRole="link"
          accessibilityLabel={t('viewSourceOnGitHub')}
          accessibilityHint="GitHubのリポジトリページをブラウザで開きます"
        >
          <Text style={styles.link}>{t('viewSourceOnGitHub')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
        >
          <Text style={styles.closeButtonText}>{t('close')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  bodyText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  link: {
    color: '#4da6ff',
    fontSize: 14,
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  accentText: {
    color: ACCENT,
  },
});

export default AboutModal;
