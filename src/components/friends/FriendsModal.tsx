// Add Friends modal - search users and manage pending requests
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFriendsStore } from '../../store/friendsStore';
import FriendRequestCard from './FriendRequestCard';
import UserSearchResult from './UserSearchResult';

interface FriendsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FriendsModal({ visible, onClose }: FriendsModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  const {
    pendingRequests,
    searchResults,
    isSearching,
    loadPendingRequests,
    searchUsers,
    clearSearchResults,
    sendRequest,
    acceptRequest,
    declineRequest,
  } = useFriendsStore();

  // Load pending requests when modal opens
  useEffect(() => {
    if (visible) {
      loadPendingRequests();
    } else {
      setSearchQuery('');
      clearSearchResults();
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    if (searchQuery.trim()) {
      const timeout = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);
      setSearchDebounce(timeout);
    } else {
      clearSearchResults();
    }

    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [searchQuery]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('friends.addFriend')}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('friends.searchPlaceholder')}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearching && <ActivityIndicator size="small" color="#FF4B4B" />}
              {searchQuery.length > 0 && !isSearching && (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    clearSearchResults();
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color="#999" />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Search Results */}
            {searchQuery.trim().length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('friends.searchResults')} ({searchResults.length})
                </Text>
                {isSearching ? (
                  <View style={styles.searchingState}>
                    <ActivityIndicator size="small" color="#FF4B4B" />
                    <Text style={styles.searchingText}>{t('friends.searching')}</Text>
                  </View>
                ) : searchResults.length > 0 ? (
                  <View style={styles.searchResults}>
                    {searchResults.map((user) => (
                      <UserSearchResult key={user.id} user={user} onSendRequest={sendRequest} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.noResultsState}>
                    <Ionicons name="search-outline" size={32} color="#ccc" />
                    <Text style={styles.noResultsText}>
                      {t('friends.noUsersFound', { query: searchQuery })}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('friends.pendingRequests')} ({pendingRequests.length})
                </Text>
                <View style={styles.list}>
                  {pendingRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      onAccept={acceptRequest}
                      onDecline={declineRequest}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Empty state when no search and no pending */}
            {!searchQuery.trim() && pendingRequests.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="person-add-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{t('friends.searchToAdd')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    minHeight: 300,
    backgroundColor: '#FDF3E7',
    borderRadius: 4,
    borderWidth: 4,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#ddd',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#2B2B2B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: 10,
  },
  searchResults: {
    gap: 8,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  searchingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  searchingText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
  },
  noResultsState: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
