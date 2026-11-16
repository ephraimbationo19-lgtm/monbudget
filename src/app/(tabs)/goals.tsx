import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ContributionForm, GoalForm } from '@/components/forms';
import { Card, EmptyState, Fab, Header, IconButton, Money, ProgressBar, Screen } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { daysUntil } from '@/lib/date';
import { formatMoney } from '@/lib/format';
import { goalSaved } from '@/lib/stats';
import { colors } from '@/theme';
import type { Goal } from '@/types';

export default function GoalsScreen() {
  const { goals, contributions, currency, refresh } = useAppData();
  const [goalVisible, setGoalVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const totalSaved = goals.reduce((sum, goal) => sum + goalSaved(goal, contributions), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);

  return (
    <Screen
      overlay={
        <Fab
          onPress={() => {
            setEditing(null);
            setGoalVisible(true);
          }}
        />
      }>
      <Header title="Objectifs" subtitle="Épargne pour ce qui compte" />

      {goals.length > 0 ? (
        <Card style={styles.overview}>
          <View style={styles.overviewRow}>
            <View>
              <Text style={styles.overviewLabel}>Total épargné</Text>
              <Money amount={totalSaved} currency={currency} style={[styles.overviewValue, { color: colors.primary }]} />
            </View>
            <View style={styles.overviewRight}>
              <Text style={styles.overviewLabel}>Objectif total</Text>
              <Money amount={totalTarget} currency={currency} style={styles.overviewValue} />
            </View>
          </View>
          <ProgressBar ratio={totalTarget > 0 ? totalSaved / totalTarget : 0} color={colors.primary} height={10} />
        </Card>
      ) : null}

      {goals.length > 0 ? (
        goals.map((goal) => {
          const saved = goalSaved(goal, contributions);
          const ratio = goal.target > 0 ? saved / goal.target : 0;
          const remaining = Math.max(0, goal.target - saved);
          const days = goal.deadline ? daysUntil(goal.deadline) : null;
          return (
            <Card key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: `${goal.color}1F` }]}>
                  <Text style={[styles.goalEmoji, { color: goal.color }]}>★</Text>
                </View>
                <View style={styles.goalTitleBox}>
                  <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                  <Text style={styles.goalMeta}>
                    {days === null
                      ? 'Sans échéance'
                      : days < 0
                        ? `Échéance dépassée de ${Math.abs(days)} j`
                        : days === 0
                          ? 'Échéance aujourd’hui'
                          : `${days} j restants`}
                  </Text>
                </View>
                <IconButton
                  name="pencil-outline"
                  onPress={() => {
                    setEditing(goal);
                    setGoalVisible(true);
                  }}
                  size={18}
                  color={colors.muted}
                />
              </View>

              <View style={styles.amountRow}>
                <Money amount={saved} currency={currency} style={[styles.saved, { color: goal.color }]} />
                <Text style={styles.target}> / {formatMoney(goal.target, currency)}</Text>
              </View>
              <ProgressBar ratio={ratio} color={goal.color} height={10} />
              <View style={styles.goalFooter}>
                <Text style={styles.remaining}>
                  {remaining > 0 ? `${formatMoney(remaining, currency)} restants` : 'Objectif atteint ! 🎉'}
                </Text>
                <Pressable
                  onPress={() => setContributionGoal(goal)}
                  style={[styles.addButton, { backgroundColor: `${goal.color}1F` }]}>
                  <Text style={[styles.addText, { color: goal.color }]}>+ Ajouter</Text>
                </Pressable>
              </View>
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState
            icon="target"
            title="Aucun objectif pour l'instant"
            description="Un voyage, un ordinateur, un apport : fixe un montant et suis ta progression."
          />
        </Card>
      )}

      {goalVisible ? (
        <GoalForm visible onClose={() => setGoalVisible(false)} initial={editing} />
      ) : null}
      {contributionGoal ? (
        <ContributionForm visible onClose={() => setContributionGoal(null)} goal={contributionGoal} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overview: { paddingVertical: 18 },
  overviewRow: { flexDirection: 'row', marginBottom: 16 },
  overviewRight: { alignItems: 'flex-end', flex: 1 },
  overviewLabel: { fontSize: 12, color: colors.muted, marginBottom: 3 },
  overviewValue: { fontSize: 19, fontWeight: '800', color: colors.text },
  goalCard: { paddingVertical: 18 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  goalIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalEmoji: { fontSize: 22, fontWeight: '800' },
  goalTitleBox: { flex: 1 },
  goalName: { fontSize: 15, fontWeight: '800', color: colors.text },
  goalMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 18, marginBottom: 9 },
  saved: { fontSize: 22, fontWeight: '800' },
  target: { fontSize: 13, color: colors.muted },
  goalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  remaining: { fontSize: 12, color: colors.textSecondary },
  addButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addText: { fontSize: 12, fontWeight: '700' },
});
