import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HistoryCalendarProps {
    history: string[]; // List of YYYY-MM-DD
}

export default function HistoryCalendar({ history }: HistoryCalendarProps) {
    // Generate last 7 days including today
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        days.push({
            date: d,
            iso: iso,
            completed: history.includes(iso),
            isToday: i === 0
        });
    }

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>LAST 7 DAYS</Text>
            <View style={styles.row}>
                {days.map((day, index) => (
                    <View key={day.iso} style={styles.dayCol}>
                        <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>
                            {weekDays[day.date.getDay()]}
                        </Text>
                        <View style={[
                            styles.circle,
                            day.completed ? styles.greenCircle : styles.grayCircle,
                            day.isToday && !day.completed && styles.todayCircle
                        ]}>
                            {day.completed && (
                                <MaterialCommunityIcons name="check" size={14} color="white" />
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#F7F7F7',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#E5E5E5'
    },
    title: {
        fontSize: 12,
        fontWeight: '900',
        color: '#CECECE',
        marginBottom: 10,
        letterSpacing: 1
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    dayCol: {
        alignItems: 'center',
        gap: 6
    },
    dayLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#CECECE'
    },
    todayLabel: {
        color: '#58CC02'
    },
    circle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    greenCircle: {
        backgroundColor: '#58CC02'
    },
    grayCircle: {
        backgroundColor: '#E5E5E5'
    },
    todayCircle: {
        borderWidth: 2,
        borderColor: '#58CC02',
        backgroundColor: 'transparent'
    }
});
