import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Inspect a user's raw record by email — useful for debugging
export const getUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("authAccounts")
            .withIndex("providerAndAccountId", q =>
                q.eq("provider", "password").eq("providerAccountId", args.email)
            )
            .unique();

        if (!account) return { found: false };

        const user = await ctx.db.get(account.userId);
        return {
            found: true,
            userId: account.userId,
            email: args.email,
            team_id: user?.team_id ?? null,
            name: user?.name ?? null,
        };
    },
});

// Force-assign a user to an existing team by email + team code
export const assignTeam = internalMutation({
    args: { email: v.string(), teamCode: v.string() },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("authAccounts")
            .withIndex("providerAndAccountId", q =>
                q.eq("provider", "password").eq("providerAccountId", args.email)
            )
            .unique();

        if (!account) throw new Error(`No account found for ${args.email}`);

        const team = await ctx.db
            .query("teams")
            .withIndex("by_code", q => q.eq("code", args.teamCode.toUpperCase()))
            .unique();

        if (!team) throw new Error(`No team found with code ${args.teamCode}`);

        await ctx.db.patch(account.userId, { team_id: team._id });
        return { userId: account.userId, team_id: team._id, code: team.code };
    },
});

export const resetPassword = internalAction({
    args: {
        email: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        await modifyAccountCredentials(ctx, {
            provider: "password",
            account: {
                id: args.email,
                secret: args.newPassword,
            },
        });
        console.log(`Password reset for ${args.email}`);
    },
});
