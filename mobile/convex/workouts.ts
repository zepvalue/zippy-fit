import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const history = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const user = await ctx.db.get(userId);
        if (!user || !user.team_id) return [];

        // Return history of workouts for the team to render the JourneyMap
        const workouts = await ctx.db.query("workouts")
            .withIndex("by_team_id", q => q.eq("team_id", user.team_id!))
            .order("desc")
            .take(30);

        return workouts.map(w => ({
            id: w._id,
            date: new Date(w._creationTime).toISOString().split("T")[0],
            damage: w.damage || 0,
            is_spot_fill: w.is_spot_fill || false,
        }));
    },
});

export const log = mutation({
    args: {
        damage: v.number(),
        duration_minutes: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user || !user.team_id) {
            throw new Error("Not in a team");
        }

        const team = await ctx.db.get(user.team_id);
        if (!team) {
            throw new Error("Team not found");
        }

        // Add workout
        const workoutId = await ctx.db.insert("workouts", {
            user_id: userId,
            team_id: user.team_id,
            damage: args.damage,
            duration_minutes: args.duration_minutes,
            is_spot_fill: false,
        });

        // Update boss HP
        const newBossHp = Math.max(0, team.boss_hp - args.damage);

        // Unlock a random fact
        const fact_id = Math.floor(Math.random() * 10) + 1;
        await ctx.db.insert("user_facts", {
            user_id: userId,
            fact_id: fact_id,
        });

        await ctx.db.patch(team._id, {
            boss_hp: newBossHp
        });

        return {
            success: true,
            workout_id: workoutId,
            new_fact_id: fact_id,
        };
    },
});
