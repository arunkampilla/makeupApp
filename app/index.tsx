import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://makeupapp.onrender.com';

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

  const fetchData = async () => {
    try {
      const statsRes = await fetch(`${BACKEND_URL}/api/dashboard/stats`);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const eventsRes = await fetch(
        `${BACKEND_URL}/api/events?upcoming=true`
      );

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setUpcomingEvents(eventsData.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

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
    if (hours < 24) return `${hours}h`;

    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E91E8C"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <Ionicons name="people" size={28} color="#fff" />
            <Text style={styles.statNumber}>
              {stats?.total_clients || 0}
            </Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>

          <View style={[styles.statCard, styles.secondaryCard]}>
            <Ionicons name="calendar" size={28} color="#fff" />
            <Text style={styles.statNumber}>
              {stats?.upcoming_events || 0}
            </Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={[styles.statCard, styles.warningCard]}>
            <Ionicons name="time" size={28} color="#fff" />
            <Text style={styles.statNumber}>
              {stats?.pending_payments || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, styles.successCard]}>
            <Ionicons name="cash" size={28} color="#fff" />
            <Text style={styles.statNumber}>
              ${stats?.total_revenue?.toFixed(0) || 0}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

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
              <Text style={styles.quickActionText}>Clients</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/events')}
            >
              <Ionicons name="list" size={24} color="#E91E8C" />
              <Text style={styles.quickActionText}>Events</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>

          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No upcoming events</Text>
            </View>
          ) : (
            upcomingEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventTimeContainer}>
                  <Text style={styles.eventTimeUntil}>
                    {getTimeUntilEvent(
                      event.event_date,
                      event.event_time
                    )}
                  </Text>
                </View>

                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>
                    {event.event_name}
                  </Text>

                  <Text style={styles.eventClient}>
                    {event.client_name}
                  </Text>

                  <Text style={styles.eventDateTime}>
                    {formatEventDate(event.event_date)} at{' '}
                    {event.event_time}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentBadge,
                    {
                      backgroundColor: getPaymentStatusColor(
                        event.payment_status
                      ),
                    },
                  ]}
                >
                  <Text style={styles.paymentBadgeText}>
                    {event.payment_status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

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
    color: '#fff',
    marginTop: 4,
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quickActionBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
  },

  quickActionText: {
    color: '#fff',
    marginTop: 8,
  },

  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },

  emptyText: {
    color: '#888',
  },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },

  eventTimeContainer: {
    backgroundColor: '#E91E8C',
    padding: 12,
    borderRadius: 12,
  },

  eventTimeUntil: {
    color: '#fff',
    fontWeight: 'bold',
  },

  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },

  eventName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  eventClient: {
    color: '#aaa',
    marginTop: 4,
  },

  eventDateTime: {
    color: '#888',
    marginTop: 2,
  },

  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  paymentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});