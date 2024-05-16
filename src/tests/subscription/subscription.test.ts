import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import {
  SubscriptionType,
  createAuthenticatedCaller,
  createCaller,
} from "../helpers/utils";
import { eq } from "drizzle-orm";
// import resetDb from "../helpers/resetDb";
import { trpcError } from "../../trpc/core";
import resetDb from "../helpers/resetDb";

describe("subscription routes", async () => {
  beforeAll(async () => {
    resetDb();
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
  });
  const data = {
    userId: 1,
    teamId: 1,
    planId: 1,
  };
  describe("create subscription", async () => {
    it("should create a new subscription successfully if user loggedin and email is verified", async () => {
      //  Test case for creating a subscription

      const login_user = {
        id: 1,
        email: "mail@mail.com",
        password: "P@ssw0rd",
        name: "test",
        timezone: "Asia/Riyadh",
        locale: "en",

        isAdmin: true,
      };
      const loginResponse = await createCaller({
        res: { setCookie: () => {} },
      }).auth.login({ email: login_user.email, password: login_user.password });
      console.log(loginResponse, "login rresponse");
      expect(loginResponse.success).toBe(true);

      if (loginResponse.success) {
        const data = {
          userId: 1,
          teamId: 1,
          planId: 1,
        };
        // plan
        const plan_data = {
          name: "Gold",
          price: "400",
        };
        await createAuthenticatedCaller({
          userId: 1,
        }).plans.create(plan_data);
        // team
        const teamData = {
          userId: 1,
          name: "Ali's Team",
        };
        // after i have all these in mind i can perfom tests
        await createAuthenticatedCaller({
          userId: 1,
        }).teams.create(teamData);
        const subscriptionRes = await createAuthenticatedCaller({
          userId: 1,
        }).subscriptions.create(data);
        if (subscriptionRes.success && subscriptionRes.subscription) {
          // Activate the created subscription
          await createAuthenticatedCaller({
            userId: 1,
          }).subscriptions.activateSubscription({
            subscriptionId: subscriptionRes.subscription.id,
          });

          expect(subscriptionRes.success).toBe(true);
          expect(subscriptionRes.subscription).toBeDefined()
          expect(subscriptionRes.subscription).toHaveProperty("teamId")
          expect(subscriptionRes.subscription.isActive).toBe(false)
          expect(subscriptionRes.subscription).toHaveProperty("userId")
          expect(subscriptionRes.subscription).toHaveProperty("planId")
        }
      }
    });

    it("should throw an error if creating a duplicate subscription", async () => {
      // Test case for throwing error on duplicate subscription creation
      const login_user = {
        id: 1,
        email: "mail@mail.com",
        password: "P@ssw0rd",
        name: "test",
        timezone: "Asia/Riyadh",
        locale: "en",

        isAdmin: true,
      };

      const loginResponse = await createCaller({
        res: { setCookie: () => {} },
      }).auth.login({ email: login_user.email, password: login_user.password });
      console.log(loginResponse, "login rresponse");
      expect(loginResponse.success).toBe(true);

      if (loginResponse.success) {
      

        await expect(async () => {
          await createAuthenticatedCaller({ userId: 1 }).subscriptions.create(
            data
          ); // duplicate subscription
        }).rejects.toThrowError(
          new trpcError({
            code: "BAD_REQUEST",
            message: "SUBSCRIPTION_ALREADY_EXISTS",
          })
        );
      }
    });
  });

  describe("read a subscription", async () => {
    it("should get  an existing subscription successfully", async () => {
     
      // Test case for getting a subscription

      const subscriptionRes = await createAuthenticatedCaller({
        userId: 1,
      }).subscriptions.getOne();
      expect(subscriptionRes.success).toBe(true);
      expect(subscriptionRes.subscription).toBeDefined();
    });

    it("should throw an error if getting a non-existent subscription or userId", async () => {
      // Test case for throwing error when updating a non-existent subscription
      await expect(async () => {
        await createAuthenticatedCaller({ userId: 2 }).subscriptions.getOne(); // duplicate subscription
      }).rejects.toThrowError(
        new trpcError({
          code: "BAD_REQUEST",
        })
      );
    });
  });

 
});
