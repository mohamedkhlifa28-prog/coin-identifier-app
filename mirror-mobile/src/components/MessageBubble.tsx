import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { Colors } from '../lib/constants';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type MessageBubbleProps = {
  message: ChatMessage;
  isSpeaking?: boolean;
  onSpeakToggle?: (id: string, content: string) => void;
};

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const minute = m.toString().padStart(2, '0');
  return `${hour}:${minute} ${ampm}`;
}

export default function MessageBubble({
  message,
  isSpeaking = false,
  onSpeakToggle,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowMirror]}>
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>◈</Text>
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperMirror]}>
        <Text style={[styles.roleLabel, isUser ? styles.roleLabelUser : styles.roleLabelMirror]}>
          {isUser ? 'You' : 'Mirror'}
        </Text>

        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleMirror,
          ]}
        >
          <Text style={[styles.content, isUser ? styles.contentUser : styles.contentMirror]}>
            {message.content}
          </Text>
        </View>

        <View style={[styles.footer, isUser ? styles.footerUser : styles.footerMirror]}>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>

          {!isUser && onSpeakToggle && (
            <TouchableOpacity
              style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
              onPress={() => onSpeakToggle(message.id, message.content)}
              activeOpacity={0.7}
            >
              <Text style={[styles.speakIcon, isSpeaking && styles.speakIconActive]}>
                {isSpeaking ? '⏹' : '▶'}
              </Text>
              <Text style={[styles.speakLabel, isSpeaking && styles.speakLabelActive]}>
                {isSpeaking ? 'Stop' : 'Speak'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowMirror: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 18,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    color: Colors.accent,
  },
  bubbleWrapper: {
    maxWidth: '78%',
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubbleWrapperMirror: {
    alignItems: 'flex-start',
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  roleLabelUser: {
    color: Colors.muted,
    textAlign: 'right',
  },
  roleLabelMirror: {
    color: Colors.accent,
    textAlign: 'left',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.userBubble,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleMirror: {
    backgroundColor: Colors.mirrorBubble,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
  },
  contentUser: {
    color: Colors.text,
  },
  contentMirror: {
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  footerUser: {
    justifyContent: 'flex-end',
  },
  footerMirror: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
    color: Colors.placeholder,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  speakButtonActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  speakIcon: {
    fontSize: 10,
    color: Colors.muted,
  },
  speakIconActive: {
    color: Colors.accent,
  },
  speakLabel: {
    fontSize: 11,
    color: Colors.muted,
  },
  speakLabelActive: {
    color: Colors.accent,
  },
});
