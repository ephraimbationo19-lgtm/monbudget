import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon, Money } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { colors } from '@/theme';
import type { Category, Transaction } from '@/types';

export function TransactionRow({
  transaction,
  category,
  currency,
  onPress,
}: {
  transaction: Transaction;
  category?: Category;
  currency: string;
  onPress?: () => void;
}) {
  const isIncome = transaction.type === 'income';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}>
      <CategoryIcon
        name={category?.icon ?? 'help-circle-outline'}
        color={category?.color ?? colors.muted}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.note || category?.name || 'Transaction'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {category?.name ?? 'Autre'} · {formatDate(transaction.date)}
        </Text>
      </View>
      <Money
        amount={isIncome ? transaction.amount : -transaction.amount}
        currency={currency}
        signed={isIncome}
        style={[styles.amount, { color: isIncome ? colors.income : colors.text }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  pressed: { opacity: 0.65 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800' },
});
