import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DebtForm, PaymentForm } from '@/components/forms';
import { Card, EmptyState, Fab, Header, IconButton, Money, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { daysUntil, formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/format';
import { debtPaid, debtRemaining } from '@/lib/stats';
import { colors } from '@/theme';
import type { Debt } from '@/types';

export default function DebtsScreen() {
  const { debts, payments, currency, refresh } = useAppData();
  const [formVisible, setFormVisible] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const owing = debts.filter((d) => d.direction === 'owing');
  const owed = debts.filter((d) => d.direction === 'owed');
  const totalOwing = owing.reduce((sum, d) => sum + debtRemaining(d, payments), 0);
  const totalOwed = owed.reduce((sum, d) => sum + debtRemaining(d, payments), 0);

  function renderDebt(debt: Debt) {
    const remaining = debtRemaining(debt, payments);
    const paid = debtPaid(debt, payments);
    const ratio = debt.total > 0 ? paid / debt.total : 0;
    const isOwed = debt.direction === 'owed';
    const days = debt.due_date ? daysUntil(debt.due_date) : null;
    const late = days !== null && days < 0 && remaining > 0;

    return (
      <Card key={debt.id} style={styles.debtCard}>
        <View style={styles.debtHeader}>
          <View style={[styles.icon, { backgroundColor: isOwed ? colors.incomeSoft : colors.expenseSoft }]}>
            <Text style={[styles.iconText, { color: isOwed ? colors.income : colors.expense }]}>
              {isOwed ? '↙' : '↗'}
            </Text>
          </View>
          <View style={styles.debtTitle}>
            <Text style={styles.debtName} numberOfLines={1}>{debt.name}</Text>
            <Text style={styles.debtPerson} numberOfLines={1}>
              {debt.person || (isOwed ? 'On me doit' : 'Je dois')}
              {debt.due_date ? ` · ${formatDate(debt.due_date)}` : ''}
            </Text>
          </View>
          <IconButton
            name="cash-plus"
            onPress={() => setPaymentDebt(debt)}
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Reste à {isOwed ? 'recevoir' : 'payer'}</Text>
            <Money
              amount={remaining}
              currency={currency}
              style={[styles.remaining, { color: late ? colors.danger : colors.text }]}
            />
          </View>
          <View style={styles.amountRight}>
            <Text style={styles.amountLabel}>Total</Text>
            <Money amount={debt.total} currency={currency} style={styles.totalText} />
          </View>
        </View>

        <ProgressBar ratio={ratio} color={isOwed ? colors.income : colors.primary} height={9} />
        <View style={styles.debtFooter}>
          <Text style={styles.paidText}>
            {formatMoney(paid, currency)} payés · {Math.round(ratio * 100)} %
          </Text>
          {late ? <Text style={styles.lateText}>En retard</Text> : null}
        </View>
      </Card>
    );
  }

  return (
    <Screen overlay={<Fab onPress={() => setFormVisible(true)} />}>
      <Header title="Dettes" subtitle="Ce que tu dois et ce qu'on te doit" />

      {debts.length > 0 ? (
        <Card style={styles.overview}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Je dois</Text>
              <Money amount={totalOwing} currency={currency} style={[styles.overviewValue, { color: colors.expense }]} />
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>On me doit</Text>
              <Money amount={totalOwed} currency={currency} style={[styles.overviewValue, { color: colors.income }]} />
            </View>
          </View>
        </Card>
      ) : null}

      <SectionTitle title={`Je dois (${owing.length})`} />
      {owing.length > 0 ? (
        owing.map(renderDebt)
      ) : (
        <Card><EmptyState icon="cash-minus" title="Aucune dette" description="Tu ne dois rien à personne. Tant mieux !" /></Card>
      )}

      <SectionTitle title={`On me doit (${owed.length})`} />
      {owed.length > 0 ? (
        owed.map(renderDebt)
      ) : (
        <Card><EmptyState icon="cash-plus" title="Personne ne te doit rien" description="Ajoute une créance pour suivre un remboursement." /></Card>
      )}

      {formVisible ? <DebtForm visible onClose={() => setFormVisible(false)} /> : null}
      {paymentDebt ? (
        <PaymentForm visible onClose={() => setPaymentDebt(null)} debt={paymentDebt} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overview: { paddingVertical: 18 },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  overviewItem: { flex: 1 },
  overviewDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: 10 },
  overviewLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  overviewValue: { fontSize: 18, fontWeight: '800' },
  debtCard: { paddingVertical: 16 },
  debtHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22, fontWeight: '800' },
  debtTitle: { flex: 1 },
  debtName: { fontSize: 14, fontWeight: '800', color: colors.text },
  debtPerson: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
  amountRight: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, color: colors.muted, marginBottom: 3 },
  remaining: { fontSize: 20, fontWeight: '800' },
  totalText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  debtFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  paidText: { fontSize: 11, color: colors.muted },
  lateText: { fontSize: 11, color: colors.danger, fontWeight: '700' },
});
