import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DuoButton from './DuoButton';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    code: string;
    onReplayTutorial: () => void;
    onDebug?: () => void;
}

export default function ProfileModal({ visible, onClose, code, onReplayTutorial, onDebug }: ProfileModalProps) {
    const { signOut } = useAuthActions();
    const user = useQuery(api.users.current);

    const email = user?.email || "User";

    const handleSignOut = async () => {
        await signOut();
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>PROFILE</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color="#CECECE" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <MaterialCommunityIcons name="account" size={40} color="white" />
                        </View>
                        <Text style={styles.email}>{email}</Text>

                        <View style={styles.codeContainer}>
                            <Text style={styles.codeLabel}>TEAM CODE</Text>
                            <Text style={styles.codeValue}>{code || "----"}</Text>
                        </View>

                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}
                            onPress={onReplayTutorial}
                        >
                            <MaterialCommunityIcons name="help-circle-outline" size={20} color="#3B82F6" />
                            <Text style={{ marginLeft: 8, color: '#3B82F6', fontWeight: 'bold' }}>REPLAY TUTORIAL</Text>
                        </TouchableOpacity>

                        {onDebug && (
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}
                                onPress={() => { onClose(); onDebug(); }}
                            >
                                <MaterialCommunityIcons name="bug" size={20} color="#EF4444" />
                                <Text style={{ marginLeft: 8, color: '#EF4444', fontWeight: 'bold' }}>DEBUG MENU</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <DuoButton
                        title="SIGN OUT"
                        onPress={handleSignOut}
                        color="#FF4B4B"
                        shadowColor="#D43B3B"
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalView: {
        width: '85%',
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        borderWidth: 2,
        borderColor: '#E5E5E5',
    },
    header: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#CECECE',
        letterSpacing: 2
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 40,
        width: '100%'
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#58CC02',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    email: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4B4B4B',
        marginBottom: 20
    },
    codeContainer: {
        backgroundColor: '#F7F7F7',
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
        borderWidth: 2,
        borderColor: '#E5E5E5'
    },
    codeLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#B0B0B0',
        marginBottom: 5,
        letterSpacing: 1
    },
    codeValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#58CC02',
        letterSpacing: 3
    }
});
