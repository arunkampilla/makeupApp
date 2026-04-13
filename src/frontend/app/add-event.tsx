import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export default function AddEvent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [newClientModalVisible, setNewClientModalVisible] = useState(false);

  // Event form
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Date/Time picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/clients`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleAddNewClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          email: newClientEmail.trim(),
          notes: '',
        }),
      });

      if (response.ok) {
        const newClient = await response.json();
        setClients([...clients, newClient]);
        setSelectedClient(newClient);
        setNewClientModalVisible(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
      } else {
        Alert.alert('Error', 'Failed to add client');
      }
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client');
    }
  };

  const handleSaveEvent = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter event name');
      return;
    }

    setSaving(true);

    try {
      const eventData = {
        client_id: selectedClient.id,
        event_name: eventName.trim(),
        event_date: format(eventDate, 'yyyy-MM-dd'),
        event_time: format(eventTime, 'HH:mm'),
        location: location.trim(),
        payment_status: paymentStatus,
        payment_amount: parseFloat(paymentAmount) || 0,
        notes: notes.trim(),
      };

      const response = await fetch(`${BACKEND_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Event created successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event');
    } finally {
      setSaving(false);
    }
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEventTime(selectedTime);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Client Selection */}
        <Text style={styles.label}>Client *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setClientModalVisible(true)}
        >
          {selectedClient ? (
            <View style={styles.selectedClient}>
              <View style={styles.clientAvatar}>
                <Text style={styles.avatarText}>
                  {selectedClient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.selectedClientText}>{selectedClient.name}</Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select a client</Text>
          )}
          <Ionicons name="chevron-down" size={24} color="#888" />
        </TouchableOpacity>

        {/* Event Name */}
        <Text style={styles.label}>Event Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Wedding Makeup, Bridal Trial"
          placeholderTextColor="#666"
          value={eventName}
          onChangeText={setEventName}
        />

        {/* Date and Time */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#E91E8C" />
              <Text style={styles.dateText}>{format(eventDate, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Time *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time" size={20} color="#E91E8C" />
              <Text style={styles.dateText}>{format(eventTime, 'h:mm a')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Event location or address"
          placeholderTextColor="#666"
          value={location}
          onChangeText={setLocation}
        />

        {/* Payment Status */}
        <Text style={styles.label}>Payment Status</Text>
        <View style={styles.statusButtons}>
          {['pending', 'partial', 'paid'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusBtn,
                paymentStatus === status && {
                  backgroundColor: getPaymentStatusColor(status),
                  borderColor: getPaymentStatusColor(status),
                },
              ]}
              onPress={() => setPaymentStatus(status)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  paymentStatus === status && styles.statusBtnTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Amount */}
        <Text style={styles.label}>Payment Amount ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#666"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          keyboardType="decimal-pad"
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional notes about this event..."
          placeholderTextColor="#666"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSaveEvent}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Create Event'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={eventTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      {/* Client Selection Modal */}
      <Modal
        visible={clientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setClientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setClientModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addClientBtn}
              onPress={() => {
                setClientModalVisible(false);
                setNewClientModalVisible(true);
              }}
            >
              <Ionicons name="person-add" size={22} color="#E91E8C" />
              <Text style={styles.addClientBtnText}>Add New Client</Text>
            </TouchableOpacity>

            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientItem}
                  onPress={() => {
                    setSelectedClient(item);
                    setClientModalVisible(false);
                  }}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientItemInfo}>
                    <Text style={styles.clientItemName}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={styles.clientItemDetail}>{item.phone}</Text>
                    ) : null}
                  </View>
                  {selectedClient?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#E91E8C" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyClients}>
                  <Ionicons name="people-outline" size={48} color="#555" />
                  <Text style={styles.emptyText}>No clients yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add a client to get started
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* New Client Modal */}
      <Modal
        visible={newClientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewClientModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Client</Text>
              <TouchableOpacity onPress={() => setNewClientModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Client name"
                placeholderTextColor="#666"
                value={newClientName}
                onChangeText={setNewClientName}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#666"
                value={newClientPhone}
                onChangeText={setNewClientPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#666"
                value={newClientEmail}
                onChangeText={setNewClientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddNewClient}
              >
                <Text style={styles.saveBtnText}>Add Client</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a2e',
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
  selectButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedClient: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E91E8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedClientText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  dateButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
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
    backgroundColor: '#1a1a2e',
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
    marginTop: 32,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    maxHeight: '80%',
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
  addClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0f0f1a',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E91E8C',
    borderStyle: 'dashed',
  },
  addClientBtnText: {
    color: '#E91E8C',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  clientItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clientItemDetail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  emptyClients: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
});
