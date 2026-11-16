import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryPicker } from '@/components/forms';
import { Field, Input, ModalShell, PrimaryButton, SegmentedControl } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import * as repo from '@/db/repository';
import { isValidISODate, todayISO } from '@/lib/date';
import { parseFloatInput } from '@/lib/format';
import { parseMoneySms, type ParsedSms } from '@/lib/sms';
import { readMoneySms, type PhoneSms } from '@/lib/smsReader';
import { colors, radius } from '@/theme';
import type { TransactionType } from '@/types';

export function SmsImportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const db = useSQLiteContext();
  const { categories, refresh } = useAppData();
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ParsedSms | null>(null);
  const [amountText, setAmountText] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [messages, setMessages] = useState<PhoneSms[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = categories.filter((c) => c.type === type);
  const effectiveCategory = categoryId ?? available[0]?.id ?? null;

  async function readSms() {
    setReading(true);
    try {
      const found = await readMoneySms();
      setMessages(found);
      if (found.length === 0) {
        Alert.alert('Aucun SMS trouvé', 'Aucun message de paiement mobile n’a été détecté dans ta boîte de réception.');
      }
    } catch (error) {
      Alert.alert('Lecture des SMS', error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setReading(false);
    }
  }

  function analyse(text = raw) {
    const result = parseMoneySms(text);
    if (!result) {
      return Alert.alert(
        'Message non reconnu',
        'Je n’ai pas trouvé de montant en FCFA. Vérifie que le message contient bien un montant (ex. 5 000 FCFA).',
      );
    }
    setParsed(result);
    setAmountText(String(result.amount));
    setType(result.type);
    setCategoryId(null);
    setNote(result.note);
    setDate(result.date);
    if (!result.detected) {
      Alert.alert('Sens à vérifier', 'Je n’ai pas pu déterminer s’il s’agit d’une entrée ou d’une sortie. Vérifie le type ci-dessous.');
    }
  }

  async function save() {
    const amount = parseFloatInput(amountText);
    if (amount === null || amount <= 0) {
      return Alert.alert('Montant invalide', 'Vérifie le montant détecté.');
    }
    if (effectiveCategory === null) {
      return Alert.alert('Catégorie requise', 'Choisis une catégorie.');
    }
    if (!isValidISODate(date)) {
      return Alert.alert('Date invalide', 'Utilise le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      await repo.addTransaction(db, {
        type,
        amount,
        categoryId: effectiveCategory,
        note,
        date,
      });
      await refresh();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d’enregistrer cette transaction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Importer un SMS Mobile Money">
      <Pressable onPress={readSms} disabled={reading} style={styles.readButton}>
        <Text style={styles.readButtonText}>
          {reading ? 'Lecture en cours…' : '📱 Lire mes SMS (Android)'}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        Tu peux aussi copier le SMS reçu (Orange Money, Wave, Moov…) et le coller ci-dessous.
      </Text>

      {messages.length > 0 ? (
        <View style={styles.messageList}>
          <Text style={styles.listTitle}>Messages détectés ({messages.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {messages.map((message) => (
              <Pressable
                key={message.id}
                onPress={() => {
                  setRaw(message.body);
                  analyse(message.body);
                }}
                style={styles.messageChip}>
                <Text style={styles.messageAddress} numberOfLines={1}>
                  {message.address || 'SMS'}
                </Text>
                <Text style={styles.messageBody} numberOfLines={2}>
                  {message.body}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Field label="Message reçu">
        <Input
          value={raw}
          onChangeText={setRaw}
          placeholder="Ex. Orange Money: Vous avez reçu 5 000 FCFA de Amina..."
          multiline
        />
      </Field>
      <PrimaryButton label="Analyser le message" onPress={() => analyse()} />

      {parsed ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Transaction détectée</Text>
          <Field label="Sens">
            <SegmentedControl<TransactionType>
              value={type}
              options={[
                { value: 'expense', label: 'Sortie d’argent' },
                { value: 'income', label: 'Entrée d’argent' },
              ]}
              onChange={setType}
            />
          </Field>
          <Field label="Montant (FCFA)">
            <Input value={amountText} onChangeText={setAmountText} keyboardType="numeric" />
          </Field>
          <Field label="Date (AAAA-MM-JJ)">
            <Input value={date} onChangeText={setDate} />
          </Field>
          <Field label="Catégorie">
            <CategoryPicker categories={available} value={effectiveCategory} onChange={setCategoryId} />
          </Field>
          <Field label="Libellé">
            <Input value={note} onChangeText={setNote} />
          </Field>
          <PrimaryButton label="Ajouter la transaction" onPress={save} loading={saving} />
        </View>
      ) : null}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  readButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  readButtonText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 14 },
  messageList: { marginBottom: 14 },
  listTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  messageChip: {
    width: 210,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 8,
  },
  messageAddress: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  messageBody: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
  result: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 14 },
});
