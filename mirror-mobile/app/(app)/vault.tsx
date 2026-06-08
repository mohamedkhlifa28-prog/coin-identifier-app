import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { Colors } from '../../src/lib/constants';

type Memory = {
  id: string;
  content: string;
  context: string | null;
  tags: string[] | null;
  created_at: string;
  emotional_weight: number | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(memory.created_at)}</Text>
        {memory.emotional_weight !== null && (
          <View style={styles.weightBadge}>
            <Text style={styles.weightText}>
              {'◆'.repeat(Math.min(Math.round(memory.emotional_weight / 2), 5))}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.cardContent}>"{memory.content}"</Text>

      {memory.context ? (
        <Text style={styles.cardContext}>{memory.context}</Text>
      ) : null}

      {memory.tags && memory.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {memory.tags.map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Not authenticated.');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('memories')
        .select('id, content, context, tags, created_at, emotional_weight')
        .eq('user_id', sessionData.session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setMemories(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load memories.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  function handleRefresh() {
    setRefreshing(true);
    fetchMemories(true);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorSymbol}>◈</Text>
        <Text style={styles.errorTitle}>Couldn't load vault</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchMemories()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={memories}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MemoryCard memory={item} />}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + 16 },
        memories.length === 0 && styles.listContentEmpty,
      ]}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.accent}
          colors={[Colors.accent]}
        />
      }
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={styles.headerSubtitle}>
            {memories.length === 0
              ? 'No memories yet'
              : `${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} stored`}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptySymbol}>◉</Text>
          <Text style={styles.emptyTitle}>Vault is empty</Text>
          <Text style={styles.emptySubtitle}>
            As you chat with Mirror, meaningful moments will be remembered here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listHeader: {
    paddingVertical: 12,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  weightBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  weightText: {
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1,
  },
  cardContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardContext: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    color: Colors.accent,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptySymbol: {
    fontSize: 48,
    color: Colors.accent,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  errorSymbol: {
    fontSize: 40,
    color: Colors.error,
    marginBottom: 16,
    opacity: 0.7,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
