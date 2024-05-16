import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import { createAuthenticatedCaller, createCaller } from "../helpers/utils";
import { eq } from "drizzle-orm";
// import resetDb from "../helpers/resetDb";
import { trpcError } from "../../trpc/core";
import resetDb from "../helpers/resetDb";

describe("team routes", async () => {
  describe("create team", async () => {
    it("should create a team successfully", async () => {
      //  Test case for creating a team
      const login_user = {
        id: 1,
        email: "mail@mail.com",
        password: "P@ssw0rd",
        name: "test",
        timezone: "Asia/Riyadh",
        locale: "en",

        isAdmin: true,
      };
      await createCaller({}).auth.register(login_user);
      await db
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.email, "mail@mail.com"));

      const loginResponse = await createCaller({
        res: { setCookie: () => {} },
      }).auth.login({ email: login_user.email, password: login_user.password });
  
      expect(loginResponse.success).toBe(true);

      if (loginResponse.success) {
        const teamData = {
          userId: 1,
          name: "Ali's Team",
        };
        const createdTeam = await createAuthenticatedCaller({
          userId: 1,
        }).teams.create(teamData);
        expect(createdTeam.success).toBe(true);
        expect(createdTeam.team).toBeDefined();
        expect(createdTeam.team).toHaveProperty("userId");
        expect(createdTeam.team).toHaveProperty("name");
        expect(createdTeam.team).toHaveProperty("id");
      }
      await resetDb();
    });

    it("should throw an error if creating a duplicate team", async () => {
      //login is mandatory  the first team  will be created and the second should throw an erorr
      await resetDb();
      const login_user = {
        email: "mail@mail.com",
        password: "P@ssw0rd",
        name: "test",
        timezone: "Asia/Riyadh",
        locale: "en",

        isAdmin: true,
      };
      await createCaller({}).auth.register(login_user);
      await db
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.email, "mail@mail.com"));

      const loginResponse = await createCaller({
        res: { setCookie: () => {} },
      }).auth.login({ email: login_user.email, password: login_user.password });
    
      expect(loginResponse.success).toBe(true);
      if (loginResponse.success) {
        const teamData = {
          name: "Ali's Team",
        };

        const team_with_no_duplicate = await createAuthenticatedCaller({
          userId: 1,
        }).teams.create(teamData);

        expect(team_with_no_duplicate.success).toBe(true);

        // Test case for throwing error on duplicate team creation

        await expect(async () => {
          await createAuthenticatedCaller({ userId: 1 }).teams.create(teamData); // Second attempt
        }).rejects.toThrowError(
          new trpcError({
            code: "BAD_REQUEST",
            message: "TEAM_ALREADY_EXISTS",
          })
        );
      }
    });
  });

  describe("update team", async () => {
    it("should update an existing team successfully for the user who created it", async () => {
      // Test case for updating a team by the user who created it
      const updatedTeamData = {
        teamId: 1,
        name: "Updated Team Name",
      };

      // Assuming there is a function to check if the user has permission to update the team
      const updatedTeam = await createAuthenticatedCaller({
        userId: 1,
      }).teams.update(updatedTeamData);
      expect(updatedTeam.success).toBe(true);
    });

    it("should throw an error if updating a team by a user who didn't create it", async () => {
      // Test case for throwing error when updating a team by a user who didn't create it
      const updatedData = {
        teamId: 1,
        name: "Updated Team Name :)",
      };

      await expect(async () => {
        await createAuthenticatedCaller({ userId: 2 }).teams.update(
          updatedData
        ); // Assuming userId 2 didn't create the team
      }).rejects.toThrowError(
        new trpcError({
          code: "UNAUTHORIZED",
        })
      );
    });
  });

  describe("cancel team", async () => {
    it("should cancel an existing team successfully for the user who created it", async () => {
      // Test case for canceling a team by the user who created it
      const teamId = 1;

      // Assuming there is a function to check if the user has permission to cancel the team
      const canceledTeam: any = await createAuthenticatedCaller({
        userId: 1,
      }).teams.cancel({ teamId });
      expect(canceledTeam.success).toBe(true);
    });

    it("should throw an error if canceling a team by a user who didn't create it", async () => {
      // Test case for throwing error when canceling a team by a user who didn't create it
      const teamId = 1;

      // Assuming there is a function to handle unauthorized team cancellations
      await expect(async () => {
        await createAuthenticatedCaller({ userId: 2 }).teams.cancel({ teamId }); // Assuming userId 2 didn't create the team
      }).rejects.toThrowError(
        new trpcError({
          code: "BAD_REQUEST",
        })
      );
    });
  });

  describe("read team", async () => {
    it("should retrieve an existing team successfully", async () => {
      // seeding teams
      await createAuthenticatedCaller({ userId: 1 }).teams.create({
        name: "Ali's Team 10",
      });
      // Test case for reading a team

      const teamRes = await createAuthenticatedCaller({
        userId: 1,
      }).teams.getOne();
      expect(teamRes.success).toBe(true);
      expect(teamRes.team).toBeDefined();
      expect(teamRes.team).toHaveProperty("userId");
    });
  });
});
