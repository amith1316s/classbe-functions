import * as express from "express";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { env } from "../../env/env";

export const paymentRouter = express.Router();

paymentRouter.post(
  "/webhook",
  async function createPayment(req: express.Request, res: express.Response) {
    const body = req.body;
    const paymentPendingId = body.data.object.metadata.pendingPaymentId;
    const db = admin.firestore();

    try {
      // Add payment details for future reference
      await db.collection(env.FIRESTORE_COLLECTIONS.PAYMENTS).add({
        ...body.data.object,
        created: body.created,
        eventId: body.id,
      });

      const paymentDataRef = db
        .collection(env.FIRESTORE_COLLECTIONS.PENDINGPAYMENTS)
        .doc(paymentPendingId);
      const paymentData = (await paymentDataRef.get()).data();

      if (paymentData) {
        const batch = db.batch();

        // Update course with student id
        batch.update(
          db
            .collection(env.FIRESTORE_COLLECTIONS.COURSES)
            .doc(paymentData.course),
          {
            studentIds: admin.firestore.FieldValue.arrayUnion(paymentData.uid),
          }
        );

        // Update classes with student id
        paymentData.classes.forEach((c: string) => {
          batch.update(
            db.collection(env.FIRESTORE_COLLECTIONS.CLASSES).doc(c),
            {
              studentIds: admin.firestore.FieldValue.arrayUnion(
                paymentData.uid
              ),
            }
          );
        });

        await batch.commit();
      } else {
        logger.error("No payment data found in pending");
        res
          .status(400)
          .send({ error: "No payment data found in pending", code: 400 });
        return;
      }

      // Delete pending payment data since payment is a success
      await paymentDataRef.delete();

      res.status(200).send({ error: null, code: 200 });
      return;
    } catch (error) {
      logger.error(error);
      res.status(400).send({ error: error, code: 400 });
      return;
    }
  }
);

paymentRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
