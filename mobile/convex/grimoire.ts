import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const facts = await ctx.db.query("user_facts")
            .withIndex("by_user", q => q.eq("user_id", userId))
            .collect();

        // Return standard dummy facts or fetch from another table
        // For now we map whatever we unlocked
        return facts.map((fact) => ({
            id: fact._id,
            fact_id: fact.fact_id,
            title: `Scroll Fragment #${fact.fact_id}`,
            text: `Ancient wisdom regarding fragment ${fact.fact_id}. Consistent exercise improves heart health and brain function.`,
            status: 'unlocked',
            unlocked_at: fact._creationTime
        }));
    },
});
