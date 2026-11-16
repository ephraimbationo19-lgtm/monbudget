import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAppData } from '@/context/AppDataContext';
import * as repo from '@/db/repository';
import { isValidISODate, todayISO } from '@/lib/date';
import { parseFloatInput } from '@/lib/format';
import { categoryPalette, colors, radius } from '@/theme';
import type {
  Budget,
  Category,
  Debt,
  Goal,
  Transaction,
  TransactionType,
} from '@/types';

import { Field, Input, ModalShell, PrimaryButton, SegmentedControl } from './ui';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Revenu' },
];

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  if (categories.length === 0) {
    return <Text style={styles.hint}>Aucune catégorie disponible.</Text>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
      {categories.map((category) => {
        const active = value === category.id;
        return (
          <Pressable
            key={category.id}
            onPress={() => onChange(category.id)}
            style={[
              styles.chip,
              { borderColor: active ? category.color : colors.border },
              active && { backgroundColor: `${category.color}1F` },
            ]}>
            <MaterialCommunityIcons name={category.icon as IconName} size={16} color={category.color} />
            <Text style={[styles.chipText, active && { color: category.color }]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const invalid = value.length > 0 && !isValidISODate(value);
  return (
    <Field label="Date (AAAA-MM-JJ)">
      <Input value={value} onChangeText={onChange} placeholder={todayISO()} />
      {invalid ? <Text style={styles.error}>Format invalide. Exemple : 2026-11-16</Text> : null}
      <Pressable onPress={() => onChange(todayISO())} style={styles.todayLink}>
        <Text style={styles.todayText}>Aujourd&apos;hui</Text>
      </Pressable>
    </Field>
  );
}

function DeleteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.deleteButton}>
      <Text style={styles.deleteText}>Supprimer</Text>
    </Pressable>
  );
}

export function TransactionForm({
  visible,
  onClose,
  initial = null,
  defaultType = 'expense',
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Transaction | null;
  defaultType?: TransactionType;
}) {
  const db = useSQLiteContext();
  const { categories, refresh } = useAppData();
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [saving, setSaving] = useState(false);

  const available = categories.filter((c) => c.type === type);
  const effectiveCategory = categoryId ?? available[0]?.id ?? null;

  async function submit() {
    const parsed = parseFloatInput(amount);
    if (parsed === null || parsed <= 0) {
      return Alert.alert('Montant invalide', 'Saisissez un montant supérieur à zéro.');
    }
    if (effectiveCategory === null) {
      return Alert.alert('Catégorie requise', 'Choisissez une catégorie.');
    }
    if (!isValidISODate(date)) {
      return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      const input = { type, amount: parsed, categoryId: effectiveCategory, note, date };
      if (initial) await repo.updateTransaction(db, initial.id, input);
      else await repo.addTransaction(db, input);
      await refresh();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible d'enregistrer la transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    await repo.deleteTransaction(db, initial.id);
    await refresh();
    onClose();
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title={initial ? 'Modifier la transaction' : 'Nouvelle transaction'}>
      <Field label="Type">
        <SegmentedControl value={type} options={TYPE_OPTIONS} onChange={setType} />
      </Field>
      <Field label="Montant">
        <Input value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
      </Field>
      <Field label="Catégorie">
        <CategoryPicker categories={available} value={effectiveCategory} onChange={setCategoryId} />
      </Field>
      <Field label="Note (facultatif)">
        <Input value={note} onChangeText={setNote} placeholder="Ex. Courses du samedi" />
      </Field>
      <DateField value={date} onChange={setDate} />
      <PrimaryButton label={initial ? 'Enregistrer' : 'Ajouter la transaction'} onPress={submit} loading={saving} />
      {initial ? <DeleteButton onPress={remove} /> : null}
    </ModalShell>
  );
}

export function BudgetForm({
  visible,
  onClose,
  initial = null,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Budget | null;
}) {
  const db = useSQLiteContext();
  const { categories, budgets, refresh } = useAppData();
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const budgetedIds = new Set(budgets.map((b) => b.category_id));
  const fallback = expenseCategories.find((c) => !budgetedIds.has(c.id))?.id ?? expenseCategories[0]?.id ?? null;
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? fallback);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = parseFloatInput(amount);
    if (categoryId === null) {
      return Alert.alert('Catégorie requise', 'Choisissez une catégorie.');
    }
    if (parsed === null || parsed <= 0) {
      return Alert.alert('Montant invalide', 'Saisissez un plafond supérieur à zéro.');
    }
    setSaving(true);
    try {
      await repo.saveBudget(db, categoryId, parsed);
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title={initial ? 'Modifier le budget' : 'Nouveau budget'}>
      <Text style={styles.hint}>Le plafond s&apos;applique chaque mois à la catégorie choisie.</Text>
      <Field label="Catégorie">
        <CategoryPicker
          categories={expenseCategories.filter(
            (c) => !budgetedIds.has(c.id) || c.id === initial?.category_id,
          )}
          value={categoryId}
          onChange={setCategoryId}
        />
      </Field>
      <Field label="Plafond mensuel">
        <Input value={amount} onChangeText={setAmount} placeholder="200,00" keyboardType="decimal-pad" />
      </Field>
      <PrimaryButton label="Enregistrer le budget" onPress={submit} loading={saving} />
      {initial ? (
        <DeleteButton
          onPress={async () => {
            await repo.deleteBudget(db, initial.category_id);
            await refresh();
            onClose();
          }}
        />
      ) : null}
    </ModalShell>
  );
}

export function GoalForm({
  visible,
  onClose,
  initial = null,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Goal | null;
}) {
  const db = useSQLiteContext();
  const { refresh } = useAppData();
  const [name, setName] = useState(initial?.name ?? '');
  const [target, setTarget] = useState(initial ? String(initial.target) : '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [color, setColor] = useState(initial?.color ?? categoryPalette[0]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = parseFloatInput(target);
    if (!name.trim()) return Alert.alert('Nom requis', 'Donnez un nom à votre objectif.');
    if (parsed === null || parsed <= 0) {
      return Alert.alert('Montant invalide', 'Saisissez un objectif supérieur à zéro.');
    }
    if (deadline && !isValidISODate(deadline)) {
      return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      const input = { name, target: parsed, deadline: deadline || null, color };
      if (initial) await repo.updateGoal(db, initial.id, input);
      else await repo.addGoal(db, input);
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title={initial ? 'Modifier l’objectif' : 'Nouvel objectif'}>
      <Field label="Nom de l'objectif">
        <Input value={name} onChangeText={setName} placeholder="Ex. Voyage au Japon" />
      </Field>
      <Field label="Montant à atteindre">
        <Input value={target} onChangeText={setTarget} placeholder="2 500,00" keyboardType="decimal-pad" />
      </Field>
      <Field label="Date cible (facultatif)">
        <Input value={deadline} onChangeText={setDeadline} placeholder="AAAA-MM-JJ" />
      </Field>
      <Field label="Couleur">
        <View style={styles.colorRow}>
          {categoryPalette.slice(0, 8).map((item) => (
            <Pressable
              key={item}
              onPress={() => setColor(item)}
              style={[styles.colorDot, { backgroundColor: item }, color === item && styles.colorDotActive]}>
              {color === item ? <MaterialCommunityIcons name="check" size={16} color="#FFF" /> : null}
            </Pressable>
          ))}
        </View>
      </Field>
      <PrimaryButton label={initial ? 'Enregistrer' : 'Créer l’objectif'} onPress={submit} loading={saving} />
      {initial ? (
        <DeleteButton
          onPress={async () => {
            await repo.deleteGoal(db, initial.id);
            await refresh();
            onClose();
          }}
        />
      ) : null}
    </ModalShell>
  );
}

export function ContributionForm({
  visible,
  onClose,
  goal,
}: {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
}) {
  const db = useSQLiteContext();
  const { refresh } = useAppData();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = parseFloatInput(amount);
    if (!goal || parsed === null || parsed === 0) {
      return Alert.alert('Montant invalide', 'Saisissez un montant (négatif pour retirer).');
    }
    if (!isValidISODate(date)) {
      return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      await repo.addContribution(db, goal.id, parsed, date);
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title={`Épargner pour « ${goal?.name ?? ''} »`}>
      <Text style={styles.hint}>Un montant négatif retire de l&apos;argent de l&apos;objectif.</Text>
      <Field label="Montant">
        <Input value={amount} onChangeText={setAmount} placeholder="100,00" keyboardType="decimal-pad" />
      </Field>
      <DateField value={date} onChange={setDate} />
      <PrimaryButton label="Ajouter" onPress={submit} loading={saving} />
    </ModalShell>
  );
}

export function DebtForm({
  visible,
  onClose,
  initial = null,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Debt | null;
}) {
  const db = useSQLiteContext();
  const { refresh } = useAppData();
  const [name, setName] = useState(initial?.name ?? '');
  const [person, setPerson] = useState(initial?.person ?? '');
  const [direction, setDirection] = useState<'owing' | 'owed'>(initial?.direction ?? 'owing');
  const [total, setTotal] = useState(initial ? String(initial.total) : '');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = parseFloatInput(total);
    if (!name.trim()) return Alert.alert('Nom requis', 'Donnez un nom à cette dette.');
    if (parsed === null || parsed <= 0) {
      return Alert.alert('Montant invalide', 'Saisissez un montant supérieur à zéro.');
    }
    if (dueDate && !isValidISODate(dueDate)) {
      return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      await repo.addDebt(db, {
        name,
        person,
        direction,
        total: parsed,
        dueDate: dueDate || null,
        note,
      });
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Nouvelle dette">
      <Field label="Type">
        <SegmentedControl
          value={direction}
          options={[
            { value: 'owing', label: 'Je dois' },
            { value: 'owed', label: 'On me doit' },
          ]}
          onChange={setDirection}
        />
      </Field>
      <Field label="Nom">
        <Input value={name} onChangeText={setName} placeholder="Ex. Prêt étudiant" />
      </Field>
      <Field label="Personne / organisme">
        <Input value={person} onChangeText={setPerson} placeholder="Ex. Banque, Paul..." />
      </Field>
      <Field label="Montant total">
        <Input value={total} onChangeText={setTotal} placeholder="1 000,00" keyboardType="decimal-pad" />
      </Field>
      <Field label="Échéance (facultatif)">
        <Input value={dueDate} onChangeText={setDueDate} placeholder="AAAA-MM-JJ" />
      </Field>
      <Field label="Note (facultatif)">
        <Input value={note} onChangeText={setNote} />
      </Field>
      <PrimaryButton label="Ajouter la dette" onPress={submit} loading={saving} />
      {initial ? (
        <DeleteButton
          onPress={async () => {
            await repo.deleteDebt(db, initial.id);
            await refresh();
            onClose();
          }}
        />
      ) : null}
    </ModalShell>
  );
}

export function PaymentForm({
  visible,
  onClose,
  debt,
}: {
  visible: boolean;
  onClose: () => void;
  debt: Debt | null;
}) {
  const db = useSQLiteContext();
  const { refresh } = useAppData();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = parseFloatInput(amount);
    if (!debt || parsed === null || parsed <= 0) {
      return Alert.alert('Montant invalide', 'Saisissez un montant supérieur à zéro.');
    }
    if (!isValidISODate(date)) {
      return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      await repo.addDebtPayment(db, debt.id, parsed, date);
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title={`Paiement · ${debt?.name ?? ''}`}>
      <Field label="Montant payé">
        <Input value={amount} onChangeText={setAmount} placeholder="50,00" keyboardType="decimal-pad" />
      </Field>
      <DateField value={date} onChange={setDate} />
      <PrimaryButton label="Enregistrer le paiement" onPress={submit} loading={saving} />
    </ModalShell>
  );
}

export function RecurringForm({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const db = useSQLiteContext();
  const { categories, refresh } = useAppData();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [day, setDay] = useState('1');
  const [startDate, setStartDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const available = categories.filter((c) => c.type === type);
  const effectiveCategory = categoryId ?? available[0]?.id ?? null;

  async function submit() {
    const parsed = parseFloatInput(amount);
    const dayNumber = Number(day);
    if (parsed === null || parsed <= 0) {
      return Alert.alert('Montant invalide', 'Saisissez un montant supérieur à zéro.');
    }
    if (effectiveCategory === null) {
      return Alert.alert('Catégorie requise', 'Choisissez une catégorie.');
    }
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) {
      return Alert.alert('Jour invalide', 'Choisissez un jour entre 1 et 31.');
    }
    if (!isValidISODate(startDate)) {
      return Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
    }
    setSaving(true);
    try {
      await repo.addRecurring(db, {
        type,
        amount: parsed,
        categoryId: effectiveCategory,
        note,
        dayOfMonth: dayNumber,
        startDate,
      });
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Nouveau récurrent">
      <Text style={styles.hint}>Une transaction sera créée automatiquement chaque mois.</Text>
      <Field label="Type">
        <SegmentedControl value={type} options={TYPE_OPTIONS} onChange={setType} />
      </Field>
      <Field label="Montant">
        <Input value={amount} onChangeText={setAmount} placeholder="620,00" keyboardType="decimal-pad" />
      </Field>
      <Field label="Catégorie">
        <CategoryPicker categories={available} value={effectiveCategory} onChange={setCategoryId} />
      </Field>
      <Field label="Jour du mois (1 à 31)">
        <Input value={day} onChangeText={setDay} keyboardType="numeric" />
      </Field>
      <Field label="Première date">
        <Input value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-JJ" />
      </Field>
      <Field label="Note (facultatif)">
        <Input value={note} onChangeText={setNote} placeholder="Ex. Loyer" />
      </Field>
      <PrimaryButton label="Ajouter le récurrent" onPress={submit} loading={saving} />
    </ModalShell>
  );
}

export function SettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const db = useSQLiteContext();
  const { currency, smsAutoImport, refresh } = useAppData();
  const currencies = [
    { code: 'XOF', label: 'XOF (FCFA)' },
    { code: 'EUR', label: 'EUR (€)' },
    { code: 'USD', label: 'USD ($)' },
    { code: 'GBP', label: 'GBP (£)' },
    { code: 'CAD', label: 'CAD ($)' },
  ];

  function confirmClear() {
    Alert.alert('Tout effacer', 'Cette action supprime toutes tes transactions, dettes et objectifs. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          await repo.clearAllData(db);
          await refresh();
          onClose();
        },
      },
    ]);
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Réglages">
      <Field label="Devise">
        <View style={styles.currencyRow}>
          {currencies.map((item) => (
            <Pressable
              key={item.code}
              onPress={async () => {
                await repo.setCurrency(db, item.code);
                await refresh();
              }}
              style={[styles.currencyChip, currency === item.code && styles.currencyChipActive]}>
              <Text style={[styles.currencyText, currency === item.code && styles.currencyTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>
      <Field label="SMS Mobile Money">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Importer automatiquement les SMS</Text>
          <Switch
            value={smsAutoImport}
            onValueChange={async (value) => {
              await repo.setSetting(db, 'sms_auto_import', value ? '1' : '0');
              await refresh();
            }}
          />
        </View>
        <Text style={styles.hint}>
          Android uniquement · nécessite l’application installée (pas Expo Go).
        </Text>
      </Field>
      <Field label="Données">
        <PrimaryButton
          label="Charger des données d'exemple"
          onPress={async () => {
            await repo.loadDemoData(db);
            await refresh();
            onClose();
          }}
        />
        <PrimaryButton label="Tout effacer" onPress={confirmClear} danger />
      </Field>
      <Text style={styles.version}>MonBudget v1.0 · Données stockées sur ton appareil</Text>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14 },
  error: { color: colors.danger, fontSize: 12, marginTop: 5 },
  chips: { marginHorizontal: -20, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  todayLink: { alignSelf: 'flex-start', marginTop: 7 },
  todayText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  deleteButton: { alignItems: 'center', paddingVertical: 16 },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, elevation: 2 },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  currencyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  currencyText: { fontWeight: '700', color: colors.textSecondary },
  currencyTextActive: { color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 18 },
});
