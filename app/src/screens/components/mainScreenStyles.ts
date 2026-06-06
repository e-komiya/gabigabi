import { StyleSheet } from 'react-native';

import {
  DARK_BG,
  ACCENT,
  ACCENT2,
  TEXT_SECONDARY,
  BORDER,
} from './sharedStyles';

export const mainScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 180,
  },

  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerTitleBlock: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    flex: 1,
    paddingHorizontal: 30,
  },
  aboutButton: {
    position: 'absolute' as const,
    right: 0,
    padding: 8,
  },
  aboutButtonIcon: {
    fontSize: 20,
    color: '#aaa',
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
    textAlign: 'center',
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  previewColumn: {
    flex: 1,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  arrow: {
    fontSize: 28,
    color: ACCENT2,
    fontWeight: '700',
  },

  methodTabs: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  methodTabActive: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: BORDER,
  },
  methodTabText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  methodTabTextActive: {
    color: '#fff',
  },

  saveFeedback: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    zIndex: 9999,
  },
  saveFeedbackText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  processButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  targetSizeProcessButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#333',
    shadowOpacity: 0,
    elevation: 0,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  cancelButton: {
    backgroundColor: '#555',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#777',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  saveButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  resetButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  resetButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },

  spacer: {
    height: 20,
  },

  floatingArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },

  targetSizeWarning: {
    backgroundColor: '#3a2000',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  targetSizeWarningText: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: '600',
  },
});
