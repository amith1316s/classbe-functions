import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { env } from "../../env/env";

export const addUserToFirestore = async (user: any) => {
  const db = admin.firestore();
  const userRef = db.collection(env.FIRESTORE_COLLECTIONS.USERS).doc(user.uid);
  await userRef.set({
    intUID: (Date.now() / 1000),
    disabled: user.disabled,
    uid: user.uid,
    email: user.email,
  }, { merge: true });

  logger.debug("USER CREATE", user);
};
