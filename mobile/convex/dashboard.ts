import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        const user = await ctx.db.get(userId);
        if (!user) return null;

        let team = null;
        let partner = null;
        let has_team = false;

        if (user.team_id) {
            team = await ctx.db.get(user.team_id);
            if (team) {
                has_team = true;
                const teamMembers = await ctx.db.query("users")
                    .withIndex("by_team_id", q => q.eq("team_id", user.team_id!))
                    .collect();

                partner = teamMembers.find(m => m._id !== userId);
            }
        }

        // Calculate workouts for today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayMs = startOfToday.getTime();

        let user_completed_today = false;
        const userWorkouts = await ctx.db.query("workouts")
            .withIndex("by_user_id", q => q.eq("user_id", userId))
            .filter(q => q.gte(q.field("_creationTime"), startOfTodayMs))
            .collect();
        if (userWorkouts.length > 0) {
            user_completed_today = true;
        }

        let partner_completed_today = false;
        if (partner) {
            const partnerWorkouts = await ctx.db.query("workouts")
                .withIndex("by_user_id", q => q.eq("user_id", partner._id))
                .filter(q => q.gte(q.field("_creationTime"), startOfTodayMs))
                .collect();
            if (partnerWorkouts.length > 0) {
                partner_completed_today = true;
            }
        }

        // Determine status based on repair_deadline
        let status = "SAFE";
        if (team?.repair_deadline) {
            const deadline = new Date(team.repair_deadline).getTime();
            if (deadline > Date.now()) {
                status = "AT_RISK";
            }
        }

        return {
            has_team,
            team_id: user.team_id || null,
            team_name: team?.name || null,
            code: team?.code || null,
            member_count: team ? 2 : 1,
            hearts: team?.hearts ?? 3,
            streak: team?.streak ?? 0,
            freezes_available: team?.freezes_available ?? 0,
            status,
            user_completed_today,
            partner_completed_today,
        };
    },
});
