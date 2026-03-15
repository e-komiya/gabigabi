import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import CustomSlider from './CustomSlider';

interface ResizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  originalWidth?: number;
  originalHeight?: number;
}

const ACCENT = '#ff4e50';
const ACCENT2 = '#fc913a';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';
const INPUT_BG = '#111';

type TabMode = 'percent' | 'resolution';

const ResizeSlider: React.FC<ResizeSliderProps> = ({value, onValueChange, originalWidth, originalHeight}) => {
  const hasOriginal = originalWidth != null && originalHeight != null && originalWidth > 0 && originalHeight > 0;
  const [activeTab, setActiveTab] = useState<TabMode>('percent');
  const [widthText, setWidthText] = useState('');
  const [heightText, setHeightText] = useState('');

  // Sync direct inputs when value or original dimensions change
  useEffect(() => {
    if (hasOriginal && originalWidth != null && originalHeight != null && activeTab === 'resolution') {
      setWidthText(String(Math.round(originalWidth * value / 100)));
      setHeightText(String(Math.round(originalHeight * value / 100)));
    }
  }, [value, activeTab, hasOriginal, originalWidth, originalHeight]);

  const handleWidthChange = (text: string) => {
    setWidthText(text);
    const w = parseInt(text, 10);
    if (hasOriginal && originalWidth != null && originalHeight != null && w > 0) {
      const pct = Math.min(100, Math.max(1, Math.round((w / originalWidth) * 100)));
      setHeightText(String(Math.round(originalHeight * pct / 100)));
      onValueChange(pct);
    }
  };

  const handleHeightChange = (text: string) => {
    setHeightText(text);
    const h = parseInt(text, 10);
    if (hasOriginal && originalWidth != null && originalHeight != null && h > 0) {
      const pct = Math.min(100, Math.max(1, Math.round((h / originalHeight) * 100)));
      setWidthText(String(Math.round(originalWidth * pct / 100)));
      onValueChange(pct);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'percent' && styles.tabActive]}
          onPress={() => setActiveTab('percent')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'percent' && styles.tabTextActive]}>% 指定</Text>
        </TouchableOpacity>
        {hasOriginal && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'resolution' && styles.tabActive]}
            onPress={() => setActiveTab('resolution')}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'resolution' && styles.tabTextActive]}>解像度指定</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Percent tab */}
      {activeTab === 'percent' && (
        <View style={styles.tabContent}>
          <View style={styles.percentHeader}>
            <Text style={styles.label}>リサイズ倍率</Text>
            <Text style={styles.valueDisplay}>
              <Text style={styles.valueNumber}>{Math.round(value)}</Text>
              <Text style={styles.valueUnit}>%</Text>
            </Text>
          </View>
          <CustomSlider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={value}
            onValueChange={(v: number) => onValueChange(Math.round(v))}
            minimumTrackTintColor={ACCENT}
            maximumTrackTintColor={BORDER}
            thumbTintColor={ACCENT}
          />
          {hasOriginal && originalWidth != null && originalHeight != null && (
            <Text style={styles.resolutionHint}>
              → {Math.round(originalWidth * value / 100)} × {Math.round(originalHeight * value / 100)} px
            </Text>
          )}
        </View>
      )}

      {/* Resolution tab */}
      {activeTab === 'resolution' && hasOriginal && (
        <View style={styles.tabContent}>
          <View style={styles.directRow}>
            <View style={styles.directInput}>
              <Text style={styles.directLabel}>幅</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={widthText}
                onChangeText={handleWidthChange}
                placeholderTextColor="#555"
              />
            </View>
            <Text style={styles.directX}>×</Text>
            <View style={styles.directInput}>
              <Text style={styles.directLabel}>高さ</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={heightText}
                onChangeText={handleHeightChange}
                placeholderTextColor="#555"
              />
            </View>
            <Text style={styles.directUnit}>px</Text>
          </View>
          <Text style={styles.resolutionHint}>= {Math.round(value)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: ACCENT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    gap: 8,
  },
  percentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueDisplay: {
    alignItems: 'baseline',
  },
  valueNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: ACCENT,
  },
  valueUnit: {
    fontSize: 14,
    color: ACCENT2,
    fontWeight: '700',
    marginLeft: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  directRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directInput: {
    flex: 1,
  },
  directLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  directX: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    marginTop: 16,
  },
  directUnit: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginTop: 16,
  },
  resolutionHint: {
    fontSize: 12,
    color: ACCENT2,
    textAlign: 'right',
  },
});

export default ResizeSlider;
