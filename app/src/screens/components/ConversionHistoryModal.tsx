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
  Image,
} from 'react-native';
import {
  ConversionHistoryItem,
  ConversionAction,
  clearConversionHistory,
  getConversionHistory,
} from '../../data/history/conversionHistory';
import {t} from '../../i18n';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DARK_BG, CARD_BG, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, BORDER} from './sharedStyles';
import {formatBytes} from '../../utils/formatBytes';

interface ConversionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
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

const HistoryItemThumbnail: React.FC<{uri: string; mediaType?: 'image' | 'video'}> = ({uri, mediaType}) => {
  const [error, setError] = useState(false);
  if (mediaType === 'video') {
    return (
      <View style={styles.thumbnail} accessibilityLabel="変換後動画のサムネイル">
        <Text style={styles.thumbnailFallback}>🎬</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.thumbnail} accessibilityLabel="変換後画像のサムネイル">
        <Text style={styles.thumbnailFallback}>📷</Text>
      </View>
    );
  }
  return (
    <Image
      source={{uri}}
      style={styles.thumbnail}
      accessibilityLabel="変換後画像のサムネイル"
      onError={() => setError(true)}
    />
  );
};

const HistoryItem: React.FC<{item: ConversionHistoryItem}> = ({item}) => {
  const ratio = item.inputBytes > 0
    ? Math.round((item.outputBytes / item.inputBytes) * 100)
    : 0;
  const fileName = item.outputPath.split('/').pop() ?? '—';
  const a11yLabel = `${actionLabel(item.params.action)} ${formatDate(item.createdAt)} ${formatBytes(item.inputBytes)} → ${formatBytes(item.outputBytes)} (${ratio}%)`;
  const thumbnailUri = item.outputPath.startsWith('file://') ? item.outputPath : `file://${item.outputPath}`;

  return (
    <View style={styles.itemCard} accessible={true} accessibilityLabel={a11yLabel}>
      <View style={styles.itemRow}>
        <HistoryItemThumbnail uri={thumbnailUri} mediaType={item.mediaType} />
        <View style={styles.itemContent}>
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
      </View>
    </View>
  );
};

const ConversionHistoryModal: React.FC<ConversionHistoryModalProps> = ({visible, onClose}) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<'all' | ConversionAction>('all');

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
        <View style={[styles.header, {paddingTop: insets.top + 12}]}>
          <Text style={styles.headerTitle}>{t('conversionHistoryTitle')}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={t('close')}>
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['all', 'gabigabi', 'convert', 'targetSize'] as const).map(action => (
            <TouchableOpacity
              key={action}
              style={[styles.filterTab, filterAction === action && styles.filterTabActive]}
              onPress={() => setFilterAction(action)}
              accessibilityRole="tab"
              accessibilityState={{selected: filterAction === action}}>
              <Text style={[styles.filterTabText, filterAction === action && styles.filterTabTextActive]}>
                {action === 'all' ? t('filterAll') : actionLabel(action as ConversionAction)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {(() => {
          const filteredHistory = filterAction === 'all'
            ? history
            : history.filter(item => item.params.action === filterAction);
          return loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : filteredHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('noHistory')}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredHistory}
              keyExtractor={item => item.id}
              renderItem={({item}) => <HistoryItem item={item} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              accessible={true}
              accessibilityLabel={t('conversionHistoryTitle')}
            />
          );
        })()}

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
    paddingTop: 12, // base value; dynamic safe-area padding applied inline via useSafeAreaInsets
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  thumbnailFallback: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#ff980033',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  filterTabText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#ff9800',
  },
});

export default ConversionHistoryModal;
