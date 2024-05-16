import { router, trpcError, protectedProcedure } from "../../trpc/core";
import { z } from "zod";
import { schema, db } from "../../db/client";
import { eq, and } from "drizzle-orm";

export const teams = router({
  getOne: protectedProcedure.query(async ({ ctx: { user } }) => {
    const { userId } = user;
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.userId, userId),
    });

    if (!team) {
      throw new trpcError({
        code: "NOT_FOUND",
      });
    }
    return {
      success: true,
      team: team,
    };
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      console.log(userId, "userId");
      const { name } = input;
      try {
        const userRecord = await db.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });
        console.log(userRecord, "user record");
        if (!userRecord) {
          throw new trpcError({
            code: "NOT_FOUND",
            message: "USER_NOT_FOUND ",
          });
        }
        const teamRecord = await db.query.teams.findFirst({
          where: eq(schema.teams.userId, userRecord.id),
        });
        console.log(teamRecord, "team record now");
        if (teamRecord) {
          throw new trpcError({
            code: "BAD_REQUEST",
            message: "TEAM_ALREADY_EXISTS",
          });
        }
        const team = await db
          .insert(schema.teams)
          .values({
            createdAt: new Date(),
            updatedAt: new Date(),
            name,
            userId,
            isPersonal: false,
          })
          .returning();

        console.log(team, "team");

        return {
          success: true,
          team: team[0],
        };
      } catch (error) {
        console.error(error);
        throw new trpcError({
          code: "BAD_REQUEST",
          message: "TEAM_ALREADY_EXISTS",
        });
      }
    }),

  update: protectedProcedure
    .input(z.object({ teamId: z.number(), name: z.string() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const { teamId, name } = input;
      try {
        const team = await db.query.teams.findFirst({
          where: and(
            eq(schema.teams.id, teamId),
            eq(schema.teams.userId, userId)
          ),
        });

        if (!team) {
          throw new trpcError({
            code: "UNAUTHORIZED",
            message: "You are not authorized to update this team",
          });
        }

        await db
          .update(schema.teams)
          .set({
            name,
          })
          .where(
            and(eq(schema.teams.id, teamId), eq(schema.teams.userId, userId))
          );

        return {
          success: true,
        };
      } catch (error) {
       throw new trpcError({code:"UNAUTHORIZED"})
      }
    }),

  cancel: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const { teamId } = input;
      try {
        const team = await db.query.teams.findFirst({
          where: and(
            eq(schema.teams.id, teamId),
            eq(schema.teams.userId, userId)
          ),
        });

        if (!team) {
          console.log("should thorw error")
          throw new trpcError({
            code: "BAD_REQUEST"
          });
        }

        await db
          .delete(schema.teams)
          .where(
            and(eq(schema.teams.id, teamId), eq(schema.teams.userId, userId))
          );

        return {
          success: true,
        };
      } catch (error) {
        throw new trpcError({code :"BAD_REQUEST"})
      }
    }),
});
