import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { api } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GrimoireModalProps {
    visible: boolean;
    onClose: () => void;
}

interface Fact {
    id: number;
    title: string;
    text: string;
    status: 'locked' | 'unlocked';
    unlocked_at?: string;
}

const { width } = Dimensions.get('window');

export default function GrimoireModal({ visible, onClose }: GrimoireModalProps) {
    const [facts, setFacts] = useState<Fact[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadGrimoire();
        }
    }, [visible]);

    const loadGrimoire = async () => {
        setLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            const data = await api.getGrimoire(token);
            setFacts(data);
        }
        setLoading(false);
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.overlay}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>THE GRIMOIRE</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={24} color="#78350F" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {loading ? (
                            <Text style={styles.loadingText}>Unsealing scroll...</Text>
                        ) : (
                            facts.map((fact) => (
                                <View key={fact.id} style={[styles.card, fact.status === 'locked' && styles.lockedCard]}>
                                    <View style={styles.cardHeader}>
                                        <MaterialCommunityIcons
                                            name={fact.status === 'locked' ? "lock" : "book-open-page-variant"}
                                            size={20}
                                            color={fact.status === 'locked' ? "#9CA3AF" : "#D97706"}
                                        />
                                        <Text style={[styles.cardTitle, fact.status === 'locked' && styles.lockedText]}>
                                            {fact.title}
                                        </Text>
                                    </View>

                                    {fact.status === 'unlocked' && (
                                        <Text style={styles.cardBody}>{fact.text}</Text>
                                    )}

                                    {fact.status === 'unlocked' && fact.unlocked_at && (
                                        <Text style={styles.dateText}>
                                            Unlocked {new Date(fact.unlocked_at).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                            ))
                        )}
                        {!loading && facts.length === 0 && (
                            <Text style={styles.emptyText}>The library is empty. Complete challenges to unlock wisdom.</Text>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end', // Slide up sheet
    },
    container: {
        backgroundColor: '#FFFBEB', // Parchment
        height: '85%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A',
        paddingBottom: 15
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#78350F',
        fontFamily: 'serif',
        letterSpacing: 2
    },
    closeBtn: {
        padding: 5,
        backgroundColor: '#FDE68A',
        borderRadius: 20
    },
    scrollContent: {
        paddingBottom: 40
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#92400E',
        fontStyle: 'italic'
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#9CA3AF',
        fontStyle: 'italic',
        paddingHorizontal: 40
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    lockedCard: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
        opacity: 0.7
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937'
    },
    lockedText: {
        color: '#9CA3AF',
        fontStyle: 'italic'
    },
    cardBody: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 10
    },
    dateText: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'right'
    }
});
