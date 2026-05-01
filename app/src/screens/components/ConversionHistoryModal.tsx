import React, {useCallback, useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ConversionHistoryItem,
  clearConversionHistory,
  getConversionHistory,
} from '../../data/history/conversionHistory';
import {t} from '../../i18n';

interface ConversionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

const DARK_BG = '#0d0d0d';
const CARD_BG = '#1a1a1a';
const ACCENT = '#ff4e50';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${da} ${h}:${mi}`;
  } catch {
    return iso;
  }
}

function actionLabel(action: ConversionHistoryItem['params']['action']): string {
  switch (action) {
    case 'gabigabi': return t('actionGabigabi');
    case 'convert': return t('actionConvert');
    case 'targetSize': return t('actionTargetSize');
    default: return String(action);
  }
}

const HistoryItem: React.FC<{item: ConversionHistoryItem}> = ({item}) => {
  const ratio = item.inputBytes > 0
    ? Math.round((item.outputBytes / item.inputBytes) * 100)
    : 0;
  const fileName = item.outputPath.split('/').pop() ?? '—';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        <View style={[styles.actionBadge, item.params.action === 'gabigabi' && styles.actionBadgeGabi]}>
          <Text style={styles.actionBadgeText}>{actionLabel(item.params.action)}</Text>
        </View>
      </View>
      <Text style={styles.itemFileName} numberOfLines={1} ellipsizeMode="middle">📄 {fileName}</Text>
      <View style={styles.itemSizeRow}>
        <Text style={styles.itemSize}>{formatBytes(item.inputBytes)}</Text>
        <Text style={styles.itemArrow}>→</Text>
        <Text style={[styles.itemSize, ratio < 100 ? styles.sizeReduced : styles.sizeIncreased]}>
          {formatBytes(item.outputBytes)}
        </Text>
        <Text style={styles.itemRatio}>({ratio}%)</Text>
      </View>
    </View>
  );
};

const ConversionHistoryModal: React.FC<ConversionHistoryModalProps> = ({visible, onClose}) => {
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getConversionHistory();
      setHistory(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible, loadHistory]);

  const handleClear = useCallback(() => {
    Alert.alert(
      t('clearHistoryTitle'),
      t('clearHistoryMessage'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('clearHistoryConfirm'),
          style: 'destructive',
          onPress: async () => {
            await clearConversionHistory();
            setHistory([]);
          },
        },
      ],
    );
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('conversionHistoryTitle')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noHistory')}</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={item => item.id}
            renderItem={({item}) => <HistoryItem item={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Clear button */}
        {history.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel={t('clearHistoryTitle')}>
              <Text style={styles.clearButtonText}>{t('clearHistoryTitle')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
  },
  itemCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  actionBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeGabi: {
    backgroundColor: '#ff980033',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  actionBadgeText: {
    fontSize: 11,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  itemFileName: {
    fontSize: 12,
    color: '#aaa',
  },
  itemSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemSize: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  itemArrow: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  sizeReduced: {
    color: '#2ecc71',
  },
  sizeIncreased: {
    color: ACCENT,
  },
  itemRatio: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  clearButton: {
    backgroundColor: '#3a1010',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearButtonText: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ConversionHistoryModal;
