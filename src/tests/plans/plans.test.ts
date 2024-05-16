import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import { createAuthenticatedCaller, createCaller } from "../helpers/utils";
import { eq } from "drizzle-orm";
// import resetDb from "../helpers/resetDb";
import { trpcError } from "../../trpc/core";

describe("plans routes", async () => {
  describe("create plans", async () => {
    it("should create plans successfully if user is Admin", async () => {
      //   // Test case for creating a new Plan if user has the right privileges
      const data = {
        name: "Gold",
        price: "400",
      };
      const user = {
        email: "mail@mail.com",
        password: "P@ssw0rd",
        name: "test",
        timezone: "Asia/Riyadh",
        locale: "en",
        isAdmin: true,
      };
      await createCaller({}).auth.register(user);
      const planCreatedByAdmin = await createAuthenticatedCaller({
        userId: 1,
      }).plans.create(data);
      console.log(planCreatedByAdmin, "plan");
      expect(planCreatedByAdmin.success).toBe(true);
    });
    it("should throw an error if creating a new plan  if user is not Admin", async () => {
      // Test case for throwing error on duplicate subscription creation
      const data = {
        name: "Platinum",
        price: "200",
      };

      const createdPlanByRegularUser = await createAuthenticatedCaller({
        userId: 2,
      }).plans.create(data);
      console.log(createdPlanByRegularUser, "plan");
      expect(createdPlanByRegularUser.success).toBe(false);
    });
  });

  describe("update plan if user is Admin", async () => {
    it("should update an existing plan successfully", async () => {
      // Test case for updating a subscription

      //old plan
    
      const new_plan = {
        id: 1,
        name: "Platinum",
        price: "400",
      };
      const planUpdatedByAdmin = await createAuthenticatedCaller({
        userId: 1,
      }).plans.update(new_plan);

      expect(planUpdatedByAdmin.success).toBe(true);
    });

    it("should throw an error if updating a plan with user has no privliges", async () => {
      // Test case for throwing error when updating a non-existent subscription

      const new_plan = {
        id: 1,
        name: "Platinum",
        price: "400",
      };

      await expect(async () => {
        await createAuthenticatedCaller({
          userId: 3,
        }).plans.update(new_plan);
      }).rejects.toThrowError(
        new trpcError({
          code: "FORBIDDEN",
        })
      );
    });
  });

  describe("read  plans ", async () => {
    it("should retrieve all plans successfully", async () => {
      // Test case for reading a subscription
      const plans = await createAuthenticatedCaller({
        userId: 3,
      }).plans.getAll();
      expect(plans).toBeDefined();
      expect(plans).toBeTypeOf("object");
    });
    it("should retrieve existing  single plan successfully", async () => {
      // Test case for reading a subscription
      const plan = await createAuthenticatedCaller({ userId: 1 }).plans.getOne({
        planId: 1,
      });
      expect(plan).toBeDefined();
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("price");
    });
    it("should throw an error if trying to read a non-existent subscription", async () => {
      // Test case for throwing error when trying to read a non-existent subscription
      await expect(async () => {
        await createAuthenticatedCaller({ userId: 1 }).plans.getOne({
          planId: 7,
        }); // plan that does not exist
      }).rejects.toThrowError(
        new trpcError({
          code: "NOT_FOUND",
        })
      );
    });
  });

  describe("prorated upgrade price calculation", async () => {
    it("should retrieve an calculated upgrade plan cost successfully", async () => {
      // Test case for calculating a subscription
      await createAuthenticatedCaller({ userId: 1 }).teams.create({
        name: "Alamri Teams",
      });
      await createAuthenticatedCaller({ userId: 1 }).plans.create({
        name: "New Plan",
        price: "900",
      });
      await createAuthenticatedCaller({ userId: 1 }).subscriptions.create({
        teamId: 1,
        planId: 1,
        userId: 1,
      });
      await createAuthenticatedCaller({
        userId: 1,
      }).subscriptions.activateSubscription({ subscriptionId: 1 });
      const calculateProratedUpgrade = await createAuthenticatedCaller({
        userId: 1,
      }).plans.calculateProratedUpgrade({ newPlanId: 2 });

      expect(calculateProratedUpgrade.success).toBe(true);
      expect(calculateProratedUpgrade.plan).toHaveProperty("id");
      expect(calculateProratedUpgrade.plan).toHaveProperty("name");
      expect(calculateProratedUpgrade.plan).toHaveProperty("price");
      expect(calculateProratedUpgrade.proratedPrice).greaterThan(0);
    });

    it("should throw an error if invalid plan IDs are provided for upgrade", async () => {
      // Test case for throwing error on invalid plan IDs provided for upgrade

      await expect(async () => {
        await createAuthenticatedCaller({
          userId: 1,
        }).plans.calculateProratedUpgrade({ newPlanId: 6 }); // plan that does not exist
      }).rejects.toThrowError(
        new trpcError({
          code: "NOT_FOUND",
        })
      );
    });
  });
});
