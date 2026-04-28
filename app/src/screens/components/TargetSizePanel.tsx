import React from 'react';
import {View, Text, TouchableOpacity, TextInput, StyleSheet} from 'react-native';
import {SizeUnit} from '../../state/store';
import {t} from '../../i18n';
import {sharedStyles, BORDER, TEXT_SECONDARY} from './sharedStyles';

const TARGET_SIZE_TEMPLATES: {label: string; value: string; unit: SizeUnit}[] = [
  {label: 'Discord 10MB', value: '10', unit: 'MB'},
];

interface TargetSizePanelProps {
  targetSizeValue: string;
  targetSizeUnit: SizeUnit;
  onValueChange: (val: string) => void;
  onUnitChange: (unit: SizeUnit) => void;
}

const TargetSizePanel: React.FC<TargetSizePanelProps> = ({
  targetSizeValue,
  targetSizeUnit,
  onValueChange,
  onUnitChange,
}) => {
  const handleTemplateSelect = (tmpl: typeof TARGET_SIZE_TEMPLATES[0]) => {
    onValueChange(tmpl.value);
    onUnitChange(tmpl.unit);
  };

  return (
    <View style={sharedStyles.sectionContainer}>
      <Text style={sharedStyles.sectionTitle}>{t('targetSizeSettings')}</Text>
      <View style={styles.targetSizeInputRow}>
        <TextInput
          style={styles.targetSizeInput}
          value={targetSizeValue}
          onChangeText={onValueChange}
          keyboardType="numeric"
          placeholder="0.0"
          placeholderTextColor="#666"
        />
        <View style={styles.unitButtons}>
          {(['KB', 'MB', 'GB'] as SizeUnit[]).map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitButton, targetSizeUnit === u && styles.unitButtonActive]}
              onPress={() => onUnitChange(u)}>
              <Text style={[styles.unitButtonText, targetSizeUnit === u && styles.unitButtonTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[sharedStyles.sectionTitle, {marginTop: 20}]}>{t('template')}</Text>
      <View style={styles.targetSizeTemplates}>
        {TARGET_SIZE_TEMPLATES.map(tmpl => (
          <TouchableOpacity
            key={tmpl.label}
            style={styles.targetSizeTemplate}
            onPress={() => handleTemplateSelect(tmpl)}>
            <Text style={styles.targetSizeTemplateText}>{tmpl.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{color: '#666', fontSize: 12, marginTop: 16, lineHeight: 18}}>
        {t('targetSizeNote')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  targetSizeInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  targetSizeInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unitButtons: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  unitButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitButtonActive: {
    backgroundColor: '#444',
  },
  unitButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  targetSizeTemplates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetSizeTemplate: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  targetSizeTemplateText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
});

export default TargetSizePanel;
