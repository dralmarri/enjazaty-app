/**
 * "بحث" — simple search across schools + designers by name.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Input, EmptyState, Loading, Card } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { searchAll } from '@/lib/api';
import type { School, UserProfile } from '@/types/database';
import { colors, spacing } from '@/theme/colors';

export default function SearchScreen() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [designers, setDesigners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const onSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setSchools([]);
      setDesigners([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchAll(q.trim());
      setSchools(res.schools);
      setDesigners(res.designers);
    } catch {
      setSchools([]);
      setDesigners([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const noResults = searched && schools.length === 0 && designers.length === 0;

  return (
    <Screen>
      <Header title={t('tabSearch')} />
      <View style={styles.body}>
        <Input placeholder={t('search')} value={query} onChangeText={onSearch} autoFocus />
        {loading ? <Loading /> : null}
        {!loading && noResults ? <EmptyState message={t('noResults')} icon="search-outline" /> : null}

        {schools.map((s) => (
          <Pressable key={s.id} onPress={() => router.push(`/school/${s.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.title}>{s.name}</Text>
              <Text style={styles.sub}>{t('school')}</Text>
            </Card>
          </Pressable>
        ))}
        {designers.map((d) => (
          <Card key={d.id} style={styles.card}>
            <Text style={styles.title}>{d.full_name}</Text>
            <Text style={styles.sub}>{d.job_title ?? t('roleDesigner')}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg },
  card: { marginTop: spacing.sm },
  title: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  sub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
