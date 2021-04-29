import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { env } from "../../env/env";

export const addUserToFirestore = (user: any) => {
    const db = admin.firestore();
    db.collection(env.FIRESTORE_COLLECTIONS.USERS).doc(user);

    logger.debug("USER CREATE", user);
};