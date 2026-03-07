import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Platform, Alert, Image, Modal, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
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
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from "@convex-dev/auth/react";

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { signOut } = useAuthActions();

    // CONVEX QUERIES (Reactive!)
    const dashboardData = useQuery(api.dashboard.get);
    const challenge = useQuery(api.challenges.get);
    const history = useQuery(api.workouts.history) || [];

    // CONVEX MUTATIONS
    const logWorkout = useMutation(api.workouts.log);
    const sendNudge = useMutation(api.teams.nudge);

    // LOCAL STATE
    const [profileVisible, setProfileVisible] = useState(false);
    const [debugVisible, setDebugVisible] = useState(false);
    const [tutorialVisible, setTutorialVisible] = useState(false);
    const [scrollVisible, setScrollVisible] = useState(false);
    const [unlockedFact, setUnlockedFact] = useState<{ title: string; text: string } | null>(null);
    const [grimoireVisible, setGrimoireVisible] = useState(false);

    useEffect(() => {
        checkTutorial();
    }, []);

    const checkTutorial = async () => {
        const done = await AsyncStorage.getItem('tutorial_completed');
        if (done !== 'true') {
            setTutorialVisible(true);
        }
    };

    // Derived State from Convex Data
    const isLoading = dashboardData === undefined;

    // Safely extract data
    const hasTeam = dashboardData?.has_team || false;
    const teamId = dashboardData?.team_id;
    const teamName = dashboardData?.team_name || "Loading...";
    const teamCode = dashboardData?.code || "...";
    const memberCount = dashboardData?.member_count || 1;
    const hearts = dashboardData?.hearts || 3;
    const streak = dashboardData?.streak || 0;
    const freezes = dashboardData?.freezes_available || 0;
    const status = dashboardData?.status || "AT_RISK";
    const userDone = dashboardData?.user_completed_today || false;
    const partnerDone = dashboardData?.partner_completed_today || false;
    const challengeData = challenge || { text: "Loading...", base_count: 0, unit: "" };

    const handleComplete = async () => {
        console.log("🟢 HandleComplete Triggered in Dashboard!");
        try {
            // Optimistic updates are handled by Convex automatically!
            // But we might want to show a spinner if it's slow.

            const damage = 500;
            const res = await logWorkout({ damage, duration_minutes: 30 });
            console.log("🟢 API Response for Workout:", JSON.stringify(res));

            if (res.new_fact_id) {
                // Fetch the fact text? 
                // The mutation returns ID. We need the text.
                // Ideally mutation returns the fact object. UseQuery for grimoire will update.
                // For now, let's just say "New Fact Unlocked" and let them check Grimoire, 
                // OR fetch grimoire and find it.
                // Simpler: Just show "Check Grimoire!"
                console.log("📜 New Fact unlocked!");
                setUnlockedFact({ title: "New Knowledge!", text: "Check your grimoire to see what you learned." });
                setTimeout(() => setScrollVisible(true), 1000);
            }
        } catch (e: any) {
            console.error("Error logging workout", e);
            Alert.alert("Error", e.message);
        }
    };

    const getMascotStatus = () => {
        if (status === 'SAFE') return 'SAFE';
        if (userDone && status !== 'SAFE') return 'SLEEPING';
        return status as 'SAFE' | 'AT_RISK' | 'SLEEPING';
    };

    // NUDGE LOGIC
    const handleNudge = async () => {
        if (!hasTeam) {
            Alert.alert("Solo Mode", "You need a partner to nudge!");
            return;
        }
        if (partnerDone) {
            Alert.alert("Already Done!", "Your partner has already finished their workout. Give them a high five instead!");
            return;
        }

        Alert.alert(
            "Send Nudge?",
            "Wake up your partner with a notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "NUDGE!",
                    onPress: async () => {
                        try {
                            await sendNudge({});
                            Alert.alert("Sent!", "Your partner has been nudged.");
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
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
                source={require('../assets/images/fitness_bg.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <StatusBar style="dark" translucent={true} backgroundColor="transparent" />

                {/* LAYER 0: GAME WORLD (Background - Fullscreen) */}
                <Animated.View style={[styles.mapContainer, rMapStyle]}>
                    <JourneyMap
                        history={history.map(h => h.date)}
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
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        {/* SINGLE MEGA PILL: Grimoire | Team | Stats | Settings */}
                        <View style={styles.megaPill}>
                            {/* 1. Grimoire (Left) */}
                            <TouchableOpacity
                                onPress={() => { setGrimoireVisible(true); setProfileVisible(false); }}
                                activeOpacity={0.7}
                                style={{ paddingHorizontal: 4 }}
                            >
                                <MaterialCommunityIcons name="script-text-outline" size={20} color="#1F2937" />
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={{ width: 1, height: 16, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />

                            {/* 2. Team Widget (Center) */}
                            {hasTeam && (
                                <>
                                    <View style={styles.miniAvatarRow}>
                                        <View style={[styles.miniAvatarCircle, userDone ? styles.avatarDone : styles.avatarNotReady]}>
                                            <MaterialCommunityIcons name="account" size={16} color={userDone ? "#059669" : "#9CA3AF"} />
                                        </View>
                                        <View style={[styles.miniConnector, { backgroundColor: (userDone && partnerDone) ? '#10B981' : '#E5E7EB' }]} />
                                        <TouchableOpacity
                                            onPress={handleNudge}
                                            activeOpacity={0.7}
                                            style={[styles.miniAvatarCircle, partnerDone ? styles.avatarDone : styles.avatarNotReady]}
                                        >
                                            <MaterialCommunityIcons
                                                name={partnerDone ? "check" : "bell-ring"}
                                                size={partnerDone ? 16 : 14}
                                                color={partnerDone ? "#059669" : (status === 'SAFE' ? '#9CA3AF' : '#F97316')}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {/* Divider */}
                                    <View style={{ width: 1, height: 16, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />
                                </>
                            )}

                            {/* 3. Stats */}
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialCommunityIcons name="heart" size={14} color="#EF4444" />
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>{hearts}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialCommunityIcons name="fire" size={14} color="#F97316" />
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>{streak}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialCommunityIcons name="snowflake" size={14} color="#3B82F6" />
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>{freezes}</Text>
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={{ width: 1, height: 16, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />

                            {/* 4. Settings (Right) */}
                            <TouchableOpacity
                                onPress={() => { setProfileVisible(true); setGrimoireVisible(false); }}
                                activeOpacity={0.7}
                                style={{ paddingHorizontal: 4 }}
                            >
                                <MaterialCommunityIcons name="cog" size={20} color="#1F2937" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* TEAM AVATARS ROW (Moved to Top) */}

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
                />

                <DebugMenu
                    visible={debugVisible}
                    onClose={() => setDebugVisible(false)}
                    onReset={async () => {
                        await AsyncStorage.clear();
                        await signOut();
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
        </GestureHandlerRootView >
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
    // REMOVED unused superPill and large avatar styles
    megaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        height: 52
    },
    // MINI WIDGET STYLES
    miniAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    miniAvatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        backgroundColor: 'rgba(255,255,255,0.8)'
    },
    miniConnector: {
        width: 16,
        height: 3,
        borderRadius: 1.5
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
