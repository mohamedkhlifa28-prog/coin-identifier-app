import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors } from '../../src/lib/constants';
import type { User } from '@supabase/supabase-js';

type UserRecord = {
  name: string | null;
  plan: string | null;
  created_at: string | null;
};

type VoiceProfileRecord = {
  accuracy_score: number | null;
  profile_json: Record<string, unknown> | null;
};

function SettingsRow({
  label,
  value,
  onPress,
  danger,
  accent,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text
        style={[
          styles.rowLabel,
          danger && styles.rowLabelDanger,
          accent && styles.rowLabelAccent,
        ]}
      >
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress && !value ? <Text style={styles.rowChevron}>›</Text> : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const [userResult, vpResult] = await Promise.all([
          supabase.from('users').select('name, plan, created_at').eq('id', currentUser.id).maybeSingle(),
          supabase.from('voice_profiles').select('accuracy_score, profile_json').eq('user_id', currentUser.id).maybeSingle(),
        ]);
        setUserRecord(userResult.data ?? null);
        setVoiceProfile(vpResult.data ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleRedoOnboarding() {
    Alert.alert(
      'Redo Onboarding',
      'This will take you through the personality questions again and rebuild your Mirror profile. Your memories will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => router.push('/onboard'),
        },
      ]
    );
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function getDisplayName(): string {
    if (userRecord?.name) return userRecord.name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name as string;
    if (user?.user_metadata?.display_name) return user.user_metadata.display_name as string;
    return 'Anonymous';
  }

  function formatAccuracyScore(score: number | null): string {
    if (score === null || score === undefined) return 'Not yet rated';
    return `${score} / 100`;
  }

  function formatJoinDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getDisplayName().charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>{getDisplayName()}</Text>
        <Text style={styles.emailText}>{user?.email ?? '—'}</Text>
      </View>

      {/* Account section */}
      <SectionHeader title="Account" />
      <View style={styles.section}>
        <SettingsRow label="Name" value={getDisplayName()} />
        <View style={styles.divider} />
        <SettingsRow label="Email" value={user?.email ?? '—'} />
        <View style={styles.divider} />
        <SettingsRow
          label="Member Since"
          value={formatJoinDate(userRecord?.created_at ?? null)}
        />
      </View>

      {/* Mirror section */}
      <SectionHeader title="Your Mirror" />
      <View style={styles.section}>
        <SettingsRow
          label="Accuracy Score"
          value={formatAccuracyScore(voiceProfile?.accuracy_score ?? null)}
        />
        <View style={styles.divider} />
        <SettingsRow
          label="Profile Status"
          value={voiceProfile?.profile_json && Object.keys(voiceProfile.profile_json).length > 0 ? 'Built ✓' : 'Not built'}
        />
      </View>

      {/* Actions section */}
      <SectionHeader title="Actions" />
      <View style={styles.section}>
        <SettingsRow
          label="Redo Onboarding"
          onPress={handleRedoOnboarding}
          accent
        />
      </View>

      {/* Danger zone */}
      <SectionHeader title="Session" />
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Mirror v1.0.0</Text>
    </ScrollView>
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
  },
  scrollContent: {
    paddingTop: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.accent,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: Colors.muted,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 50,
  },
  rowLabel: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  rowLabelDanger: {
    color: Colors.error,
  },
  rowLabelAccent: {
    color: Colors.accent,
  },
  rowValue: {
    fontSize: 15,
    color: Colors.muted,
    maxWidth: '55%',
    textAlign: 'right',
  },
  rowChevron: {
    fontSize: 20,
    color: Colors.muted,
    lineHeight: 22,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    minHeight: 50,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.placeholder,
    marginTop: 32,
  },
});
