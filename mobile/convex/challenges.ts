import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        // In a real app, this might query the challenges table for today's date
        // For now we can return a default challenge
        return {
            text: "Complete 30 minutes of cardio",
            base_count: 30,
            unit: "minutes"
        };
    },
});
