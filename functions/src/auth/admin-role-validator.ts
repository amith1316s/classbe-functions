import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import { env } from "../env/env";

export const adminRoleValidate = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const db = admin.firestore();

  if (req.body.user) {
    functions.logger.debug(req.body.user);
    const dbUserSnap = await db
      .collection(env.FIRESTORE_COLLECTIONS.USERS)
      .doc(req.body.user.uid)
      .get();
    const dbUser = dbUserSnap.data();

    if (dbUser && dbUser.role === "admin") {
      next();
      return;
    }
  }

  res.status(403).send("Unauthorized");
  return;
};
