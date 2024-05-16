import {
  router,
  trpcError,
  protectedProcedure,
  publicProcedure,
} from "../../trpc/core";
import { z } from "zod";
import { schema, db } from "../../db/client";
import { eq, and } from "drizzle-orm";

export const plans = router({
  getOne: publicProcedure
    .input(
      z.object({
        planId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { planId } = input;
      const plan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, planId),
      });

      if (!plan) {
        throw new trpcError({
          code: "NOT_FOUND"
        });
      }
      return plan;
    }),
  getAll: publicProcedure.query(async () => {
    try {
      const plans = await db.query.plans.findMany();
      return plans;
    } catch (error) {
      console.error("Error fetching plans", error);
      return [];
    }
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string(), price: z.string() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;

      const priviliged_user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!priviliged_user || !priviliged_user.isAdmin) {
        return {
          success: false,
          message: "Admins access only",
        };
        // you can return below code for testing purposes we are returning success as false
        // throw new trpcError({
        //   code: "FORBIDDEN",
        //   message: "Not authorized user",
        // });
      }

      const { name, price } = input;
      try {
        await db.insert(schema.plans).values({ name, price }).returning();
        return {
          success: true,
        };
      } catch (error) {
        console.error(error);
        return {
          success: false,
        };
      }
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string(), price: z.string() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const priviliged_user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!priviliged_user || !priviliged_user.isAdmin) {
        throw new trpcError({
          code: "FORBIDDEN",
        });

      
      }
      const { id, name, price } = input;
      try {
        await db
          .update(schema.plans)
          .set({
            name,
            price,
          })
          .where(eq(schema.plans.id, id));
        return {
          success: true,
          planUpdated:id
        };
      } catch (error) {
        console.error(error);
        return {
          success: false,
        };
      }
    }),
  calculateProratedUpgrade: protectedProcedure
    .input(
      z.object({
        newPlanId: z.number(),
      })
    )
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const { newPlanId } = input;
      // Check if the user, team, and plan exist
      const user_in = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      if (!user_in) {
        throw new trpcError({ code: "NOT_FOUND" });
      }
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.userId, user_in.id),
      });
      if (!team) {
        throw new trpcError({ code: "NOT_FOUND" });
      }

      const currentPlanSubscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(schema.subscriptions.userId, userId),
          eq(schema.subscriptions.teamId, team.id)
        ),
      });

      const newPlan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, newPlanId),
      });

      if (!currentPlanSubscription || !newPlan) {
        throw new trpcError({
          code: "NOT_FOUND",
        });
      }
      const subscriptionActivationDetails =
        await db.query.subscriptionActivations.findFirst({
          where: eq(
            schema.subscriptionActivations.subscriptionId,
            currentPlanSubscription.id
          ),
        });
      if (!subscriptionActivationDetails) {
        throw new trpcError({
          code: "NOT_FOUND",
          message: "Subscription has not been activated",
        });
      }

      const currentDate = new Date();
      const startDate = new Date(subscriptionActivationDetails.activationDate);
      const endDate = new Date(subscriptionActivationDetails.expirationDate);
  
      // Calculate the duration of the remaining subscription period in milliseconds
      const remainingDurationMilliseconds =
        endDate.getTime() - currentDate.getTime();

      // Calculate the total duration of the current subscription in milliseconds
      const totalDurationMilliseconds = endDate.getTime() - startDate.getTime();
      // calculate the total days duration of plan
      const allDays = Math.ceil(
        totalDurationMilliseconds / (1000 * 60 * 60 * 24)
      );

      // Remaining days in the current plan cycle
      const remainingDays = Math.ceil(
        remainingDurationMilliseconds / (1000 * 60 * 60 * 24)
      );
      // Calculate the proportion of time remaining in the current subscription period
      const remainingDurationRatio = Number(remainingDays) / Number(allDays);
   
      // Calculate the price difference between the new and current plans
      const priceDifference =
        parseFloat(newPlan.price) - parseFloat(currentPlanSubscription.price);

      // Calculate the prorated upgrade price based on the remaining duration ratio
      const proratedUpgradePrice = priceDifference * remainingDurationRatio;
     
    

      // Return the prorated upgrade price along with other necessary information
      return {
        proratedPrice: Number(proratedUpgradePrice.toFixed(2)), // Fixed to 2 decimal places
        remainingDays,
        plan: newPlan,
        success: true,
      };
    }),
});
