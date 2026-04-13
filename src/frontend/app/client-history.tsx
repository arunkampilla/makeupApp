import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO, isPast } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
}

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
}

export default function ClientHistory() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!clientId) return;

    try {
      // Fetch client details
      const clientRes = await fetch(`${BACKEND_URL}/api/clients/${clientId}`);
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClient(clientData);
      }

      // Fetch client's events
      const eventsRes = await fetch(`${BACKEND_URL}/api/events?client_id=${clientId}`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handleCall = () => {
    if (!client?.phone) {
      Alert.alert('No Phone Number', 'This client does not have a phone number.');
      return;
    }

    const phoneNumber = client.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = () => {
    if (!client?.email) {
      Alert.alert('No Email', 'This client does not have an email address.');
      return;
    }
    Linking.openURL(`mailto:${client.email}`);
  };

  const handleMessage = () => {
    if (!client?.phone) {
      Alert.alert('No Phone Number', 'This client does not have a phone number.');
      return;
    }

    const phoneNumber = client.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`sms:${phoneNumber}`);
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

  const isEventPast = (dateStr: string, timeStr: string) => {
    const eventDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return isPast(eventDateTime);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate stats
  const totalEvents = events.length;
  const completedEvents = events.filter(e => isEventPast(e.event_date, e.event_time)).length;
  const upcomingEvents = totalEvents - completedEvents;
  const totalRevenue = events.filter(e => e.payment_status === 'paid').reduce((sum, e) => sum + e.payment_amount, 0);
  const pendingAmount = events.filter(e => e.payment_status !== 'paid').reduce((sum, e) => sum + e.payment_amount, 0);

  // Separate past and upcoming events
  const pastEvents = events.filter(e => isEventPast(e.event_date, e.event_time));
  const futureEvents = events.filter(e => !isEventPast(e.event_date, e.event_time));

  if (!client) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E8C" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Client Info Card */}
        <View style={styles.clientCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{client.name.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.clientName}>{client.name}</Text>

          {client.phone ? (
            <TouchableOpacity style={styles.phoneContainer} onPress={handleCall}>
              <Ionicons name="call" size={18} color="#E91E8C" />
              <Text style={styles.phoneText}>{client.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {client.email ? (
            <TouchableOpacity style={styles.emailContainer} onPress={handleEmail}>
              <Ionicons name="mail" size={18} color="#888" />
              <Text style={styles.emailText}>{client.email}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Ionicons name="call" size={22} color="#E91E8C" />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
              <Ionicons name="chatbubble" size={22} color="#E91E8C" />
              <Text style={styles.actionText}>Text</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
              <Ionicons name="mail" size={22} color="#E91E8C" />
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({
                pathname: '/add-event',
                params: { preselectedClientId: client.id }
              })}
            >
              <Ionicons name="add-circle" size={22} color="#E91E8C" />
              <Text style={styles.actionText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalEvents}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{upcomingEvents}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>${totalRevenue}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>${pendingAmount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Notes */}
        {client.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{client.notes}</Text>
          </View>
        ) : null}

        {/* Upcoming Events */}
        {futureEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {futureEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventDate}>
                  <Text style={styles.eventDateText}>{formatDate(event.event_date)}</Text>
                  <Text style={styles.eventTimeText}>{event.event_time}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventName}>{event.event_name}</Text>
                  {event.location ? (
                    <Text style={styles.eventLocation}>
                      <Ionicons name="location" size={14} color="#888" /> {event.location}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.eventPayment}>
                  <View
                    style={[
                      styles.paymentBadge,
                      { backgroundColor: getPaymentStatusColor(event.payment_status) },
                    ]}
                  >
                    <Text style={styles.paymentBadgeText}>
                      {event.payment_status.charAt(0).toUpperCase() + event.payment_status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>${event.payment_amount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event History</Text>
            {pastEvents.map((event) => (
              <View key={event.id} style={[styles.eventCard, styles.pastEventCard]}>
                <View style={[styles.eventDate, styles.pastEventDate]}>
                  <Text style={styles.eventDateText}>{formatDate(event.event_date)}</Text>
                  <Text style={styles.eventTimeText}>{event.event_time}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventName}>{event.event_name}</Text>
                  {event.location ? (
                    <Text style={styles.eventLocation}>
                      <Ionicons name="location" size={14} color="#888" /> {event.location}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.eventPayment}>
                  <View
                    style={[
                      styles.paymentBadge,
                      { backgroundColor: getPaymentStatusColor(event.payment_status) },
                    ]}
                  >
                    <Text style={styles.paymentBadgeText}>
                      {event.payment_status.charAt(0).toUpperCase() + event.payment_status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>${event.payment_amount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* No Events */}
        {events.length === 0 && (
          <View style={styles.noEvents}>
            <Ionicons name="calendar-outline" size={48} color="#555" />
            <Text style={styles.noEventsText}>No events yet</Text>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => router.push({
                pathname: '/add-event',
                params: { preselectedClientId: client.id }
              })}
            >
              <Text style={styles.bookBtnText}>Book First Event</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  clientCard: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E8C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  clientName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    padding: 8,
  },
  phoneText: {
    color: '#E91E8C',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emailText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  actionBtn: {
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  notesCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  notesText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  pastEventCard: {
    opacity: 0.7,
  },
  eventDate: {
    backgroundColor: '#E91E8C',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  pastEventDate: {
    backgroundColor: '#555',
  },
  eventDateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  eventDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  eventName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventLocation: {
    color: '#888',
    fontSize: 13,
  },
  eventPayment: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  paymentAmount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noEvents: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  noEventsText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  bookBtn: {
    backgroundColor: '#E91E8C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
