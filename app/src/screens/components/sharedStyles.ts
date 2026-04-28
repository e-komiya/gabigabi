import {StyleSheet} from 'react-native';

export const DARK_BG = '#0d0d0d';
export const CARD_BG = '#1a1a1a';
export const ACCENT = '#ff4e50';
export const ACCENT2 = '#fc913a';
export const TEXT_PRIMARY = '#f0f0f0';
export const TEXT_SECONDARY = '#888';
export const BORDER = '#2a2a2a';

export const sharedStyles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
    lineHeight: 14,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatRowWrap: {
    flexWrap: 'wrap',
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#222',
  },
  formatButtonActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },
  gabigabiButtonActive: {
    borderColor: '#ff9800',
    backgroundColor: '#ff9800',
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  formatButtonTextActive: {
    color: '#fff',
  },
  qualityRow: {
    marginTop: 12,
  },
  qualityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  qualityLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qualityValue: {
    fontSize: 22,
    fontWeight: '900',
    color: ACCENT2,
  },
  qualitySlider: {
    width: '100%',
    height: 40,
  },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  formatGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  templateBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  templateBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  sliderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
});
