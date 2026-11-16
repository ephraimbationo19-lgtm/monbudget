import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TransactionForm } from '@/components/forms';
import { SmsImportModal } from '@/components/SmsImportModal';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, EmptyState, Fab, Header, IconButton, Input, Screen, SegmentedControl } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { formatDate, monthKey } from '@/lib/date';
import { formatMoney } from '@/lib/format';
import { colors } from '@/theme';
import type { Transaction, TransactionType } from '@/types';

type Filter = 'all' | TransactionType;

export default function TransactionsScreen() {
  const { categories, transactions, currency, refresh } = useAppData();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>('expense');
  const [smsVisible, setSmsVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (!needle) return true;
      const category = categories.find((c) => c.id === t.category_id);
      return (
        t.note.toLowerCase().includes(needle) ||
        (category?.name.toLowerCase().includes(needle) ?? false) ||
        t.date.includes(needle)
      );
    });
  }, [transactions, categories, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = monthKey(t.date) === monthKey() ? 'Ce mois-ci' : formatDate(t.date, true);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const monthTotal = transactions
    .filter((t) => monthKey(t.date) === monthKey())
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  function openNew() {
    setEditing(null);
    setDefaultType('expense');
    setFormVisible(true);
  }

  return (
    <Screen overlay={<Fab onPress={openNew} />}>
      <Header
        title="Transactions"
        subtitle={`${transactions.length} opération${transactions.length > 1 ? 's' : ''} enregistrée${transactions.length > 1 ? 's' : ''}`}
        action={<IconButton name="message-text-outline" onPress={() => setSmsVisible(true)} size={22} />}
      />

      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>Solde de ce mois</Text>
        <Text style={[styles.summaryValue, { color: monthTotal >= 0 ? colors.primary : colors.danger }]}>
          {formatMoney(monthTotal, currency)}
        </Text>
      </Card>

      <Input value={query} onChangeText={setQuery} placeholder="Rechercher une transaction..." />
      <View style={styles.filter}>
        <SegmentedControl<Filter>
          value={filter}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'expense', label: 'Dépenses' },
            { value: 'income', label: 'Revenus' },
          ]}
          onChange={setFilter}
        />
      </View>

      {groups.length > 0 ? (
        groups.map(([label, items]) => (
          <View key={label}>
            <Text style={styles.groupTitle}>{label}</Text>
            <Card style={styles.listCard}>
              {items.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={categories.find((c) => c.id === transaction.category_id)}
                  currency={currency}
                  onPress={() => {
                    setEditing(transaction);
                    setDefaultType(transaction.type);
                    setFormVisible(true);
                  }}
                />
              ))}
            </Card>
          </View>
        ))
      ) : (
        <Card>
          <EmptyState
            icon="receipt"
            title={query || filter !== 'all' ? 'Aucun résultat' : 'Aucune transaction'}
            description={query || filter !== 'all' ? 'Essayez un autre filtre ou une autre recherche.' : 'Ajoutez votre première dépense ou votre premier revenu.'}
          />
        </Card>
      )}

      {formVisible ? (
        <TransactionForm
          visible
          onClose={() => setFormVisible(false)}
          initial={editing}
          defaultType={defaultType}
        />
      ) : null}
      {smsVisible ? <SmsImportModal visible onClose={() => setSmsVisible(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', paddingVertical: 18 },
  summaryLabel: { fontSize: 12, color: colors.muted },
  summaryValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  filter: { marginVertical: 14 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  listCard: { paddingVertical: 4 },
});
