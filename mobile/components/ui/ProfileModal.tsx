import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

import DuoButton from './DuoButton';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    session: any;
}

export default function ProfileModal({ visible, onClose, session }: ProfileModalProps) {
    const handleSignOut = async () => {
        await supabase.auth.signOut();
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
                        <Text style={styles.email}>{session?.user?.email}</Text>
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
        marginBottom: 40
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
        color: '#4B4B4B'
    },
});
