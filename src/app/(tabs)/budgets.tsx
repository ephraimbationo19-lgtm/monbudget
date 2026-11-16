import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BudgetForm, RecurringForm } from '@/components/forms';
import { CategoryIcon, EmptyState, Fab, Header, IconButton, ProgressBar, Screen, SectionTitle, Card, Money } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import * as repo from '@/db/repository';
import { formatDate, monthKey, todayISO } from '@/lib/date';
import { formatMoney, formatPercent } from '@/lib/format';
import { budgetStatuses } from '@/lib/stats';
import { colors } from '@/theme';
import type { Budget, Category } from '@/types';

export default function BudgetsScreen() {
  const db = useSQLiteContext();
  const { categories, transactions, budgets, recurring, currency, refresh } = useAppData();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [recurringVisible, setRecurringVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const month = monthKey(todayISO());
  const statuses = budgetStatuses(budgets, categories, transactions, month);
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = statuses.reduce((sum, s) => sum + s.spent, 0);

  function categoryOf(id: number): Category | undefined {
    return categories.find((c) => c.id === id);
  }

  return (
    <Screen overlay={<Fab onPress={() => setRecurringVisible(true)} icon="repeat" label="Ajouter un récurrent" />}>
      <Header title="Budgets" subtitle="Tes plafonds mensiels par catégorie" />

      {budgets.length > 0 ? (
        <Card style={styles.overview}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Budgété</Text>
              <Money amount={totalBudget} currency={currency} style={styles.overviewValue} />
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Dépensé</Text>
              <Money amount={totalSpent} currency={currency} style={[styles.overviewValue, { color: colors.expense }]} />
            </View>
          </View>
          <ProgressBar ratio={totalBudget > 0 ? totalSpent / totalBudget : 0} height={10} />
          <Text style={styles.overviewHint}>
            {totalBudget - totalSpent >= 0
              ? `${formatMoney(totalBudget - totalSpent, currency)} restants ce mois-ci`
              : `${formatMoney(totalSpent - totalBudget, currency)} de dépassement`}
          </Text>
        </Card>
      ) : null}

      <SectionTitle
        title="Plafonds par catégorie"
        action={
          <Pressable
            onPress={() => {
              setEditing(null);
              setFormVisible(true);
            }}>
            <Text style={styles.addLink}>+ Nouveau</Text>
          </Pressable>
        }
      />
      {statuses.length > 0 ? (
        statuses.map((status) => {
          const over = status.ratio > 1;
          const color = over ? colors.danger : status.ratio > 0.8 ? colors.warning : colors.primary;
          return (
            <Pressable
              key={status.budget.id}
              onPress={() => {
                setEditing(status.budget);
                setFormVisible(true);
              }}
              style={({ pressed }) => [styles.budgetCard, pressed && styles.pressed]}>
              <View style={styles.budgetTop}>
                <View style={styles.budgetIdentity}>
                  <CategoryIcon name={status.category.icon} color={status.category.color} size={36} />
                  <View>
                    <Text style={styles.budgetName}>{status.category.name}</Text>
                    <Text style={styles.budgetSub}>
                      {formatMoney(status.spent, currency)} / {formatMoney(status.budget.amount, currency)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.percent, { color }]}>{formatPercent(status.ratio * 100)}</Text>
              </View>
              <ProgressBar ratio={status.ratio} color={color} height={9} />
              <Text style={[styles.remaining, { color }]}>
                {status.remaining >= 0
                  ? `${formatMoney(status.remaining, currency)} restants`
                  : `${formatMoney(-status.remaining, currency)} au-dessus du plafond`}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <Card>
          <EmptyState icon="chart-pie" title="Pas encore de budget" description="Définis un plafond mensuel pour une catégorie afin de suivre tes dépenses." />
        </Card>
      )}

      <SectionTitle title="Récurrents" />
      <Card>
        {recurring.length > 0 ? (
          recurring.map((item) => {
            const category = categoryOf(item.category_id);
            return (
              <View key={item.id} style={styles.recurringRow}>
                <CategoryIcon name={category?.icon ?? 'repeat'} color={category?.color ?? colors.muted} size={36} />
                <View style={styles.recurringInfo}>
                  <Text style={styles.recurringName} numberOfLines={1}>
                    {item.note || category?.name || 'Récurrent'}
                  </Text>
                  <Text style={styles.recurringSub}>
                    Jour {item.day_of_month} · depuis {formatDate(item.start_date)}
                    {item.active === 0 ? ' · en pause' : ''}
                  </Text>
                </View>
                <Money
                  amount={item.amount}
                  currency={currency}
                  style={[styles.recurringAmount, { color: item.type === 'income' ? colors.income : colors.text }]}
                />
                <IconButton
                  name={item.active ? 'pause-circle-outline' : 'play-circle-outline'}
                  onPress={async () => {
                    await repo.setRecurringActive(db, item.id, item.active === 0);
                    await refresh();
                  }}
                  size={22}
                  color={item.active ? colors.warning : colors.primary}
                />
                <IconButton
                  name="trash-can-outline"
                  onPress={() =>
                    Alert.alert('Supprimer', 'Supprimer ce récurrent et ses transactions générées ?', [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Supprimer',
                        style: 'destructive',
                        onPress: async () => {
                          await repo.deleteRecurring(db, item.id);
                          await refresh();
                        },
                      },
                    ])
                  }
                  size={20}
                  color={colors.danger}
                />
              </View>
            );
          })
        ) : (
          <EmptyState icon="repeat" title="Aucun récurrent" description="Loyer, abonnements, salaire : ajoute-les une fois, ils se créent chaque mois." />
        )}
      </Card>

      {formVisible ? (
        <BudgetForm visible onClose={() => setFormVisible(false)} initial={editing} />
      ) : null}
      {recurringVisible ? (
        <RecurringForm visible onClose={() => setRecurringVisible(false)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overview: { paddingVertical: 18 },
  overviewRow: { flexDirection: 'row', marginBottom: 16 },
  overviewItem: { flex: 1 },
  overviewLabel: { fontSize: 12, color: colors.muted, marginBottom: 3 },
  overviewValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  overviewHint: { fontSize: 12, color: colors.muted, marginTop: 9, textAlign: 'center' },
  budgetCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  pressed: { opacity: 0.7 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  budgetIdentity: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  budgetName: { fontSize: 14, fontWeight: '700', color: colors.text },
  budgetSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  percent: { fontSize: 14, fontWeight: '800' },
  remaining: { fontSize: 11, marginTop: 7, textAlign: 'right' },
  addLink: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  recurringInfo: { flex: 1 },
  recurringName: { fontSize: 13, fontWeight: '700', color: colors.text },
  recurringSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  recurringAmount: { fontSize: 13, fontWeight: '800' },
});
