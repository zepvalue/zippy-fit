import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, Alert,
    useWindowDimensions, TouchableOpacity, Modal, TouchableWithoutFeedback,
    Platform, AppState, Vibration
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

// Configure Notifications
if (Platform.OS !== 'web') {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true
            }),
        });
    } catch (error) {
        console.warn("Could not set notification handler (likely Expo Go limitation):", error);
    }
}

import DuoButton from '../components/ui/DuoButton';
import Container from '../components/ui/Container';
import NudgeModal from '../components/ui/NudgeModal';
import StatusCard from '../components/game/StatusCard';
import ChallengeOfTheDay from '../components/game/ChallengeOfTheDay';
import ProfileModal from '../components/ui/ProfileModal';
import HistoryCalendar from '../components/game/HistoryCalendar';
import OnboardingScreen from './OnboardingScreen';

export default function DashboardScreen({ session }: { session: any }) {
    const { width } = useWindowDimensions();
    const isWide = width > 768;
    const appState = useRef(AppState.currentState);

    const [loading, setLoading] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [initialToken, setInitialToken] = useState<string | null>(null);
    const [hasTeam, setHasTeam] = useState<boolean | null>(null);

    const [history, setHistory] = useState<string[]>([]);
    const [nudgeActive, setNudgeActive] = useState(false);
    const [nudgeDismissed, setNudgeDismissed] = useState(false);
    const notificationSent = useRef(false);

    const [data, setData] = useState({
        team_id: null as string | null,
        hearts: 0,
        streak: 0,
        status: 'AT_RISK' as 'SAFE' | 'AT_RISK',
        user_completed_today: false,
        partner_completed_today: false,
        code: '????'
    });

    useEffect(() => {
        if (Platform.OS !== 'web') {
            (async () => {
                try {
                    const { status } = await Notifications.requestPermissionsAsync();
                    console.log("🔔 Notification Permission Status:", status);
                    if (status === 'denied') {
                        console.log("⚠️ Notifications are denied—only In-App Nudge Modal will work.");
                    }
                } catch (error) {
                    console.warn("Could not request permissions (likely Expo Go limitation):", error);
                }
            })();
        }
    }, []);

    // REFRESHED LOGIC: This only shows SAFE if the partner is truly READY

    const getFreshToken = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        return currentSession?.access_token || null;
    };

    const fetchData = useCallback(async (silent = false) => {
        // If it's not a background refresh, clear the old "SAFE" status
        // so the user sees it "thinking"
        if (!silent) {
            setLoading(true);
            setData(prev => ({ ...prev, partner_completed_today: false, status: 'AT_RISK' }));
        }

        const token = await getFreshToken();
        if (token) {
            const result = await api.getDashboard(token);
            if (result) {
                setData({ ...result }); // Overwrite with truth from server
                console.log("DEBUG: Nudge Active from server:", result.nudge_active);
                setNudgeActive(!!result.nudge_active);

                if (result.nudge_active) {
                    if (!notificationSent.current) {
                        if (Platform.OS !== 'web') {
                            try {
                                await Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: "PARTNER SAYS: GET MOVING! 🏃‍♂️",
                                        body: "Your partner is waiting for you to complete your workout!",
                                        sound: true,
                                    },
                                    trigger: null,
                                });
                            } catch (error) {
                                console.warn("Notification failed (likely Expo Go restriction):", error);
                            }
                        }
                        notificationSent.current = true;
                    }
                } else {
                    setNudgeDismissed(false);
                    notificationSent.current = false;
                }
            }
            const hist = await api.getHistory(token);
            if (hist) setHistory(hist);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                fetchData(true);
            }
            appState.current = nextAppState;
        });
        const handleWebFocus = () => { if (Platform.OS === 'web') fetchData(true); };
        if (Platform.OS === 'web') window.addEventListener('focus', handleWebFocus);

        // POLL EVERY 5 SECONDS (for faster testing)
        const timer = setInterval(() => {
            console.log("⏱️ Polling Dashboard...");
            fetchData(true);
        }, 5000);

        return () => {
            subscription.remove();
            if (Platform.OS === 'web') window.removeEventListener('focus', handleWebFocus);
            clearInterval(timer);
        };
    }, [fetchData]);

    async function handleWorkout() {
        const token = await getFreshToken();
        if (!token) return;
        setData(prev => ({ ...prev, user_completed_today: true }));
        const res = await api.logWorkout(token);
        if (res?.status === "success") {
            fetchData(true);
        } else {
            setData(prev => ({ ...prev, user_completed_today: false }));
            showAlert("Error", "Workout not logged.");
        }
    }

    const showAlert = (title: string, msg: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${msg}`);
        } else {
            Alert.alert(title, msg);
        }
    };

    async function handleNudge() {
        const token = await getFreshToken();
        if (!token) return;

        console.log("🔔 User requested Nudge...");
        showAlert("Nudge Sent!", "Your partner has been notified to get moving! 🔔");

        const success = await api.sendNudge(token);
        console.log("🔔 Nudge API Result:", success);
    }

    if (hasTeam === false && initialToken) {
        return <OnboardingScreen token={initialToken} onSuccess={() => fetchData()} />;
    }

    const NavItems = () => (
        <>
            <TouchableOpacity style={isWide ? styles.sidebarItem : styles.tabItem}>
                <MaterialCommunityIcons name="home" size={isWide ? 28 : 32} color="#58CC02" />
                {isWide && <Text style={styles.sidebarText}>HOME</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={isWide ? styles.sidebarItem : styles.tabItem} onPress={() => setShowProfile(true)}>
                <MaterialCommunityIcons name="account" size={isWide ? 28 : 32} color="#CECECE" />
                {isWide && <Text style={styles.sidebarText}>PROFILE</Text>}
            </TouchableOpacity>
        </>
    );

    return (
        <Container style={{ flexDirection: isWide ? 'row' : 'column', paddingHorizontal: 0 }}>
            {isWide && (
                <View style={styles.sidebar}>
                    <Text style={styles.sidebarLogo}>ZippyFit</Text>
                    <NavItems />
                </View>
            )}

            <View style={{ flex: 1, maxWidth: isWide ? 800 : '100%' }}>
                <View style={styles.header}>
                    <View style={styles.statPill}>
                        <MaterialCommunityIcons name="heart" size={24} color="#FF4B4B" />
                        <Text style={[styles.statText, { color: '#FF4B4B' }]}> {data.hearts}</Text>
                    </View>
                    <Text style={styles.headerTitle}>SHARED FATE</Text>
                    <View style={styles.statPill}>
                        <Text style={[styles.statText, { color: '#FF9600' }]}>{data.streak} 🔥</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchData(false)} />}
                >
                    <View style={styles.topInfoRow}>
                        <View style={styles.pillContainer}>
                            <Text style={styles.pillLabel}>CODE:</Text>
                            <Text style={styles.pillValue}>{data.code}</Text>
                        </View>
                        <View style={[styles.pillContainer, { borderColor: data.partner_completed_today ? '#58CC02' : '#E5E5E5' }]}>
                            <Text style={styles.pillLabel}>PARTNER:</Text>
                            <Text style={[styles.pillValue, { color: data.partner_completed_today ? '#58CC02' : '#CECECE' }]}>
                                {data.partner_completed_today ? "READY ✅" : "SLEEPING 😴"}
                            </Text>
                            {!data.partner_completed_today && (
                                <TouchableOpacity onPress={handleNudge} style={{ marginLeft: 5 }}>
                                    <MaterialCommunityIcons name="bell-ring" size={18} color="#FF9600" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.mainContentRow}>
                        <View style={styles.contentColumn}>

                            {/* Debug Button Removed */}

                            {/* Nudge Banner Removed - using Modal instead */}

                            <StatusCard status={data.status} />

                            <HistoryCalendar history={history} />

                            <ChallengeOfTheDay
                                onComplete={handleWorkout}
                                isCompleted={data.user_completed_today}
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
            {!isWide && <View style={styles.bottomBar}><NavItems /></View>}

            <ProfileModal
                visible={showProfile}
                onClose={() => setShowProfile(false)}
                session={session}
            />

            <NudgeModal
                visible={nudgeActive && !nudgeDismissed}
                onDismiss={() => setNudgeDismissed(true)}
            />
        </Container>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 2, borderBottomColor: '#F0F0F0', backgroundColor: '#fff' },
    headerTitle: { fontWeight: '900', color: '#CECECE', fontSize: 14, letterSpacing: 2 },
    statPill: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 20, fontWeight: 'bold', marginLeft: 5 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    mainContentRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, width: '100%' },
    contentColumn: { flex: 1, maxWidth: 380 },
    activeZone: { height: '100%', padding: 20, backgroundColor: 'white', borderRadius: 24, borderWidth: 2, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' },
    todayText: { fontWeight: '900', fontSize: 18, color: '#4B4B4B', marginBottom: 15 },
    topInfoRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
    pillContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F7', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, borderWidth: 2, borderColor: '#E5E5E5', gap: 8 },
    pillLabel: { color: '#CECECE', fontWeight: 'bold', fontSize: 12 },
    pillValue: { color: '#58CC02', fontWeight: '900', fontSize: 14 },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', height: 75, backgroundColor: 'white', borderTopWidth: 2, borderTopColor: '#F0F0F0', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 15 },
    tabItem: { flex: 1, alignItems: 'center' },
    sidebar: { width: 240, borderRightWidth: 2, borderRightColor: '#F0F0F0', padding: 24, backgroundColor: '#fff' },
    sidebarLogo: { fontSize: 22, fontWeight: '900', color: '#58CC02', marginBottom: 40 },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
    sidebarText: { fontSize: 16, fontWeight: 'bold', color: '#777', marginLeft: 15 },
    nudgeBanner: {
        backgroundColor: '#FF9600',
        padding: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 8
    },
    nudgeText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});