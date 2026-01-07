import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Platform, Alert, Image, Modal, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BossWidget from '../components/game/BossWidget';
import ChallengeOfTheDay from '../components/game/ChallengeOfTheDay';
import JourneyMap from '../components/game/JourneyMap';
import ProfileModal from '../components/ui/ProfileModal';
import DebugMenu from '../components/game/DebugMenu';
import TutorialScreen from '../screens/TutorialScreen';
import GrimoireModal from '../components/game/GrimoireModal';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

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
                    return;
                }
            }

            const data = await api.getDashboard(token);

            if (data?.error === 'AUTH_ERROR') {
                // Handle auth error (logout?)
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

    if (hasTeam === false) {
        return <View style={styles.container} />;
    }

    const insets = useSafeAreaInsets(); // Need to add import!

    return (
        <ImageBackground
            source={require('../assets/images/fitness_bg.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.container}>
                <StatusBar style="dark" translucent={true} backgroundColor="transparent" />

                {/* HEADER - Floating Stats (No Bar Background) */}
                <View style={{
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    zIndex: 50,
                    // PRO MOVE: Push it up into the status bar slightly for that flush magazine look
                    paddingTop: Math.max(15, insets.top - 10),
                    alignItems: 'center',
                }}>
                    <View style={styles.statsRow}>
                        <View style={styles.statPill}>
                            <MaterialCommunityIcons name="heart" size={20} color="#EF4444" />
                            <Text style={styles.statText}>{hearts}</Text>
                        </View>
                        <View style={styles.statPill}>
                            <MaterialCommunityIcons name="fire" size={20} color="#F97316" />
                            <Text style={styles.statText}>{streak}</Text>
                        </View>
                        <View style={styles.statPill}>
                            <MaterialCommunityIcons name="snowflake" size={20} color="#3B82F6" />
                            <Text style={styles.statText}>{freezes}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* 1. TEAM STATUS WIDGET (Moved from Header) */}
                <View style={styles.teamStatusCard}>
                    <View style={styles.avatarRow}>
                        {/* 1. YOU */}
                        <View style={[styles.avatarCircle, userDone ? styles.avatarDone : styles.avatarNotReady]}>
                            <Text style={styles.avatarLabel}>YOU</Text>
                            {userDone && (
                                <View style={styles.checkBadge}>
                                    <MaterialCommunityIcons name="check" size={12} color="white" />
                                </View>
                            )}
                        </View>

                        {/* CONNECTOR LINE */}
                        <View style={[styles.connectorLine, (status === 'SAFE') ? { backgroundColor: '#10B981' } : { backgroundColor: '#E5E7EB' }]} />

                        {/* 2. PARTNER(S) */}
                        <View style={[styles.avatarCircle, partnerDone ? styles.avatarDone : styles.avatarNotReady]}>
                            <Text style={styles.avatarLabel}>TEAM</Text>
                            {partnerDone && (
                                <View style={styles.checkBadge}>
                                    <MaterialCommunityIcons name="check" size={12} color="white" />
                                </View>
                            )}
                        </View>
                    </View>
                    <Text style={styles.teamStatusText}>{status === 'SAFE' ? "Streak Safe!" : "Workout Needed!"}</Text>
                </View>

                {/* 2. BOSS BATTLE */}
                <BossWidget
                    hp={bossData.hp}
                    maxHp={bossData.maxHp}
                    name={bossData.name}
                />

                {/* 2. CHALLENGE CARD - QUEST GIVER */}
                <ChallengeOfTheDay
                    challengeText={challengeData.text}
                    onComplete={handleComplete}
                    isCompleted={userDone}
                    mascotStatus={getMascotStatus()}
                />

                {/* 3. JOURNEY MAP */}
                <View style={styles.mapContainer}>
                    <JourneyMap history={history} />
                </View>

            </ScrollView>

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

            {/* BOTTOM TAB BAR */}
            <BlurView intensity={100} tint="light" style={styles.bottomTabBar}>
                <TouchableOpacity onPress={() => { setGrimoireVisible(true); setProfileVisible(false); }} style={styles.tabButton}>
                    <MaterialCommunityIcons
                        name="book-variant"
                        size={28}
                        color={grimoireVisible ? "#10B981" : "#D1D5DB"} // Green if active, Light Grey if inactive
                    />
                    <Text style={[styles.tabLabel, { color: grimoireVisible ? "#10B981" : "#D1D5DB" }]}>Grimoire</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setGrimoireVisible(false); setProfileVisible(false); }} style={styles.tabButton}>
                    <MaterialCommunityIcons
                        name="home"
                        size={32}
                        color={(!grimoireVisible && !profileVisible) ? "#10B981" : "#D1D5DB"}
                    />
                    {/* Optional Label */}
                    {/* <Text style={[styles.tabLabel, { color: (!grimoireVisible && !profileVisible) ? "#10B981" : "#D1D5DB" }]}>Home</Text> */}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setProfileVisible(true); setGrimoireVisible(false); }} style={styles.tabButton}>
                    <MaterialCommunityIcons
                        name="cog"
                        size={28}
                        color={profileVisible ? "#10B981" : "#D1D5DB"}
                    />
                    <Text style={[styles.tabLabel, { color: profileVisible ? "#10B981" : "#D1D5DB" }]}>Profile</Text>
                </TouchableOpacity>
            </BlurView>
        </ImageBackground >
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
        backgroundColor: 'transparent', // Ensure no white bg
        // paddingTop: 0, // Explicitly 0
    },
    headerGlass: {
        width: '100%',
        zIndex: 50,
        // backgroundColor: '#FFFFFF', // REMOVED: Too much white space
        // let BlurView handle the look
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 2, // Minimal bottom padding
        width: '100%',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24, // Consistent spacing between items
        width: '100%',
        justifyContent: 'center', // Center the cluster instead of spreading
        alignItems: 'center'
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 4, // Reduced from 6 to 4 to shave pixels
        borderRadius: 20,
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    statText: {
        fontSize: 16, // Larger text
        fontWeight: 'bold',
        color: '#1F2937'
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 12
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
        color: '#6B7280'
    },
    checkBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#10B981',
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white'
    },
    scrollContent: {
        paddingTop: 60, // Keep some top spacing for Safe Area visual (since we act Translucent) 
        // actually accessing `insets` here in styles is not possible directly unless dynamic style.
        // The View is contentContainerStyle. 
        // Let's assume standard safe area needed. 60 is fine, or maybe 40.
        // Previous value was 60 to clear header. Now we have NO header. 
        // But we have StatusBar translucent. 
        // We should just use a reasonable padding.
        paddingBottom: 100,
        paddingHorizontal: 20,
        alignItems: 'center'
    },
    mapContainer: {
        width: '100%',
        marginTop: 20,
        marginBottom: 40,
        paddingHorizontal: 20
        // Transparent container for floating path
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#9CA3AF',
        marginBottom: 20,
        letterSpacing: 1
    },
    // New Team Status Card Styles
    teamStatusCard: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 24,
        paddingVertical: 15,
        paddingHorizontal: 30,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        width: '100%', // full width of container padding
        maxWidth: 350
    },
    teamStatusText: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    bottomTabBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        flexDirection: 'row',
        backgroundColor: '#FFFFFF', // Solid white for clean look, or keep blur if preferred. Duolingo is solid/translucent. Let's keep BlurView but style it solid-ish. 
        // Actually Dashboard uses BlurView component, so this bg color acts as tint if intensity is low. 
        // But for Duolingo style, usually it is solid border top.
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 30, // Extra padding for Home Indicator
        justifyContent: 'space-around', // Key for even spacing
        alignItems: 'center',
        elevation: 0, // Flat look usually
    },
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flex: 1, // Hit target optimization
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280'
    }
});
