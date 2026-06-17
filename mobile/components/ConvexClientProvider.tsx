import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../convex/_generated/api";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
    unsavedChangesWarning: false,
});

const secureStorage = {
    getItem: Platform.OS === "web" ? AsyncStorage.getItem : SecureStore.getItemAsync,
    setItem: Platform.OS === "web" ? AsyncStorage.setItem : SecureStore.setItemAsync,
    removeItem: Platform.OS === "web" ? AsyncStorage.removeItem : SecureStore.deleteItemAsync,
};

function UserSyncer() {
    const { isAuthenticated } = useConvexAuth();
    const storeUser = useMutation(api.users.store);
    const [synced, setSynced] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !synced) {
            storeUser().then(() => setSynced(true));
        }
    }, [isAuthenticated, synced, storeUser]);

    return null;
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <ConvexAuthProvider client={convex} storage={secureStorage}>
            <UserSyncer />
            {children}
        </ConvexAuthProvider>
    );
}
