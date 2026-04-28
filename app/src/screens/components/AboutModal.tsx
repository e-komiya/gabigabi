import React from 'react';
import {View, Text, TouchableOpacity, Modal, Linking} from 'react-native';
import {t} from '../../i18n';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({visible, onClose}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24}}>
      <View style={{backgroundColor: '#1e1e1e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360}}>
        <Text style={{color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4, textAlign: 'center'}}>GabiGabi</Text>
        <Text style={{color: '#ccc', fontSize: 14, marginBottom: 16, textAlign: 'center'}}>{t('appSubtitle')}</Text>
        <Text style={{color: '#ccc', fontSize: 14, marginBottom: 8}}>{t('appDescription')}</Text>
        <Text style={{color: '#ccc', fontSize: 14, marginBottom: 8}}>{t('license')}</Text>
        <Text style={{color: '#ccc', fontSize: 14, marginBottom: 8}}>{t('ffmpegUsage')}</Text>
        <TouchableOpacity onPress={() => { Linking.openURL('https://github.com/e-komiya/gabigabi'); }}>
          <Text style={{color: '#4da6ff', fontSize: 14, marginBottom: 16}}>{t('viewSourceOnGitHub')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{backgroundColor: '#333', borderRadius: 8, padding: 12, alignItems: 'center'}}>
          <Text style={{color: '#fff', fontSize: 16}}>{t('close')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default AboutModal;
