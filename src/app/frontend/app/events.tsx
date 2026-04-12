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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Event {
  id: string;
  client_id: string;
  client_name: string;
  event_name: string;
  event_date: string;
  event_time: string;
  location: string;
  payment_status: string;
  payment_amount: number;
  notes: string;
  reminder_sent_1day: boolean;
  reminder_sent_1hour: boolean;
}

interface Client {
  id: string;
  name: string;
}

export default function Events() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formPaymentStatus, setFormPaymentStatus] = useState('pending');
  const [formPaymentAmount, setFormPaymentAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchEvents = async () => {
    try {
      let url = `${BACKEND_URL}/api/events`;
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [filterStatus])
  );

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormPaymentStatus(event.payment_status);
    setFormPaymentAmount(event.payment_amount.toString());
    setFormNotes(event.notes);
    setModalVisible(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: formPaymentStatus,
          payment_amount: parseFloat(formPaymentAmount) || 0,
          notes: formNotes,
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        fetchEvents();
      } else {
        Alert.alert('Error', 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event');
    }
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.event_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/events/${event.id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchEvents();
              } else {
                Alert.alert('Error', 'Failed to delete event');
              }
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'partial':
        return '#FF9800';
      default:
        return '#F44336';
    }
  };

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d, yyyy');
  };

  const isEventPast = (dateStr: string, timeStr: string) => {
    const eventDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return isPast(eventDateTime);
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const eventIsPast = isEventPast(item.event_date, item.event_time);

    return (
      <TouchableOpacity
        style={[styles.eventCard, eventIsPast && styles.pastEvent]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBadge}>
            <Text style={styles.eventDateText}>{formatEventDate(item.event_date)}</Text>
            <Text style={styles.eventTimeText}>{item.event_time}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteEvent(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>

        <Text style={styles.eventName}>{item.event_name}</Text>

        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color="#E91E8C" />
            <Text style={styles.detailText}>{item.client_name}</Text>
          </View>

          {item.location ? (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color="#E91E8C" />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.eventFooter}>
          <View
            style={[
              styles.paymentBadge,
              { backgroundColor: getPaymentStatusColor(item.payment_status) },
            ]}
          >
            <Text style={styles.paymentBadgeText}>
              {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
            </Text>
          </View>
          <Text style={styles.paymentAmount}>${item.payment_amount.toFixed(2)}</Text>
        </View>

        {item.notes ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
          </View>
        ) : null}

        {eventIsPast && (
          <View style={styles.pastBadge}>
            <Text style={styles.pastBadgeText}>PAST</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'partial', label: 'Partial' },
    { key: 'paid', label: 'Paid' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterButtons.map((btn) => (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.filterBtn,
                filterStatus === btn.key && styles.filterBtnActive,
              ]}
              onPress={() => setFilterStatus(btn.key)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterStatus === btn.key && styles.filterBtnTextActive,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E8C" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#555" />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>Create a new event to get started</Text>
            <TouchableOpacity
              style={styles.addEventBtn}
              onPress={() => router.push('/add-event')}
            >
              <Text style={styles.addEventBtnText}>Add Event</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-event')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Edit Modal */}
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
              <Text style={styles.modalTitle}>Update Event</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {editingEvent && (
              <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                <View style={styles.eventSummary}>
                  <Text style={styles.summaryTitle}>{editingEvent.event_name}</Text>
                  <Text style={styles.summarySubtitle}>
                    {editingEvent.client_name} • {formatEventDate(editingEvent.event_date)} at {editingEvent.event_time}
                  </Text>
                </View>

                <Text style={styles.label}>Payment Status</Text>
                <View style={styles.statusButtons}>
                  {['pending', 'partial', 'paid'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusBtn,
                        formPaymentStatus === status && {
                          backgroundColor: getPaymentStatusColor(status),
                          borderColor: getPaymentStatusColor(status),
                        },
                      ]}
                      onPress={() => setFormPaymentStatus(status)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          formPaymentStatus === status && styles.statusBtnTextActive,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Payment Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={formPaymentAmount}
                  onChangeText={setFormPaymentAmount}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Event notes..."
                  placeholderTextColor="#666"
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateEvent}>
                  <Text style={styles.saveBtnText}>Update Event</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  filterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  filterBtnActive: {
    backgroundColor: '#E91E8C',
    borderColor: '#E91E8C',
  },
  filterBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  pastEvent: {
    opacity: 0.6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventDateBadge: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eventDateText: {
    color: '#E91E8C',
    fontSize: 14,
    fontWeight: '600',
  },
  eventTimeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  eventName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    color: '#aaa',
    fontSize: 15,
    marginLeft: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  paymentBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentAmount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0f0f1a',
    borderRadius: 8,
  },
  notesText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  pastBadge: {
    position: 'absolute',
    top: 16,
    right: 50,
    backgroundColor: '#555',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pastBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    marginBottom: 24,
  },
  addEventBtn: {
    backgroundColor: '#E91E8C',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  addEventBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    maxHeight: '85%',
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
  eventSummary: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summarySubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
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
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
    backgroundColor: '#0f0f1a',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statusBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBtnTextActive: {
    color: '#fff',
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
