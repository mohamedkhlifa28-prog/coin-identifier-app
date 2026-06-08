import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { apiFetch } from '../src/lib/api';
import { Colors } from '../src/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUESTIONS = [
  {
    type: 'personality',
    prompt: 'How do you typically respond when something goes wrong in your life?',
  },
  {
    type: 'personality',
    prompt: 'What does a perfect day look like for you?',
  },
  {
    type: 'personality',
    prompt: 'How do you make important decisions — gut feeling, logic, or consulting others?',
  },
  {
    type: 'personality',
    prompt: 'What are you most afraid of, and why?',
  },
  {
    type: 'personality',
    prompt: 'How do you typically handle conflict in relationships?',
  },
  {
    type: 'personality',
    prompt: 'What motivates you to get out of bed in the morning?',
  },
  {
    type: 'personality',
    prompt: 'How do you feel about change and uncertainty?',
  },
  {
    type: 'personality',
    prompt: 'Describe your relationship with solitude — do you seek it or avoid it?',
  },
  {
    type: 'personality',
    prompt: 'What does success mean to you personally?',
  },
  {
    type: 'personality',
    prompt: 'How do you process emotions — do you express them outwardly or internalize them?',
  },
  {
    type: 'personality',
    prompt: 'What is a recurring thought or worry you have?',
  },
  {
    type: 'personality',
    prompt: 'How do you feel about asking for help from others?',
  },
  {
    type: 'personality',
    prompt: 'What is something most people misunderstand about you?',
  },
  {
    type: 'personality',
    prompt: 'How do you feel about your past — do you reflect on it often?',
  },
  {
    type: 'personality',
    prompt: 'What kind of relationships are most important to you and why?',
  },
  {
    type: 'personality',
    prompt: 'How do you handle praise and criticism?',
  },
  {
    type: 'personality',
    prompt: 'What do you value most: freedom, security, connection, or achievement?',
  },
  {
    type: 'personality',
    prompt: 'How has your upbringing shaped who you are today?',
  },
  {
    type: 'personality',
    prompt: 'What is something you have been avoiding but know you need to face?',
  },
  {
    type: 'personality',
    prompt: 'If you could change one thing about yourself, what would it be and why?',
  },
  {
    type: 'writing',
    prompt:
      'Write a few sentences about a moment that changed you — the more specific, the better.',
  },
  {
    type: 'writing',
    prompt:
      'Describe something you deeply care about, as if explaining it to someone who has never heard of it.',
  },
  {
    type: 'writing',
    prompt:
      'Write about a relationship (with anyone) that has had a significant impact on who you are.',
  },
];

export default function OnboardScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''));
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = QUESTIONS.length;
  const progress = (currentIndex + 1) / totalSteps;
  const currentQuestion = QUESTIONS[currentIndex];
  const isLastStep = currentIndex === totalSteps - 1;

  function animateTransition(direction: 'forward' | 'back', callback: () => void) {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH * 0.1 : SCREEN_WIDTH * 0.1;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      translateAnim.setValue(direction === 'forward' ? SCREEN_WIDTH * 0.1 : -SCREEN_WIDTH * 0.1);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function handleNext() {
    if (!currentAnswer.trim()) {
      setError('Please write something before continuing.');
      return;
    }
    setError(null);

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = currentAnswer.trim();

    if (isLastStep) {
      animateTransition('forward', () => {
        setAnswers(updatedAnswers);
        setCurrentAnswer('');
      });
      handleSubmit(updatedAnswers);
    } else {
      animateTransition('forward', () => {
        setAnswers(updatedAnswers);
        setCurrentIndex(currentIndex + 1);
        setCurrentAnswer(updatedAnswers[currentIndex + 1] || '');
      });
    }
  }

  function handleBack() {
    if (currentIndex === 0) return;
    setError(null);
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = currentAnswer.trim();
    animateTransition('back', () => {
      setAnswers(updatedAnswers);
      setCurrentIndex(currentIndex - 1);
      setCurrentAnswer(updatedAnswers[currentIndex - 1] || '');
    });
  }

  async function handleSubmit(finalAnswers: string[]) {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/(auth)/login');
        return;
      }

      const payload = {
        personalityAnswers: finalAnswers.slice(0, 20).map((answer, i) => ({
          question: QUESTIONS[i].prompt,
          answer,
        })),
        writingSamples: finalAnswers.slice(20).map((answer, i) => ({
          prompt: QUESTIONS[20 + i].prompt,
          response: answer,
        })),
      };

      const response = await apiFetch('/api/onboard/generate-profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to generate profile: ${response.status} — ${text}`);
      }

      router.replace('/(app)/chat');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingTitle}>Building your Mirror</Text>
        <Text style={styles.loadingSubtitle}>
          Analyzing your answers and creating a personalized profile…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mirror</Text>
        <Text style={styles.headerSubtitle}>
          {currentQuestion.type === 'writing' ? 'Writing Sample' : 'About You'}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {totalSteps}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.questionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: translateAnim }],
            },
          ]}
        >
          {currentQuestion.type === 'writing' && (
            <View style={styles.writingBadge}>
              <Text style={styles.writingBadgeText}>Writing Sample</Text>
            </View>
          )}

          <Text style={styles.questionText}>{currentQuestion.prompt}</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.answerInput}
            value={currentAnswer}
            onChangeText={(text) => {
              setCurrentAnswer(text);
              if (error) setError(null);
            }}
            placeholder="Type your answer here…"
            placeholderTextColor={Colors.placeholder}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          <Text style={styles.minLengthHint}>
            The more you share, the better Mirror understands you.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navContainer}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonBack, currentIndex === 0 && styles.navButtonHidden]}
          onPress={handleBack}
          disabled={currentIndex === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonBackText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButtonNext}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.navButtonNextText}>
            {isLastStep ? 'Build My Mirror' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.muted,
    minWidth: 40,
    textAlign: 'right',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  questionContainer: {
    flex: 1,
  },
  writingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  writingBadgeText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  answerInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 160,
    lineHeight: 24,
  },
  minLengthHint: {
    fontSize: 12,
    color: Colors.placeholder,
    marginTop: 8,
    textAlign: 'right',
  },
  navContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  navButton: {
    flex: 0,
  },
  navButtonBack: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  navButtonHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  navButtonBackText: {
    color: Colors.muted,
    fontSize: 16,
  },
  navButtonNext: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  navButtonNextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
