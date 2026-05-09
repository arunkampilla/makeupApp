import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';


const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

export default function Clients() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchClients = async (search?: string) => {
    try {
      const url = search
        ? `${BACKEND_URL}/api/clients?search=${encodeURIComponent(search)}`
        : `${BACKEND_URL}/api/clients`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients(searchQuery);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    fetchClients(text);
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setModalVisible(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone);
    setFormEmail(client.email);
    setFormNotes(client.notes);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }

    try {
      const clientData = {
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        notes: formNotes.trim(),
      };

      let response;
      if (editingClient) {
        response = await fetch(`${BACKEND_URL}/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });
      } else {
        response = await fetch(`${BACKEND_URL}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });
      }

      if (response.ok) {
        setModalVisible(false);
        fetchClients(searchQuery);
      } else {
        Alert.alert('Error', 'Failed to save client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      Alert.alert('Error', 'Failed to save client');
    }
  };

  const handleDelete = (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}? This will also delete all their events.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/clients/${client.id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchClients(searchQuery);
              } else {
                Alert.alert('Error', 'Failed to delete client');
              }
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'This client does not have a phone number.');
      return;
    }
    const phoneNumber = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => router.push({ pathname: '/client-history', params: { clientId: item.id } })}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        {item.phone ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleCall(item.phone);
            }}
            style={styles.phoneRow}
          >
            <Ionicons name="call" size={14} color="#E91E8C" />
            <Text style={styles.phoneText}>{item.phone}</Text>
          </TouchableOpacity>
        ) : null}
        {item.email ? (
          <Text style={styles.clientDetail}>
            <Ionicons name="mail-outline" size={14} color="#888" /> {item.email}
          </Text>
        ) : null}
      </View>
      <View style={styles.clientActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={(e) => {
            e.stopPropagation();
            openEditModal(item);
          }}
        >
          <Ionicons name="create-outline" size={20} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Clients List */}
      <FlatList
        data={clients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E8C" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#555" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </Text>
            <Text style={styles.emptySubtext}>Tap the button below to add your first client</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClient ? 'Edit Client' : 'Add Client'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Client name"
                placeholderTextColor="#666"
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#666"
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#666"
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any notes about this client..."
                placeholderTextColor="#666"
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E91E8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 14,
  },
  clientName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneText: {
    color: '#E91E8C',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  clientDetail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  clientActions: {
    flexDirection: 'row',
  },
  editBtn: {
    padding: 8,
    marginRight: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E91E8C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#E91E8C',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
