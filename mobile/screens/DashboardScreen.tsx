import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Platform, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
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

    useEffect(() => {
        checkTutorial();
        fetchData();
    }, []);

    const checkTutorial = async () => {
        const done = await AsyncStorage.getItem('tutorial_completed');
        if (done !== 'true') {
            setTutorialVisible(true);
        }
    };

    const fetchData = async () => {
        const token = await AsyncStorage.getItem('userToken');
        // If no token, we just don't fetch data, but let parent handle auth redirect if needed.
        // Or better, we assume if we are mounted, we should try.
        if (!token) return;

        console.log("Fetching Dashboard Data...");
        const data = await api.getDashboard(token);

        if (data?.error === 'AUTH_ERROR') {
            // Just sign out supabase, let parent handle it
            // await AsyncStorage.removeItem('userToken'); 
            // router.replace('/'); 
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
                setUserDone(data.user_completed_today);
                setPartnerDone(data.partner_completed_today);

                setBossData({
                    hp: data.boss_hp ?? 10000,
                    maxHp: data.boss_max_hp ?? 10000,
                    name: data.boss_name || "The Sloth King",
                    imageIndex: data.boss_image_index ?? 0
                });
            } else {
                // router.replace('/onboarding'); 
                // Don't redirect automatically for now to stop loop
            }
        }

        const chal = await api.getChallenge(token);
        if (chal) setChallengeData(chal);

        const hist = await api.getHistory(token);
        if (hist) setHistory(hist);

        setRefreshing(false);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleComplete = async () => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            // Optimistic Update
            setUserDone(true);
            setTeamCompletionCount(prev => prev + 1);

            // Log Workout
            const damage = 500;
            const res = await api.logWorkout(token, damage);

            if (res.status === 'success' || res.status === 'logged' || res.status === 'streak_incremented') {
                fetchData(); // Refresh to get official status

                // --- CHECK FOR SECRET SCROLL ---
                if (res.new_fact) {
                    setUnlockedFact(res.new_fact);
                    setTimeout(() => setScrollVisible(true), 1000);
                }
            }
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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />
            {/* Note: I removed the noise image to satisfy the bundler until asset is restored */}

            {/* HEADER */}
            <BlurView intensity={80} tint="light" style={styles.headerGlass}>
                <View style={styles.headerContent}>
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

                    <View style={styles.headerRight}>
                        {/* GRIMOIRE BUTTON */}
                        <TouchableOpacity onPress={() => setGrimoireVisible(true)} style={styles.iconButton}>
                            <MaterialCommunityIcons name="book-variant" size={24} color="#78350F" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.iconButton}>
                            <MaterialCommunityIcons name="cog" size={24} color="#4B5563" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* VISUAL TEAM STATUS */}
                <View style={styles.teamStatusContainer}>
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
                </View>
            </BlurView>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* 1. BOSS BATTLE */}
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
                    <Text style={styles.sectionTitle}>YOUR JOURNEY</Text>
                    <JourneyMap history={history} />
                </View>

            </ScrollView>

            <ProfileModal
                visible={profileVisible}
                onClose={() => setProfileVisible(false)}
                code={teamCode}
                onDebug={() => setDebugVisible(true)}
                onReplayTutorial={() => setTutorialVisible(true)}
                session={{ user: { email: 'Duo' } }}
            />

            <DebugMenu
                visible={debugVisible}
                onClose={() => setDebugVisible(false)}
                onReset={() => { }}
                token=""
            />

            {/* TUTORIAL MODAL */}
            <Modal visible={tutorialVisible} animationType="slide">
                <TutorialScreen onComplete={async () => {
                    await AsyncStorage.setItem('tutorial_completed', 'true');
                    setTutorialVisible(false);
                }} />
            </Modal>



        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerGlass: {
        width: '100%',
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.5)',
        zIndex: 50,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    statText: {
        fontSize: 14,
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
    // TEAM STATUS
    teamStatusContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15 // Gap between circles
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
        paddingTop: 20,
        paddingBottom: 100,
        paddingHorizontal: 20,
        alignItems: 'center'
    },
    mapContainer: {
        width: '100%',
        marginTop: 20,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#9CA3AF',
        marginBottom: 20,
        letterSpacing: 1
    }
});
