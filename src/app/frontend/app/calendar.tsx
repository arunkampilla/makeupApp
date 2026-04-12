import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';

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
}

export default function CalendarView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [markedDates, setMarkedDates] = useState<any>({});
  const [dayEvents, setDayEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/events`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);

        // Create marked dates object
        const marks: any = {};
        data.forEach((event: Event) => {
          const dateKey = event.event_date;
          if (!marks[dateKey]) {
            marks[dateKey] = {
              marked: true,
              dots: [{ color: getPaymentStatusColor(event.payment_status) }],
            };
          } else {
            // Add another dot for multiple events
            if (marks[dateKey].dots.length < 3) {
              marks[dateKey].dots.push({ color: getPaymentStatusColor(event.payment_status) });
            }
          }
        });

        // Mark selected date
        if (marks[selectedDate]) {
          marks[selectedDate] = {
            ...marks[selectedDate],
            selected: true,
            selectedColor: '#E91E8C',
          };
        } else {
          marks[selectedDate] = {
            selected: true,
            selectedColor: '#E91E8C',
          };
        }

        setMarkedDates(marks);

        // Filter events for selected date
        const filtered = data.filter((e: Event) => e.event_date === selectedDate);
        setDayEvents(filtered);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
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
    }, [selectedDate])
  );

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    const filtered = events.filter((e) => e.event_date === day.dateString);
    setDayEvents(filtered);

    // Update marked dates
    const newMarks: any = {};
    events.forEach((event) => {
      const dateKey = event.event_date;
      if (!newMarks[dateKey]) {
        newMarks[dateKey] = {
          marked: true,
          dots: [{ color: getPaymentStatusColor(event.payment_status) }],
        };
      } else if (newMarks[dateKey].dots.length < 3) {
        newMarks[dateKey].dots.push({ color: getPaymentStatusColor(event.payment_status) });
      }
    });

    if (newMarks[day.dateString]) {
      newMarks[day.dateString] = {
        ...newMarks[day.dateString],
        selected: true,
        selectedColor: '#E91E8C',
      };
    } else {
      newMarks[day.dateString] = {
        selected: true,
        selectedColor: '#E91E8C',
      };
    }

    setMarkedDates(newMarks);
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

  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
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
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: '#1a1a2e',
              calendarBackground: '#1a1a2e',
              textSectionTitleColor: '#888',
              selectedDayBackgroundColor: '#E91E8C',
              selectedDayTextColor: '#fff',
              todayTextColor: '#E91E8C',
              dayTextColor: '#fff',
              textDisabledColor: '#444',
              dotColor: '#E91E8C',
              selectedDotColor: '#fff',
              arrowColor: '#E91E8C',
              monthTextColor: '#fff',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
            style={styles.calendar}
          />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Partial</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Paid</Text>
          </View>
        </View>

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.dateHeader}>{formatDisplayDate(selectedDate)}</Text>

          {dayEvents.length === 0 ? (
            <View style={styles.noEvents}>
              <Ionicons name="calendar-outline" size={48} color="#555" />
              <Text style={styles.noEventsText}>No events scheduled</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/add-event')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dayEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push({
                  pathname: '/events',
                  params: { eventId: event.id }
                })}
              >
                <View style={styles.eventTime}>
                  <Text style={styles.timeText}>{event.event_time}</Text>
                </View>

                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.event_name}</Text>
                  <Text style={styles.eventClient}>
                    <Ionicons name="person" size={14} color="#E91E8C" /> {event.client_name}
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

        <View style={{ height: 120 }} />
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
  },
  calendarContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  calendar: {
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#888',
    fontSize: 13,
  },
  eventsSection: {
    padding: 16,
  },
  dateHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noEvents: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  noEventsText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E8C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
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
  eventTime: {
    backgroundColor: '#E91E8C',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
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
    borderRadius: 10,
    marginBottom: 4,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  paymentAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
