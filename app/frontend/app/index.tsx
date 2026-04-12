import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { format, parseISO, isToday, isTomorrow, differenceInHours, differenceInMinutes } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

interface DashboardStats {
  total_clients: number;
  total_events: number;
  upcoming_events: number;
  pending_payments: number;
  partial_payments: number;
  total_revenue: number;
  pending_amount: number;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications to receive event reminders.'
      );
    }
  };

  const scheduleReminders = async (events: Event[]) => {
    // Cancel all existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const event of events) {
      const eventDateTime = new Date(`${event.event_date}T${event.event_time}:00`);
      const now = new Date();

      // Schedule 1-day reminder
      const oneDayBefore = new Date(eventDateTime);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      if (oneDayBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Event Tomorrow!',
            body: `${event.event_name} with ${event.client_name} is tomorrow at ${event.event_time}`,
            data: { eventId: event.id },
          },
          trigger: { date: oneDayBefore },
        });
      }

      // Schedule 1-hour reminder
      const oneHourBefore = new Date(eventDateTime);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);
      if (oneHourBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Event in 1 Hour!',
            body: `${event.event_name} with ${event.client_name} starts in 1 hour at ${event.location || 'your location'}`,
            data: { eventId: event.id },
          },
          trigger: { date: oneHourBefore },
        });
      }
    }
  };

  const fetchData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch upcoming events
      const eventsRes = await fetch(`${BACKEND_URL}/api/events?upcoming=true`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setUpcomingEvents(eventsData.slice(0, 5)); // Show only next 5 events
        // Schedule reminders for all upcoming events
        await scheduleReminders(eventsData);
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
    requestNotificationPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

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
    return format(date, 'MMM d, yyyy');
  };

  const getTimeUntilEvent = (dateStr: string, timeStr: string) => {
    const eventDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const now = new Date();
    const hours = differenceInHours(eventDateTime, now);
    const minutes = differenceInMinutes(eventDateTime, now) % 60;

    if (hours < 0) return 'Past';
    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E8C" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <Ionicons name="people" size={28} color="#fff" />
            <Text style={styles.statNumber}>{stats?.total_clients || 0}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>

          <View style={[styles.statCard, styles.secondaryCard]}>
            <Ionicons name="calendar" size={28} color="#fff" />
            <Text style={styles.statNumber}>{stats?.upcoming_events || 0}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={[styles.statCard, styles.warningCard]}>
            <Ionicons name="time" size={28} color="#fff" />
            <Text style={styles.statNumber}>{stats?.pending_payments || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, styles.successCard]}>
            <Ionicons name="cash" size={28} color="#fff" />
            <Text style={styles.statNumber}>${stats?.total_revenue?.toFixed(0) || 0}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/add-event')}
            >
              <Ionicons name="add-circle" size={24} color="#E91E8C" />
              <Text style={styles.quickActionText}>New Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/clients')}
            >
              <Ionicons name="person-add" size={24} color="#E91E8C" />
              <Text style={styles.quickActionText}>Add Client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/events')}
            >
              <Ionicons name="list" size={24} color="#E91E8C" />
              <Text style={styles.quickActionText}>All Events</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/events')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#555" />
              <Text style={styles.emptyText}>No upcoming events</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-event')}
              >
                <Text style={styles.addButtonText}>Schedule Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push({
                  pathname: '/events',
                  params: { eventId: event.id }
                })}
              >
                <View style={styles.eventTimeContainer}>
                  <Text style={styles.eventTimeUntil}>
                    {getTimeUntilEvent(event.event_date, event.event_time)}
                  </Text>
                </View>

                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.event_name}</Text>
                  <Text style={styles.eventClient}>
                    <Ionicons name="person" size={14} color="#888" /> {event.client_name}
                  </Text>
                  <Text style={styles.eventDateTime}>
                    <Ionicons name="calendar" size={14} color="#888" /> {formatEventDate(event.event_date)} at {event.event_time}
                  </Text>
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
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Financial Summary */}
        {stats && (stats.pending_amount > 0 || stats.total_revenue > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Summary</Text>
            <View style={styles.financialCard}>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Total Revenue</Text>
                <Text style={[styles.financialValue, styles.revenueText]}>
                  ${stats.total_revenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Pending Payments</Text>
                <Text style={[styles.financialValue, styles.pendingText]}>
                  ${stats.pending_amount.toFixed(2)}
                </Text>
              </View>
            </View>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#E91E8C',
  },
  secondaryCard: {
    backgroundColor: '#6366F1',
  },
  warningCard: {
    backgroundColor: '#F59E0B',
  },
  successCard: {
    backgroundColor: '#10B981',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#E91E8C',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#E91E8C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  eventTimeContainer: {
    backgroundColor: '#E91E8C',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  eventTimeUntil: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  eventName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventClient: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 2,
  },
  eventDateTime: {
    color: '#888',
    fontSize: 13,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  financialCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  financialLabel: {
    color: '#888',
    fontSize: 16,
  },
  financialValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  revenueText: {
    color: '#10B981',
  },
  pendingText: {
    color: '#F59E0B',
  },
});
