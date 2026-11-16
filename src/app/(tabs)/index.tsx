import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChartLegend, DonutChart, MonthlyBars } from '@/components/charts';
import { SettingsModal, TransactionForm } from '@/components/forms';
import { SmsImportModal } from '@/components/SmsImportModal';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, EmptyState, Fab, Header, IconButton, Money, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import * as repo from '@/db/repository';
import { addMonths, formatMonth, monthKey, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/format';
import { budgetStatuses, lastMonths, spendingByCategory, totalsForMonth } from '@/lib/stats';
import { colors } from '@/theme';
import type { Transaction, TransactionType } from '@/types';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const {
    categories,
    transactions,
    budgets,
    currency,
    loading,
    refresh,
  } = useAppData();

  const [month, setMonth] = useState(() => monthKey(todayISO()));
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [defaultType, setDefaultType] = useState<TransactionType>('expense');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [smsVisible, setSmsVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const totals = totalsForMonth(transactions, month);
  const slices = spendingByCategory(transactions, categories, month).map((item) => ({
    label: item.name,
    value: item.total,
    color: item.color,
  }));
  const months = lastMonths(transactions, 6, month);
  const statusList = budgetStatuses(budgets, categories, transactions, month).slice(0, 3);
  const recent = transactions.filter((t) => monthKey(t.date) === month).slice(0, 5);

  function openNew(type: TransactionType) {
    setEditing(null);
    setDefaultType(type);
    setFormVisible(true);
  }

  return (
    <Screen overlay={<Fab onPress={() => openNew('expense')} />}>
      <Header
        title="MonBudget"
        subtitle={loading ? 'Chargement...' : formatMonth(month)}
        action={<IconButton name="cog-outline" onPress={() => setSettingsVisible(true)} />}
      />

      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} style={styles.monthButton}>
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setMonth(monthKey(todayISO()))} style={styles.monthLabel}>
          <Text style={styles.monthLabelText}>{formatMonth(month)}</Text>
        </Pressable>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} style={styles.monthButton}>
          <Text style={styles.monthArrow}>›</Text>
        </Pressable>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Dépenses</Text>
            <Money amount={totals.expense} currency={currency} style={[styles.summaryValue, { color: colors.expense }]} />
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Revenus</Text>
            <Money amount={totals.income} currency={currency} style={[styles.summaryValue, { color: colors.income }]} />
          </View>
        </View>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Solde du mois</Text>
          <Money
            amount={totals.balance}
            currency={currency}
            signed
            style={[styles.balanceValue, { color: totals.balance >= 0 ? colors.primary : colors.danger }]}
          />
        </View>
        <View style={styles.quickActions}>
          <Pressable onPress={() => openNew('expense')} style={[styles.quickButton, { backgroundColor: colors.expenseSoft }]}>
            <Text style={[styles.quickText, { color: colors.expense }]}>+ Dépense</Text>
          </Pressable>
          <Pressable onPress={() => openNew('income')} style={[styles.quickButton, { backgroundColor: colors.incomeSoft }]}>
            <Text style={[styles.quickText, { color: colors.income }]}>+ Revenu</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setSmsVisible(true)} style={styles.smsLink}>
          <Text style={styles.smsLinkText}>📩 Importer un SMS Mobile Money</Text>
        </Pressable>
      </Card>

      {transactions.length === 0 && !loading ? (
        <Card>
          <EmptyState
            icon="chart-line"
            title="Commençons par tes chiffres"
            description="Ajoute ta première transaction ou charge des données d'exemple pour découvrir l'application."
            action={
              <Pressable
                onPress={async () => {
                  await repo.loadDemoData(db);
                  await refresh();
                }}
                style={styles.demoButton}>
                <Text style={styles.demoText}>Charger un exemple</Text>
              </Pressable>
            }
          />
        </Card>
      ) : null}

      <SectionTitle title="Où va ton argent ?" />
      <Card>
        {slices.length > 0 ? (
          <>
            <DonutChart slices={slices} currency={currency} />
            <ChartLegend slices={slices} currency={currency} />
          </>
        ) : (
          <EmptyState icon="chart-donut" title="Aucune dépense ce mois-ci" />
        )}
      </Card>

      <SectionTitle title="Évolution" />
      <Card>
        <MonthlyBars data={months} currency={currency} />
      </Card>

      <SectionTitle
        title="Budgets à surveiller"
        action={
          <Link href="/budgets" asChild>
            <Pressable>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </Link>
        }
      />
      <Card>
        {statusList.length > 0 ? (
          statusList.map((status) => {
            const over = status.ratio > 1;
            const color = over ? colors.danger : status.ratio > 0.8 ? colors.warning : colors.primary;
            return (
              <View key={status.budget.id} style={styles.budgetRow}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetName}>{status.category.name}</Text>
                  <Text style={[styles.budgetValue, { color }]}>
                    {formatMoney(status.spent, currency)} / {formatMoney(status.budget.amount, currency)}
                  </Text>
                </View>
                <ProgressBar ratio={status.ratio} color={color} />
              </View>
            );
          })
        ) : (
          <EmptyState icon="chart-pie" title="Aucun budget défini" description="Fixe des plafonds par catégorie pour garder le contrôle." />
        )}
      </Card>

      <SectionTitle
        title="Dernières transactions"
        action={
          <Link href="/transactions" asChild>
            <Pressable>
              <Text style={styles.seeAll}>Tout voir</Text>
            </Pressable>
          </Link>
        }
      />
      <Card>
        {recent.length > 0 ? (
          recent.map((transaction) => (
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
          ))
        ) : (
          <EmptyState icon="receipt" title="Rien à afficher pour ce mois" />
        )}
      </Card>

      {formVisible ? (
        <TransactionForm
          visible
          onClose={() => setFormVisible(false)}
          initial={editing}
          defaultType={defaultType}
        />
      ) : null}
      {settingsVisible ? (
        <SettingsModal visible onClose={() => setSettingsVisible(false)} />
      ) : null}
      {smsVisible ? <SmsImportModal visible onClose={() => setSmsVisible(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  monthButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  monthArrow: { fontSize: 24, color: colors.textSecondary, lineHeight: 26 },
  monthLabel: { paddingHorizontal: 10 },
  monthLabelText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  summaryCard: { paddingTop: 18 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1 },
  divider: { width: 1, height: 42, backgroundColor: colors.border, marginHorizontal: 12 },
  summaryLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  balanceBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  balanceLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  balanceValue: { fontSize: 22, fontWeight: '800' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickButton: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  quickText: { fontSize: 13, fontWeight: '700' },
  smsLink: { alignSelf: 'center', marginTop: 14 },
  smsLinkText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  demoButton: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary },
  demoText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  budgetRow: { marginBottom: 14 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7, gap: 8 },
  budgetName: { fontSize: 13, fontWeight: '700', color: colors.text },
  budgetValue: { fontSize: 12, fontWeight: '700' },
  seeAll: { color: colors.primary, fontSize: 12, fontWeight: '700' },
});
