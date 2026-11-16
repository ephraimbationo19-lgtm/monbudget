import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMoney } from '@/lib/format';
import { colors, radius } from '@/theme';

export function Screen({
  children,
  overlay,
  bottomInset = 96,
}: {
  children: ReactNode;
  overlay?: ReactNode;
  bottomInset?: number;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {overlay}
    </SafeAreaView>
  );
}

export function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Money({
  amount,
  currency = 'XOF',
  style,
  signed = false,
}: {
  amount: number;
  currency?: string;
  style?: object;
  signed?: boolean;
}) {
  const prefix = signed && amount > 0 ? '+' : '';
  return <Text style={style}>{`${prefix}${formatMoney(amount, currency)}`}</Text>;
}

export function Pill({
  label,
  color = colors.primary,
  background = colors.primarySoft,
}: {
  label: string;
  color?: string;
  background?: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({
  ratio,
  color = colors.primary,
  height = 8,
}: {
  ratio: number;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color, height }]} />
    </View>
  );
}

export function EmptyState({
  icon = 'chart-line',
  title,
  description,
  action,
}: {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {action}
    </View>
  );
}

export function Fab({
  onPress,
  icon = 'plus',
  label = 'Ajouter',
}: {
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
      <MaterialCommunityIcons name={icon} size={26} color="#FFFFFF" />
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  size = 20,
  color = colors.textSecondary,
  style,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  size?: number;
  color?: string;
  style?: object;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={style} accessibilityRole="button">
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function CategoryIcon({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <View style={[styles.categoryIcon, { width: size, height: size, backgroundColor: `${color}1A` }]}>
      <MaterialCommunityIcons
        name={name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={size * 0.5}
        color={color}
      />
    </View>
  );
}

interface ModalScrollValue {
  containerRef: React.RefObject<ScrollViewInstance | null>;
  scrollToInput: (y: number) => void;
}

const ModalScrollContext = createContext<ModalScrollValue | null>(null);

export function ModalShell({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const lastFocusedY = useRef<number | null>(null);

  const scrollToInput = useCallback((y: number) => {
    lastFocusedY.current = y;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  }, []);

  useEffect(() => {
    if (keyboardHeight === 0 || lastFocusedY.current === null) return;
    const timer = setTimeout(() => {
      const y = lastFocusedY.current;
      if (y !== null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [keyboardHeight]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <ModalScrollContext.Provider value={{ containerRef: scrollRef, scrollToInput }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}>
            <View style={styles.modalHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <IconButton name="close" onPress={onClose} />
            </View>
            <ScrollView
              ref={scrollRef}
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.sheetContent, { paddingBottom: keyboardHeight + 32 }]}>
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </ModalScrollContext.Provider>
      </SafeAreaView>
    </Modal>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const modalScroll = useContext(ModalScrollContext);

  function handleFocus() {
    const container = modalScroll?.containerRef.current;
    if (!container || !inputRef.current) return;
    inputRef.current.measureLayout(
      container,
      (_x: number, y: number) => modalScroll?.scrollToInput(y),
      () => {},
    );
  }

  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      onFocus={handleFocus}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && styles.inputMultiline]}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        danger ? styles.buttonDanger : styles.buttonPrimary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.segment, value === option.value && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 27, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: colors.muted, marginTop: 3 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700' },
  track: { backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  fill: { borderRadius: 999 },
  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyDescription: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 19,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  categoryIcon: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalSafe: { flex: 1, backgroundColor: colors.card },
  keyboardAvoid: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalScroll: { flex: 1 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  sheetContent: { paddingHorizontal: 20, paddingTop: 18 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  button: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.text },
});
