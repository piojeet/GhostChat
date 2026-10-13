import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { searchFriends } from '../../friends/services/friendService';
import type { SearchUser } from '../../friends/types/friend.types';
import { ApiError } from '../../../services/api/apiError';

type Props = BottomTabScreenProps<MainTabParamList, 'Search'>;
type SearchKind = 'People' | 'Tags' | 'Places';
type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  kind: SearchKind;
  avatar?: string | null;
  username?: string;
  color?: string;
};
type SearchFilter = 'All' | SearchKind;

const filters: SearchFilter[] = ['All', 'People', 'Tags', 'Places'];

const SearchScreen = ({ navigation }: Props) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const loadUsers = useCallback(async (requestedPage = 1, append = false) => {
    const term = query.trim().replace(/^@/, '');
    if (!term || (activeFilter !== 'All' && activeFilter !== 'People')) {
      setResults([]);
      setHasNextPage(false);
      setError(term ? `Search for ${activeFilter.toLowerCase()} is not available yet.` : '');
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const result = await searchFriends(term, requestedPage);
      const mapped: SearchResult[] = result.items.map((user: SearchUser) => ({
        id: user.id,
        title: user.displayName,
        subtitle: `@${user.username}`,
        username: user.username,
        avatar: user.avatar,
        kind: 'People',
      }));
      setResults(current => append ? [...current, ...mapped] : mapped);
      setPage(requestedPage);
      setHasNextPage(result.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to search users.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter, query]);

  useEffect(() => {
    const timer = setTimeout(() => { loadUsers(1); }, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const selectRecent = (item: string) => {
    setQuery(item);
  };

  const saveRecent = (value: string) => {
    const term = value.trim();
    if (!term) {
      return;
    }
    setRecentSearches(current => [
      term,
      ...current.filter(item => item.toLowerCase() !== term.toLowerCase()),
    ].slice(0, 8));
  };

  const openResult = (result: SearchResult) => {
    saveRecent(result.kind === 'People' ? result.username ?? result.title : result.title.toLowerCase());
    switch (result.kind) {
      case 'People':
        navigation.navigate('PublicProfile', {
          userId: result.id,
          username: result.username,
          name: result.title,
        });
        break;
      case 'Places':
        Alert.alert('Places unavailable', 'Place search is not supported by the current backend.');
        break;
      case 'Tags':
        Alert.alert('Tags unavailable', 'Tag search is not supported by the current backend.');
        break;
    }
  };

  const clearSearch = () => setQuery('');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={30} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Text style={styles.title}>Search</Text>
        </View>

        <View style={styles.searchBorder}>
          <View style={styles.searchField}>
            <Icon name="search" size={25} color={adaptThemeColor('#F3F5F9', 'color')} />
            <TextInput
              accessibilityLabel="Search users, tags, or locations"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              onSubmitEditing={() => saveRecent(query)}
              placeholder="Search users, tags, or locations..."
              placeholderTextColor={adaptThemeColor('#9BA8BD', 'color')}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search text"
                accessibilityRole="button"
                onPress={clearSearch}
                style={styles.clearQueryButton}
              >
                <Icon name="x" size={18} color={adaptThemeColor('#AAB3C2', 'color')} />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Search filters"
              accessibilityRole="button"
              accessibilityState={{ expanded: showFilters }}
              onPress={() => setShowFilters(value => !value)}
              style={styles.filterButton}
            >
              <Icon name="sliders" size={23} color={adaptThemeColor('#F3F5F9', 'color')} />
            </Pressable>
          </View>
        </View>

        {showFilters && (
          <View style={styles.filterOptions}>
            {filters.map(filter => {
              const selected = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {normalizedQuery ? (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Results</Text>
            {results.map(result => (
              <SearchResultRow key={result.id} result={result} onPress={openResult} />
            ))}
            {loading && <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} />}
            {error ? <Text style={styles.emptyDescription}>{error}</Text> : null}
            {results.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="search" size={31} color={adaptThemeColor('#7E8796', 'color')} />
                <Text style={styles.emptyTitle}>{loading ? 'Searching…' : 'No results found'}</Text>
                {!error && <Text style={styles.emptyDescription}>Try another name or username.</Text>}
              </View>
            )}
            {!loading && hasNextPage && (
              <Pressable onPress={() => loadUsers(page + 1, true)} disabled={loadingMore} style={styles.loadMore}>
                {loadingMore ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : <Text style={styles.seeAllText}>Load more</Text>}
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <Pressable
                accessibilityLabel="Clear all recent searches"
                accessibilityRole="button"
                onPress={() => setRecentSearches([])}
                disabled={recentSearches.length === 0}
              >
                <Text style={[styles.clearAll, recentSearches.length === 0 && styles.disabledText]}>
                  Clear All
                </Text>
              </Pressable>
            </View>
            {recentSearches.map(item => (
              <Pressable
                key={item}
                accessibilityLabel={`Search ${item}`}
                accessibilityRole="button"
                onPress={() => selectRecent(item)}
                style={styles.recentRow}
              >
                <View style={styles.recentIcon}>
                  <Icon name="clock" size={22} color={adaptThemeColor('#F2F3F5', 'color')} />
                </View>
                <Text numberOfLines={1} style={styles.recentText}>{item}</Text>
                <Pressable
                  accessibilityLabel={`Remove ${item} from recent searches`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={event => {
                    event.stopPropagation();
                    setRecentSearches(current => current.filter(value => value !== item));
                  }}
                  style={styles.removeRecent}
                >
                  <Icon name="x" size={21} color={adaptThemeColor('#B6BBC5', 'color')} />
                </Pressable>
              </Pressable>
            ))}
            {recentSearches.length === 0 && (
              <Text style={styles.noRecents}>Your recent searches will appear here.</Text>
            )}

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const SearchResultRow = ({
  result,
  onPress,
}: {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}) => {
  const isTag = result.kind === 'Tags';
  const isPerson = result.kind === 'People';

  return (
    <Pressable
      accessibilityLabel={`${result.title}, ${result.subtitle}`}
      accessibilityRole="button"
      onPress={() => onPress(result)}
      style={styles.resultRow}
    >
      <View
        style={[
          styles.resultIcon,
          isTag && { backgroundColor: result.color },
          result.kind === 'Places' && styles.placeIcon,
        ]}
      >
        {isPerson && result.avatar ? (
          <Image source={{ uri: result.avatar }} style={styles.resultAvatar} />
        ) : (
          <Icon
            name={isTag ? 'hash' : result.kind === 'Places' ? 'map-pin' : 'user'}
            size={isTag ? 31 : 24}
            color={isTag ? '#FFFFFF' : result.kind === 'Places' ? '#FFFFFF' : '#FFEA00'}
          />
        )}
      </View>
      <View style={styles.resultDetails}>
        <Text numberOfLines={1} style={styles.resultTitle}>{result.title}</Text>
        <Text numberOfLines={1} style={styles.resultSubtitle}>{result.subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={22} color={adaptThemeColor('#B7BBC4', 'color')} />
    </Pressable>
  );
};

export default SearchScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080A0B',
  },
  content: {
    paddingBottom: 26,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#24272B',
    borderRadius: 24,
    backgroundColor: '#111315',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
  },
  searchBorder: {
    marginHorizontal: 20,
    padding: 1.5,
    borderRadius: 30,
    backgroundColor: '#36DFF2',
  },
  searchField: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
    borderRadius: 29,
    backgroundColor: '#101316',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    marginLeft: 15,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
  },
  clearQueryButton: {
    width: 29,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 23,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#32373D',
    borderRadius: 20,
    backgroundColor: '#121518',
  },
  filterChipSelected: {
    borderColor: '#42DAEF',
    backgroundColor: '#15252A',
  },
  filterChipText: {
    color: '#B7C0CC',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#67E8F7',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 23,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F6F7F9',
    fontSize: 19,
    fontWeight: '800',
  },
  clearAll: {
    color: '#AEB7C7',
    fontSize: 14,
  },
  disabledText: {
    opacity: 0.45,
  },
  recentRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 23,
    marginBottom: 5,
    paddingLeft: 10,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: '#202428',
    borderRadius: 27,
    backgroundColor: '#101315',
  },
  recentIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderRadius: 22,
    backgroundColor: '#1B1F23',
  },
  recentText: {
    flex: 1,
    color: '#F0F1F3',
    fontSize: 16,
  },
  removeRecent: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  noRecents: {
    marginHorizontal: 24,
    paddingVertical: 15,
    color: '#818A98',
    fontSize: 14,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: '#AEB7C7',
    fontSize: 14,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  resultRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 23,
    marginBottom: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#171A1D',
    borderRadius: 23,
    backgroundColor: '#0A0C0E',
  },
  resultIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    overflow: 'hidden',
    borderRadius: 25,
    backgroundColor: '#192029',
  },
  resultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeIcon: {
    backgroundColor: '#168958',
  },
  resultDetails: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    color: '#F2F3F5',
    fontSize: 16,
    fontWeight: '700',
  },
  resultSubtitle: {
    marginTop: 3,
    color: '#98A4B7',
    fontSize: 14,
  },
  resultsSection: {
    marginTop: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 54,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDescription: {
    marginTop: 6,
    color: '#8791A0',
    fontSize: 14,
  },
});