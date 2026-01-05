import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, Alert,
    useWindowDimensions, TouchableOpacity, Modal, TouchableWithoutFeedback,
    Platform, AppState, Vibration, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

import Container from '../components/ui/Container';
import NudgeModal from '../components/ui/NudgeModal';
import StatusCard from '../components/game/StatusCard';
import ChallengeOfTheDay from '../components/game/ChallengeOfTheDay';
import ProfileModal from '../components/ui/ProfileModal';
import JourneyMap from '../components/game/JourneyMap';
import ZippyMascot from '../components/game/ZippyMascot';
import OnboardingScreen from './OnboardingScreen';
import TutorialScreen from './TutorialScreen';

export default function DashboardScreen({ session }: { session: any }) {
    const { width } = useWindowDimensions();
    const isWide = width > 768;
    const appState = useRef(AppState.currentState);

    const [loading, setLoading] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [initialToken, setInitialToken] = useState<string | null>(null);
    const [hasTeam, setHasTeam] = useState<boolean | null>(null);
    const [tutorialVisible, setTutorialVisible] = useState(false);

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
        code: '????',
        nudge_at: null as string | null,
        member_count: 2 // Default to 2 so we don't show warning while loading
    });

    // REFRESHED LOGIC: This only shows SAFE if the partner is truly READY

    const [challengeText, setChallengeText] = useState("Loading challenge...");

    // --- DEBUG MENU STATE ---
    const [devMenuVisible, setDevMenuVisible] = useState(false);
    const [debugStatus, setDebugStatus] = useState<'SAFE' | 'AT_RISK' | 'SLEEPING' | null>(null);
    const lastTap = useRef(0);
    const tapCount = useRef(0);

    const handleDebugTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 500) {
            tapCount.current += 1;
        } else {
            tapCount.current = 1;
        }
        lastTap.current = now;

        if (tapCount.current === 3) {
            setDevMenuVisible(true);
            tapCount.current = 0;
            Vibration.vibrate(50);
        }
    };

    const getFreshToken = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        return currentSession?.access_token || null;
    };

    const isFetching = useRef(false);

    const fetchData = useCallback(async (silent = false) => {
        if (isFetching.current) return;
        isFetching.current = true;

        if (!silent) {
            setLoading(true);
            // DON'T Reset to AT_RISK here - causes flicker!
            // setData(prev => ({ ...prev, partner_completed_today: false, status: 'AT_RISK' }));
        }

        try {
            const token = await getFreshToken();
            if (token) {
                setInitialToken(token);

                // Parallel Fetching
                const [dashboardRes, historyRes, challengeRes] = await Promise.all([
                    api.getDashboard(token),
                    api.getHistory(token),
                    api.getChallenge(token)
                ]);

                if (dashboardRes) {

                    // --- HANDLE DELETED USER / EXPIRED SESSION ---
                    if (dashboardRes.error === 'AUTH_ERROR') {
                        console.log("🚨 Auth Error detected in Dashboard. Signing out...");
                        await supabase.auth.signOut();
                        // Layout/_layout should handle the redirect to index
                        return;
                    }

                    setHasTeam(dashboardRes.has_team);

                    // Check for Tutorial
                    if (dashboardRes.has_team) {
                        const hasSeen = await AsyncStorage.getItem('tutorial_seen');
                        if (!hasSeen) setTutorialVisible(true);
                    }

                    // Merge new data but preserve nudge logic for a moment to calculate correctness
                    const newData = { ...dashboardRes };
                    setData(newData);

                    // --- PERSISTENT NUDGE LOGIC ---
                    if (dashboardRes.nudge_active && dashboardRes.nudge_at) {
                        const lastDismissed = await AsyncStorage.getItem('last_dismissed_nudge');
                        // Show ONLY if the timestamp differs exactly (so a new nudge has a new time)
                        // Also, ensure we haven't dismissed it in this session
                        if (lastDismissed !== dashboardRes.nudge_at) {
                            setNudgeActive(true);
                        } else {
                            setNudgeActive(false);
                        }
                    } else {
                        setNudgeActive(false);
                    }
                }
                if (historyRes) setHistory(historyRes);
                if (challengeRes) setChallengeText(challengeRes);
            }
        } catch (err) {
            // console.warn("Fetch error:", err);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
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
            if (!isFetching.current) {
                console.log("⏱️ Polling Dashboard...");
                fetchData(true);
            } else {
                console.log("⏳ Skipping poll (busy)...");
            }
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

    if (hasTeam === null) {
        return (
            <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#58CC02" />
                <Text style={{ marginTop: 20, color: '#B0B0B0', fontWeight: 'bold' }}>Loading ZippyFit...</Text>
            </Container>
        );
    }

    if (hasTeam === false && initialToken) {
        return <OnboardingScreen token={initialToken} onSuccess={() => fetchData()} />;
    }

    if (tutorialVisible) {
        return <TutorialScreen onComplete={async () => {
            setTutorialVisible(false);
            await AsyncStorage.setItem('tutorial_seen', 'true');
        }} />;
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
                    <TouchableOpacity activeOpacity={1} onPress={handleDebugTap}>
                        <Text style={styles.headerTitle}>SHARED FATE</Text>
                    </TouchableOpacity>
                    <View style={styles.statPill}>
                        <Text style={[styles.statText, { color: '#FF9600' }]}>{data.streak} 🔥</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchData(false)} />}
                >
                    <View style={styles.topInfoRow}>
                        {/* Note: Code widget moved to Profile */}
                        {data.member_count < 2 ? (
                            <TouchableOpacity
                                style={[styles.pillContainer, { borderColor: '#FF9600', backgroundColor: '#FFF5E5' }]}
                                onPress={() => setShowProfile(true)}
                            >
                                <Text style={[styles.pillLabel, { color: '#FF9600' }]}>WAITING FOR PARTNER</Text>
                                <Text style={[styles.pillValue, { color: '#FF9600', fontSize: 13 }]}>TAP TO INVITE ✉️</Text>
                            </TouchableOpacity>
                        ) : (
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
                        )}
                    </View>

                    <View style={styles.mainContentRow}>
                        <View style={styles.contentColumn}>


                            {/* 1. THE HOST (Zippy) */}
                            <ZippyMascot
                                status={
                                    debugStatus || (
                                        data.status === 'SAFE' ? 'SAFE' :
                                            (data.user_completed_today ? 'SLEEPING' : 'AT_RISK')
                                    )
                                }
                            />

                            {/* 2. THE MISSION (Challenge) - Moved to Top */}
                            <ChallengeOfTheDay
                                challengeText={challengeText}
                                onComplete={handleWorkout}
                                isCompleted={data.user_completed_today}
                            />

                            {/* 3. THE PATH (Journal) */}
                            <JourneyMap history={history} />

                            {/* 4. THE STATUS (Details) */}
                            <StatusCard status={data.status} />
                        </View>
                    </View>
                </ScrollView>
            </View >
            {!isWide && <View style={styles.bottomBar}><NavItems /></View>
            }

            <ProfileModal
                visible={showProfile}
                onClose={() => setShowProfile(false)}
                session={session}
                code={data.code}
            />

            <NudgeModal
                visible={nudgeActive && !nudgeDismissed}
                onDismiss={async () => {
                    setNudgeDismissed(true);
                    if (data.nudge_at) {
                        await AsyncStorage.setItem('last_dismissed_nudge', data.nudge_at);
                    }
                }}
            />

            {/* DEBUG MENU MODAL */}
            <Modal transparent visible={devMenuVisible} animationType="slide">
                <View style={styles.debugOverlay}>
                    <View style={styles.debugCard}>
                        <Text style={styles.debugTitle}>🛠️ DEV MENU</Text>
                        <Text style={styles.debugSubtitle}>Force Mascot State:</Text>

                        <View style={styles.debugRow}>
                            <TouchableOpacity style={[styles.debugBtn, { backgroundColor: '#58CC02' }]} onPress={() => setDebugStatus('SAFE')}>
                                <Text style={styles.debugBtnText}>SAFE (Happy)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.debugBtn, { backgroundColor: '#FF4B4B' }]} onPress={() => setDebugStatus('AT_RISK')}>
                                <Text style={styles.debugBtnText}>RISK (Sad)</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.debugRow}>
                            <TouchableOpacity style={[styles.debugBtn, { backgroundColor: '#808080' }]} onPress={() => setDebugStatus('SLEEPING')}>
                                <Text style={styles.debugBtnText}>SLEEP (Sleepy)</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.debugBtn, { backgroundColor: '#333', marginTop: 15 }]} onPress={() => setDebugStatus(null)}>
                            <Text style={styles.debugBtnText}>RESET (Real API Data)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.debugBtn, { backgroundColor: 'transparent', marginTop: 10 }]} onPress={() => setDevMenuVisible(false)}>
                            <Text style={[styles.debugBtnText, { color: '#888' }]}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Container >
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        // Transparent background so the gradient shows through at top or use explicit white with shadow
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderBottomWidth: 0,
    },
    headerTitle: { fontWeight: '900', color: '#B0B0B0', fontSize: 13, letterSpacing: 3 },
    statPill: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 24, fontWeight: '900', marginLeft: 5 },
    scrollContent: { padding: 16, paddingBottom: 110 },
    mainContentRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, width: '100%' },
    contentColumn: { flex: 1, maxWidth: 380 },
    activeZone: {
        height: '100%',
        padding: 16,
        // Solid Style (Clean White)
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    todayText: { fontWeight: '900', fontSize: 18, color: '#4B4B4B', marginBottom: 10 },
    topInfoRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 },

    // Floating Pills (Solid)
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff', // Pure white
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        gap: 8,
        // Soft Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    pillLabel: { color: '#B0B0B0', fontWeight: 'bold', fontSize: 12 },
    pillValue: { color: '#58CC02', fontWeight: '900', fontSize: 15 },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        flexDirection: 'row',
        height: 80,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 20
    },
    tabItem: { flex: 1, alignItems: 'center' },
    sidebar: { width: 240, borderRightWidth: 1, borderRightColor: '#F0F0F0', padding: 24, backgroundColor: '#fff' },
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
    nudgeText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

    // Debug Menu Styles
    debugOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    debugCard: { width: 300, backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
    debugTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
    debugSubtitle: { fontSize: 14, color: '#888', marginBottom: 15 },
    debugRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    debugBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    debugBtnText: { color: 'white', fontWeight: 'bold' }
});
