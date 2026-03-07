import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { useMutation } from 'convex/react';

interface DebugMenuProps {
    visible: boolean;
    onClose: () => void;
    onReset: () => void;
    token: string;
}

export default function DebugMenu({ visible, onClose, onReset, token }: DebugMenuProps) {
    const logWorkout = useMutation(api.workouts.log);

    if (!visible) return null;

    const handleAction = async (action: string, payload?: any) => {
        try {
            if (action === 'attack') {
                await logWorkout({ damage: payload, duration_minutes: 0 });
                Alert.alert("Attack Sent", `Dealt ${payload} damage!`);
            } else if (action === 'reset_team') {
                Alert.alert("Reset", "Team reset logic not fully implemented yet.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.overlay}>
                <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>🛠️ DEBUG MENU</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>BOSS ACTIONS</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: '#EF4444' }]}
                                    onPress={() => handleAction('attack', 100)}
                                >
                                    <Text style={styles.btnText}>Attack (100)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: '#DC2626' }]}
                                    onPress={() => handleAction('attack', 1000)}
                                >
                                    <Text style={styles.btnText}>NUKE (1000)</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>SYSTEM</Text>
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: '#4B5563' }]}
                                onPress={onReset}
                            >
                                <Text style={styles.btnText}>Reset App State</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20
    },
    container: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 20,
        maxHeight: '80%'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap'
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center'
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12
    }
});
