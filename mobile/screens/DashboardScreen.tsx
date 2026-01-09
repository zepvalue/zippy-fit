import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Platform, Alert, Image, Modal, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate, runOnJS, withTiming } from 'react-native-reanimated';
import JourneyMap from '../components/game/JourneyMap';
import ProfileModal from '../components/ui/ProfileModal';
import DebugMenu from '../components/game/DebugMenu';
import TutorialScreen from '../screens/TutorialScreen';
import GrimoireModal from '../components/game/GrimoireModal';
import ChallengeDrawer from '../components/game/ChallengeDrawer';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const insets = useSafeAreaInsets(); // Moved up: Must be before conditional returns
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // DASHBOARD STATE
    const [teamId, setTeamId] = useState<string | null>(null);
    const [teamName, setTeamName] = useState("Loading...");
    const [teamCode, setTeamCode] = useState("...");
    const [memberCount, setMemberCount] = useState(1);
    const [hearts, setHearts] = useState(3);
    const [streak, setStreak] = useState(0);
    const [freezes, setFreezes] = useState(0);
    const [status, setStatus] = useState("AT_RISK");
    const [userDone, setUserDone] = useState(false);
    const [partnerDone, setPartnerDone] = useState(false);
    const [teamCompletionCount, setTeamCompletionCount] = useState(0);
    const [history, setHistory] = useState<string[]>([]);

    const [hasTeam, setHasTeam] = useState<boolean | null>(null);
    const [challengeData, setChallengeData] = useState({ text: "Loading...", base_count: 0, unit: "" });

    // BOSS STATE
    const [bossData, setBossData] = useState({
        hp: 10000,
        maxHp: 10000,
        name: "The Sloth King",
        imageIndex: 0
    });

    // MODAL STATE
    const [profileVisible, setProfileVisible] = useState(false);
    const [debugVisible, setDebugVisible] = useState(false);
    const [tutorialVisible, setTutorialVisible] = useState(false);

    // SECRET SCROLL STATE
    const [scrollVisible, setScrollVisible] = useState(false);
    const [unlockedFact, setUnlockedFact] = useState<{ title: string; text: string } | null>(null);
    const [grimoireVisible, setGrimoireVisible] = useState(false);

    // AUTH STATE
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        checkTutorial();
        fetchData();
        fetchSession();
    }, []);

    const fetchSession = async () => {
        try {
            if (!supabase) {
                console.error("❌ Supabase object is undefined!");
                return;
            }
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
        } catch (e) {
            console.error("❌ Error fetching session:", e);
        }
    };

    const checkTutorial = async () => {
        const done = await AsyncStorage.getItem('tutorial_completed');
        if (done !== 'true') {
            setTutorialVisible(true);
        }
    };

    const handleAuthError = async () => {
        console.log("🚨 Auth Error detected! Logging out...");
        await AsyncStorage.removeItem('userToken');
        await supabase.auth.signOut();
        router.replace('/');
    };

    const fetchData = async () => {
        try {
            let token = await AsyncStorage.getItem('userToken');

            // SELF-HEAL: If no local token, but checking Supabase might help?
            if (!token) {
                const { data } = await supabase.auth.getSession();
                if (data.session?.access_token) {
                    console.log("DEBUG: Recovered token from Supabase Session");
                    token = data.session.access_token;
                    await AsyncStorage.setItem('userToken', token);
                } else {
                    console.log("DEBUG: No token. Stopping fetch.");
                    // Force logout if no token available at all on dashboard load?
                    // Maybe, or just stay here. Logic above implies silent fail.
                    // Let's rely on api call failing.
                    router.replace('/'); // Redirect if absolutely no token
                    return;
                }
            }

            const data = await api.getDashboard(token);

            if (data?.error === 'AUTH_ERROR') {
                await handleAuthError();
                return;
            }

            if (data) {
                setHasTeam(data.has_team);
                if (data.has_team) {
                    setTeamId(data.team_id);
                    setTeamName(data.team_name);
                    setTeamCode(data.code);
                    setMemberCount(data.member_count);
                    setTeamCompletionCount(data.team_completion_count);
                    setHearts(data.hearts);
                    setStreak(data.streak);
                    setFreezes(data.freezes_available);
                    setStatus(data.status);
                    // Only update if not optimistically set
                    // actually, server is truth, allow overwrite
                    setUserDone(data.user_completed_today);
                    setPartnerDone(data.partner_completed_today);

                    setBossData({
                        hp: data.boss_hp ?? 10000,
                        maxHp: data.boss_max_hp ?? 10000,
                        name: data.boss_name || "The Sloth King",
                        imageIndex: data.boss_image_index ?? 0
                    });
                } else {
                    setTeamCode("NO TEAM");
                }
            }

            const chal = await api.getChallenge(token);
            if (chal) setChallengeData(chal);

            const hist = await api.getHistory(token);
            if (hist) setHistory(hist);
        } catch (error) {
            console.log("Error fetching data:", error);
        } finally {
            setRefreshing(false);
            setIsLoading(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleComplete = async () => {
        console.log("🟢 HandleComplete Triggered in Dashboard!");
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            console.log("🟢 Token found, sending API request...");
            setUserDone(true); // Optimistic update

            // Force re-render to show spinner or something? 
            // setRefreshing(true); // Maybe not, might be jarring.

            setTeamCompletionCount(prev => prev + 1);

            const damage = 500;
            console.log(`🟢 Logging workout with damage: ${damage}`);
            const res = await api.logWorkout(token, damage);
            console.log("🟢 API Response for Workout:", JSON.stringify(res));

            if (res.status === 'success' || res.status === 'logged' || res.status === 'streak_incremented') {
                console.log("🟢 Success! Refreshing data...");
                fetchData();

                if (res.new_fact) {
                    console.log("📜 New Fact unlocked!");
                    setUnlockedFact(res.new_fact);
                    setTimeout(() => setScrollVisible(true), 1000);
                }
            } else {
                console.log("🔴 API returned non-success status:", res.status);
            }
        } else {
            console.log("🔴 No User Token found in AsyncStorage!");
        }
    };

    const getMascotStatus = () => {
        if (status === 'SAFE') return 'SAFE';
        if (userDone && status !== 'SAFE') return 'SLEEPING';
        return status as 'SAFE' | 'AT_RISK' | 'SLEEPING';
    };

    // --- ANIMATIONS & GESTURES ---
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen to match style
    const PEEK_HEIGHT = 280; // Height visible when collapsed (approx 250px content + padding)
    const MAX_TRANSLATE_Y = SHEET_HEIGHT - PEEK_HEIGHT;

    // 0 = Expanded (Top), 1 = Collapsed (Bottom)
    // Actually let's do: 0 = Expanded, MAX = Collapsed.
    // context: translateY
    const translateY = useSharedValue(MAX_TRANSLATE_Y); // Default to Collapsed (Peek)
    const context = useSharedValue({ y: 0 });

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(0, Math.min(MAX_TRANSLATE_Y, context.value.y + event.translationY));
        })
        .onEnd((event) => {
            // Snap Logic
            if (event.velocityY > 500 || translateY.value > MAX_TRANSLATE_Y / 2) {
                // Snap to Bottom (Collapsed)
                translateY.value = withSpring(MAX_TRANSLATE_Y, { damping: 25, stiffness: 120 });
            } else {
                // Snap to Top (Expanded)
                translateY.value = withSpring(0, { damping: 25, stiffness: 120 });
            }
        });

    // Reactive Map Styles
    // When translateY is 0 (Expanded) -> Scale is 0.85
    // When translateY is MAX (Collapsed) -> Scale is 1.0
    const rMapStyle = useAnimatedStyle(() => {
        const scale = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [0.85, 1.0], Extrapolate.CLAMP);
        const mapTranslateY = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [-50, 0], Extrapolate.CLAMP);
        return {
            transform: [{ scale }, { translateY: mapTranslateY }]
        };
    });

    const rSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }]
        };
    });

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    // const insets = useSafeAreaInsets(); // Removed (moved to top)

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ImageBackground
                source={require('../assets/images/fitness_bg.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <StatusBar style="dark" translucent={true} backgroundColor="transparent" />

                {/* LAYER 0: GAME WORLD (Background - Fullscreen) */}
                <Animated.View style={[styles.mapContainer, rMapStyle]}>
                    <JourneyMap
                        history={history}
                        canRequestSpot={false}
                    />
                </Animated.View>

                {/* LAYER 1: HEADER (Gamer HUD) */}
                <View style={{ flex: 1, position: 'relative', pointerEvents: 'box-none' }}>
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        width: '100%',
                        zIndex: 50,
                        paddingTop: insets.top + 10,
                        paddingHorizontal: 20,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        {/* LEFT: Ghost Action (Grimoire) */}
                        <TouchableOpacity
                            onPress={() => { setGrimoireVisible(true); setProfileVisible(false); }}
                            style={styles.ghostButton}
                        >
                            <MaterialCommunityIcons name="script-text-outline" size={32} color="#1F2937" />
                        </TouchableOpacity>

                        {/* RIGHT: Super Pill (Avatar + Stats) */}
                        <TouchableOpacity
                            onPress={() => { setProfileVisible(true); setGrimoireVisible(false); }}
                            style={styles.superPill}
                            activeOpacity={0.9}
                        >
                            {/* Avatar (Gear) */}
                            <View style={[styles.superPillAvatarContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEE' }]}>
                                <MaterialCommunityIcons name="cog" size={24} color="#1F2937" />
                            </View>

                            {/* Stats */}
                            <View style={styles.superPillStatsRow}>
                                <View style={styles.superPillStatItem}>
                                    <MaterialCommunityIcons name="heart" size={16} color="#EF4444" />
                                    <Text style={styles.superPillStatText}>{hearts}</Text>
                                </View>
                                <View style={styles.superPillStatItem}>
                                    <MaterialCommunityIcons name="fire" size={16} color="#F97316" />
                                    <Text style={styles.superPillStatText}>{streak}</Text>
                                </View>
                                <View style={styles.superPillStatItem}>
                                    <MaterialCommunityIcons name="snowflake" size={16} color="#3B82F6" />
                                    <Text style={styles.superPillStatText}>{freezes}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* LAYER 2: DRAWER (Foreground) */}
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.drawerSheet, rSheetStyle]}>
                        <ChallengeDrawer
                            challengeData={challengeData}
                            onComplete={handleComplete}
                            isCompleted={userDone}
                            mascotStatus={getMascotStatus()}
                        />
                    </Animated.View>
                </GestureDetector>

                <ProfileModal
                    visible={profileVisible}
                    onClose={() => setProfileVisible(false)}
                    code={teamCode}
                    onDebug={() => setDebugVisible(true)}
                    onReplayTutorial={() => setTutorialVisible(true)}
                    session={session}
                />

                <DebugMenu
                    visible={debugVisible}
                    onClose={() => setDebugVisible(false)}
                    onReset={async () => {
                        await AsyncStorage.clear();
                        await supabase.auth.signOut();
                        router.replace('/');
                    }}
                    token=""
                />

                {/* TUTORIAL MODAL */}
                <Modal visible={tutorialVisible} animationType="slide">
                    <TutorialScreen onComplete={async () => {
                        await AsyncStorage.setItem('tutorial_completed', 'true');
                        setTutorialVisible(false);
                    }} />
                </Modal>

                {/* GRIMOIRE MODAL */}
                <GrimoireModal
                    visible={grimoireVisible}
                    onClose={() => setGrimoireVisible(false)}
                />

            </ImageBackground >
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    mapContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        // justifyContent: 'center' // Removed to allow full scroll
    },
    drawerSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        // Height handled by content or minHeight
        // But we need to translate it.
        // Actually, for a bottom sheet, we usually set a high height and translate it down.
        height: Dimensions.get('window').height * 0.9, // 90% screen height
        justifyContent: 'flex-start',
        zIndex: 100,
    },
    // ... kept old styles for modal/header ...
    headerGlass: {
        width: '100%',
        zIndex: 50,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 2,
        width: '100%',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    statText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        marginLeft: 4
    },
    ghostButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    superPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 30,
        paddingLeft: 4, // Space for avatar
        paddingRight: 16, // Space on right
        paddingVertical: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        height: 52
    },
    superPillAvatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        marginRight: 12
    },
    superPillAvatarImage: {
        width: '100%',
        height: '100%'
    },
    superPillStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    superPillStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    superPillStatText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1F2937'
    },
    teamStatusContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    connectorLine: {
        width: 40,
        height: 4,
        borderRadius: 2
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        backgroundColor: '#F3F4F6'
    },
    avatarDone: {
        borderColor: '#10B981',
        backgroundColor: '#D1FAE5'
    },
    avatarNotReady: {
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB'
    },
    avatarLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    // REMOVED old actionSheet and dragHandle styles, replaced by drawerSheet
    actionSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '45%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 20,
        paddingTop: 10,
        alignItems: 'center'
    },
    dragHandle: {
        width: 60,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginBottom: 10,
        marginTop: 5
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#9CA3AF',
        marginBottom: 20,
        letterSpacing: 1
    },
    teamStatusCard: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        marginBottom: 20,
        alignItems: 'center',
        width: '100%',
        maxWidth: 350
    },
    teamStatusText: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    bottomTabBar: {
        position: 'absolute',
        bottom: 30,
        width: '80%',
        alignSelf: 'center',
        flexDirection: 'row',
        borderRadius: 40,
        overflow: 'hidden',
        borderTopWidth: 0,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flex: 1,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280'
    }
});
