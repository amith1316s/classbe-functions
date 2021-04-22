import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Stripe } from "stripe";
import { env } from "../../env/env";

export const stripeRouter = express.Router();

stripeRouter.post(
  "/stripe-session",
  async function createSession(req: express.Request, res: express.Response) {
    const body = req.body;
    const db = admin.firestore();

    let course: FirebaseFirestore.DocumentData | undefined;
    let classes: FirebaseFirestore.DocumentData[] = [];
    try {
      course = (
        await db
          .collection(env.FIRESTORE_COLLECTIONS.COURSES)
          .doc(body.courseId)
          .get()
      ).data();
    } catch (error) {
      res.status(400).send({ code: 400, message: "Course not found" });
      return;
    }

    try {
      classes = (
        await db
          .collection(env.FIRESTORE_COLLECTIONS.CLASSES)
          .where("id", "in", body.classIds)
          .get()
      ).docs.map((c) => c.data());
    } catch (error) {
      res.status(400).send({ code: 400, message: "Classes not found" });
      return;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (course && classes.length > 0) {
      classes.forEach((c) => {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: c.title,
              metadata: {
                id: c.id,
              },
            },
            unit_amount: course ? course.ratePerHour * 100 : 0,
          },
          quantity: c.hours,
        });
      });
    } else {
      res
        .status(400)
        .send({ code: 400, message: "Course or classes not found" });
      return;
    }

    try {
      const pendingPayment = await db
        .collection(env.FIRESTORE_COLLECTIONS.PENDINGPAYMENTS)
        .add({
          uid: body.user.uid,
          email: body.user.email,
          classes: body.classIds,
          course: body.courseId,
        });

      const session = await new Stripe(functions.config().stripe.secret, {
        apiVersion: "2020-08-27",
      }).checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: body.user.email,
        line_items: lineItems,
        mode: "payment",
        metadata: {
          pendingPaymentId: pendingPayment.id,
        },
        success_url: `${env.WEBURL}/course/${course.id}`,
        cancel_url: `${env.WEBURL}/course/${course.id}`,
      });

      res.status(200).send({ id: session.id });
      return;
    } catch (error) {
      functions.logger.debug(error);
      res.status(400).send({ code: 400, message: error });
      return;
    }
  }
);

stripeRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
