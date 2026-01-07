import { Platform } from 'react-native';

const LOCALHOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

// Allow overriding via Environment Variable for physical device testing
// e.g. EXPO_PUBLIC_API_URL=http://192.168.1.5:8000
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || LOCALHOST;

// Helper to get headers with the token
const getHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Bypass-Tunnel-Reminder': 'true' // Bypass localtunnel warning page
});

// Helper: Timeout for fetch
const fetchWithTimeout = async (url: string, options: any, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export const api = {
    // 1. Get Dashboard (Now checks for team existence)
    getDashboard: async (token: string) => {
        try {
            const response = await fetchWithTimeout(`${BASE_URL}/dashboard?t=${Date.now()}`, {
                headers: getHeaders(token)
            });

            if (response.status === 401 || response.status === 403) {
                console.log("🚨 API: Auth Error (401/403) - User likely deleted.");
                return { error: 'AUTH_ERROR' };
            }

            if (!response.ok) throw new Error("Server error");

            const data = await response.json();

            // --- ADD THIS LOG ---
            console.log("DEBUG DASHBOARD FROM SERVER:", {
                status: data.status,
                partner_done: data.partner_completed_today,
                user_done: data.user_completed_today
            });

            return data;
        } catch (error) {
            console.log("API Error (getDashboard):", error);
            return null;
        }
    },

    // 2. Log Workout
    logWorkout: async (token: string, damage: number = 0, durationMinutes: number = 0) => {
        try {
            const response = await fetch(`${BASE_URL}/workout`, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ damage, duration_minutes: durationMinutes })
            });
            if (!response.ok) {
                const text = await response.text();
                console.error("🔴 API Workout Failed:", response.status, text);
                return { status: "error", detail: text };
            }
            return await response.json();
        } catch (error) {
            console.error("🔴 API Network/Parse Error in logWorkout:", error);
            return { status: "error", error };
        }
    },

    createTeam: async (token: string) => {
        try {
            console.log("🔹 Sending Create Team Request..."); // DEBUG LOG

            const response = await fetch(`${BASE_URL}/team/create`, {
                method: 'POST',
                headers: getHeaders(token),
            });

            const data = await response.json();
            console.log("🔹 Server Response:", data); // DEBUG LOG

            // If server returned an error (like 400 or 500), 'ok' will be false
            if (!response.ok) {
                // Python FastAPI returns errors as { "detail": "Message" }
                return { error: data.detail || "Server Error" };
            }

            return data; // Returns { team_id, code, message }
        } catch (error) {
            console.error("🔴 Network/Parse Error:", error);
            return { error: "Network connection failed" };
        }
    },

    // 4. Join an Existing Team
    joinTeam: async (token: string, code: string) => {
        try {
            const response = await fetch(`${BASE_URL}/team/join`, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const err = await response.json();
                return { error: err.detail || "Failed to join" };
            }

            return await response.json(); // Returns success message
        } catch (error) {
            return { error: "Network error" };
        }
    },

    // 5. Get Workout History
    getHistory: async (token: string) => {
        try {
            const response = await fetch(`${BASE_URL}/history`, {
                headers: getHeaders(token),
            });

            if (!response.ok) {
                console.error("🔴 API: getHistory failed status:", response.status);
                return [];
            }

            const data = await response.json();

            // Safety check: ensure it is an array
            if (Array.isArray(data)) {
                return data;
            } else {
                console.warn("⚠️ API: getHistory returned non-array:", data);
                return [];
            }
        } catch (error) {
            console.error("🔴 API Error (getHistory):", error);
            return [];
        }
    },

    // 6. Send Nudge
    sendNudge: async (token: string) => {
        try {
            console.log("🔹 API: Sending Nudge...");
            const response = await fetch(`${BASE_URL}/team/nudge`, {
                method: 'POST',
                headers: getHeaders(token),
            });
            console.log("🔹 API: Nudge Response Status:", response.status);

            if (!response.ok) {
                const errText = await response.text();
                console.error("🔴 API: Server Error:", errText);
                return false;
            }

            return true;
        } catch (error) {
            console.error("🔴 API: Nudge Failed:", error);
            return false;
        }
    },

    getChallenge: async (token: string) => {
        try {
            const response = await fetch(`${BASE_URL}/challenge?t=${getTodayStr()}`, {
                method: 'GET',
                headers: getHeaders(token),
            });
            const data = await response.json();
            // Return full object: { text, base_count, unit }
            return data;
        } catch (error) {
            return { text: "Check your connection", base_count: 0 };
        }
    },

    getGrimoire: async (token: string) => {
        try {
            const response = await fetch(`${BASE_URL}/grimoire`, {
                headers: getHeaders(token),
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("🔴 API: Get Grimoire Failed:", error);
            return [];
        }
    },

    requestSpot: async (token: string) => {
        try {
            const response = await fetch(`${BASE_URL}/team/spot`, {
                method: 'POST',
                headers: getHeaders(token),
            });
            return await response.json();
        } catch (error) {
            console.error("🔴 API: Request Spot Failed:", error);
            return { error: "Network error" };
        }
    }
};

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}
