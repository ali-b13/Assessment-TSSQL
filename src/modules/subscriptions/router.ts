import {
  router,
  trpcError,
  protectedProcedure,
  publicProcedure,
} from "../../trpc/core";
import { z } from "zod";
import { schema, db } from "../../db/client";
import { eq, and } from "drizzle-orm";


export const subscriptionTime = () => {
  const vaild_date = new Date();
  vaild_date.setMonth(vaild_date.getMonth() + 1);
  vaild_date.setHours(11, 30, 0, 0);
  return vaild_date;
};

export const subscriptions = router({
  getOne: protectedProcedure.mutation(async ({ ctx: { user } }) => {
    // Implement subscription getOne subscription logic here
    const { userId } = user;
    const user_in = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user_in) {
      throw new trpcError({ code: "BAD_REQUEST" });
    }
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.userId, user_in.id),
    });
    if (!team) {
      throw new trpcError({ code: "BAD_REQUEST" });
    }
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(schema.subscriptions.teamId, team.id),
        eq(schema.subscriptions.userId, user_in.id),
        eq(schema.subscriptions.isActive, true)
      ),
    });
    if (!subscription) {
      throw new trpcError({ code: "BAD_REQUEST" });
    }

    const subscriptionDetails =
      await db.query.subscriptionActivations.findFirst({
        where: eq(
          schema.subscriptionActivations.subscriptionId,
          subscription.id
        ),
      });
    if (!subscriptionDetails) {
      throw new trpcError({ code: "NOT_FOUND" });
    }
    if (subscriptionDetails?.expirationDate < new Date()) {
      db.update(schema.subscriptions)
        .set({
          isActive: false,
        })
        .where(
          and(
            eq(schema.subscriptions.id, subscription.id),
            eq(schema.subscriptions.userId, userId)
          )
        )
        .execute();
      return {
        success: false,
        message: "subscription has ended",
      };
    }
    return {
      success: true,
      subscription,
    };
  }),

  create: protectedProcedure
    .input(
      z.object({ userId: z.number(), planId: z.number(), teamId: z.number() })
    ) // User ID,Team ID and Plan ID
    .mutation(async ({ input }) => {
      const { userId, teamId, planId } = input;

      // Check if the user, team, and plan exist
      const [user, team, plan] = await Promise.all([
        db.query.users.findFirst({ where: eq(schema.users.id, userId) }),
        db.query.teams.findFirst({ where: eq(schema.teams.userId, userId) }),
        db.query.plans.findFirst({ where: eq(schema.plans.id, planId) }),
      ]);

      if (!user || !team || !plan) {
        throw new trpcError({ code: "NOT_FOUND" });
      }

      const teamAlreadyHasPlan = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.teamId, team.id),
      });
      if (teamAlreadyHasPlan) {
        throw new trpcError({
          code: "FORBIDDEN",
          message: "SUBSCRIPTION_ALREADY_EXISTS",
        });
      }
      // Create a new subscription

      const newSubscription = await db
        .insert(schema.subscriptions)
        .values({
          userId,
          teamId,
          planId,
          price: plan.price,
          isActive: false,
        })
        .returning();

      return {
        success: true,
        subscription: newSubscription[0],
      };
    }),
  activateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { subscriptionId } = input;

      try {
        // Create a new entry in subscriptionActivations table
        await db.insert(schema.subscriptionActivations).values({
          subscriptionId: subscriptionId,
          activationDate: new Date("2024-05-05T20:55:00.000Z"), // Convert activationDate to Date object
          expirationDate: new Date("2024-06-05T20:55:00.000Z"),
        });

        // Update the corresponding subscription in subscriptions table to set isActive to true
        await db
          .update(schema.subscriptions)
          .set({ isActive: true })
          .where(eq(schema.subscriptions.id, subscriptionId))
          .execute();

        return {
          success: true,
          message: "Subscription activated successfully",
        };
      } catch (error) {
        console.error("Error activating subscription:", error);
        throw new Error("Failed to activate subscription");
      }
    }),
  cancel: protectedProcedure
    .input(z.object({ userId: z.number() })) // User ID
    .mutation(async ({ input }) => {
      // Implement subscription cancellation logic here
    }),
  getActiveSubscriptions: protectedProcedure.query(
    async ({ ctx: { user } }) => {
      // Implement method to retrieve active subscriptions admin only

      try {
        const { userId } = user;
        const user_admin = await db.query.users.findFirst({
          where: and(
            eq(schema.users.id, userId),
            eq(schema.users.isAdmin, true)
          ),
        });
        // If not Admin throw Error
        if (!user_admin?.isAdmin) {
          throw new trpcError({
            code: "BAD_REQUEST",
          });
        }
        // Retrieve all active subscriptions

        const activeSubscriptions = await db.query.subscriptions.findMany({
          where: eq(schema.subscriptions.isActive, true),
        });

        return {
          success: true,
          subscriptions: activeSubscriptions,
        };
      } catch (error) {
        console.error("Error retrieving active subscriptions:", error);
        throw new trpcError({
          code: "BAD_REQUEST",
        });
      }
    }
  ),

  getSubscriptionHistory: protectedProcedure.query(
    async ({ ctx: { user } }) => {
      // Implement method to retrieve subscription history for a user
      const { userId } = user;

      try {
        // Retrieve all subscriptions for the user
        const subscriptionHistory = await db.query.subscriptions.findMany({
          where: eq(schema.subscriptions.userId, userId),
        });

        return {
          success: true,
          subscriptions: subscriptionHistory,
        };
      } catch (error) {
        console.error("Error retrieving subscription history:", error);
        throw new trpcError({
          code: "BAD_REQUEST",
        });
      }
    }
  ),
});
