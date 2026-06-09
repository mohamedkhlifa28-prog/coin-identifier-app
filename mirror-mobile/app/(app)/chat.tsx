import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useNavigation } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { streamChat, transcribeAudio } from '../../src/lib/api';
import { Colors } from '../../src/lib/constants';
import MessageBubble, { ChatMessage } from '../../src/components/MessageBubble';

type ConvSummary = {
  id: string;
  title: string | null;
  session_date: string;
  messages_json: { role: 'user' | 'assistant'; content: string }[];
};

let messageIdCounter = 0;
function newId() {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sessionId] = useState<string>(() => `session_${Date.now()}`);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [language] = useState('en');

  const [convId, setConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={openHistory}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: Colors.accent, fontSize: 15, fontWeight: '500' }}>
            History
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleNewChat}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: Colors.accent, fontSize: 15, fontWeight: '500' }}>
            New Chat
          </Text>
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: Colors.text, fontSize: 17, fontWeight: '600' }}>Mirror</Text>
          <Text style={{ color: Colors.muted, fontSize: 11 }}>Talking to your Mirror</Text>
        </View>
      ),
    });
  }, [navigation]);

  function openHistory() {
    setShowHistory(true);
    loadHistory();
  }

  function handleNewChat() {
    Alert.alert('New Chat', 'Start a new conversation? This will clear the current chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Chat',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          setInputText('');
          setIsLoading(false);
          setConvId(null);
        },
      },
    ]);
  }

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('conversations')
        .select('id, title, session_date, messages_json')
        .eq('user_id', session.user.id)
        .order('session_date', { ascending: false })
        .limit(30);
      setConversations((data as ConvSummary[]) || []);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  async function saveConversation(msgs: ChatMessage[]) {
    if (msgs.length === 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const messagesForDb = msgs.map((m) => ({ role: m.role, content: m.content }));
      const firstUserMsg = msgs.find((m) => m.role === 'user');
      const title = firstUserMsg?.content?.slice(0, 50) || 'Chat';

      if (convId) {
        await supabase
          .from('conversations')
          .update({ messages_json: messagesForDb, title })
          .eq('id', convId);
      } else {
        const { data } = await supabase
          .from('conversations')
          .insert({
            user_id: session.user.id,
            messages_json: messagesForDb,
            title,
            session_date: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (data) setConvId(data.id);
      }
    } catch {
      // Non-critical — don't crash the UI if save fails
    }
  }

  function loadConversation(conv: ConvSummary) {
    const msgs: ChatMessage[] = conv.messages_json.map((m) => ({
      id: newId(),
      role: m.role,
      content: m.content,
      timestamp: new Date(conv.session_date),
    }));
    setMessages(msgs);
    setConvId(conv.id);
    setShowHistory(false);
  }

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [messages]);

  async function sendMessage(text: string, autoSpeak = false) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInputText('');
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const snapshotMessages = [...messages];

    setMessages((prev) => [...prev, userMessage]);

    const assistantId = newId();
    streamingMessageIdRef.current = assistantId;

    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    let fullResponse = '';

    try {
      await streamChat(trimmed, history, sessionId, language, (chunk) => {
        fullResponse += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullResponse } : m
          )
        );
      });

      setIsLoading(false);
      streamingMessageIdRef.current = null;

      // Save conversation to Supabase (fire-and-forget)
      const finalMsgs: ChatMessage[] = [
        ...snapshotMessages,
        userMessage,
        { id: assistantId, role: 'assistant' as const, content: fullResponse, timestamp: new Date() },
      ];
      saveConversation(finalMsgs);

      if (autoSpeak && fullResponse.trim()) {
        speakText(assistantId, fullResponse);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to get a response. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `[Error: ${message}]` }
            : m
        )
      );
      setIsLoading(false);
      streamingMessageIdRef.current = null;
    }
  }

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }

  async function stopRecordingAndTranscribe() {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      const transcript = await transcribeAudio(uri);
      setIsTranscribing(false);

      if (transcript.trim()) {
        await sendMessage(transcript, true);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setIsTranscribing(false);
      Alert.alert('Error', 'Could not transcribe audio. Please try again.');
    }
  }

  function speakText(id: string, content: string) {
    if (speakingId === id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }

    Speech.stop();
    setSpeakingId(id);

    Speech.speak(content, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
    });
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isStreaming =
      streamingMessageIdRef.current === item.id && item.content === '';

    if (isStreaming) {
      return (
        <View style={styles.typingRow}>
          <View style={styles.typingAvatar}>
            <Text style={styles.typingAvatarText}>◈</Text>
          </View>
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <MessageBubble
        message={item}
        isSpeaking={speakingId === item.id}
        onSpeakToggle={speakText}
      />
    );
  }

  function renderEmptyState() {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptySymbol}>◈</Text>
        <Text style={styles.emptyTitle}>Your Mirror is ready</Text>
        <Text style={styles.emptySubtitle}>
          Say anything — your Mirror understands you better than anyone.
        </Text>
      </View>
    );
  }

  function formatConvDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const isMicBusy = isRecording || isTranscribing;

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        <View
          style={[
            styles.inputRow,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              isTranscribing && styles.micButtonTranscribing,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecordingAndTranscribe}
            disabled={isLoading || isTranscribing}
            activeOpacity={0.7}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text
                style={[
                  styles.micIcon,
                  isRecording && styles.micIconRecording,
                ]}
              >
                {isRecording ? '⏺' : '🎙'}
              </Text>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isMicBusy ? 'Listening…' : 'Message Mirror…'}
            placeholderTextColor={Colors.placeholder}
            multiline
            maxLength={4000}
            editable={!isMicBusy && !isLoading}
            returnKeyType="default"
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading || isMicBusy) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading || isMicBusy}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistory(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Conversations</Text>
            <TouchableOpacity
              onPress={() => setShowHistory(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>

          {loadingHistory ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No past conversations yet.</Text>
              <Text style={styles.modalEmptySubtext}>
                Your chats are saved automatically after each exchange.
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyList}
              renderItem={({ item }) => {
                const preview = item.messages_json[0]?.content?.slice(0, 60) || 'Empty conversation';
                return (
                  <TouchableOpacity
                    style={styles.historyItem}
                    onPress={() => loadConversation(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.historyItemInner}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {item.title || preview}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {formatConvDate(item.session_date)}
                      </Text>
                    </View>
                    <Text style={styles.historyItemPreview} numberOfLines={2}>
                      {preview}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptySymbol: {
    fontSize: 48,
    color: Colors.accent,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  typingAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typingAvatarText: {
    fontSize: 14,
    color: Colors.accent,
  },
  typingBubble: {
    backgroundColor: Colors.mirrorBubble,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.muted,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 8,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  micButtonRecording: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: Colors.error,
  },
  micButtonTranscribing: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderColor: Colors.accent,
  },
  micIcon: {
    fontSize: 20,
  },
  micIconRecording: {
    color: Colors.error,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    color: Colors.text,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  // History modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalEmptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  historyItem: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  historyItemInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  historyItemDate: {
    fontSize: 12,
    color: Colors.muted,
    flexShrink: 0,
  },
  historyItemPreview: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
  },
});
