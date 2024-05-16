import { router } from "./core";

import { auth } from "../modules/auth/router";
import { account } from "../modules/users/router";
import { teams } from "../modules/teams/router";
import { plans } from "../modules/plans/router";
import { subscriptions } from "../modules/subscriptions/router";
export const appRouter = router({
  auth,
  // protected
  plans,
  subscriptions,
  account,
  teams,
});

export type AppRouter = typeof appRouter;
