import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Stripe } from "stripe";
import { env } from "../../env/env";

const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: "2020-08-27",
});

export const stripeRouter = express.Router();

stripeRouter.post(
  "/stripe-session",
  async function createSession(req: express.Request, res: express.Response) {
    const body: {
      courseId: string;
      classIds: string[];
      promoCode: string | null;
      user: any;
    } = req.body;
    const db = admin.firestore();

    let course: FirebaseFirestore.DocumentData | undefined;
    let promoCode: FirebaseFirestore.DocumentData | undefined;
    let classes: FirebaseFirestore.DocumentData[] = [];
    let enorlledClasses: FirebaseFirestore.DocumentData[] = [];
    let discountPercent = 0;
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
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
          .where("courseId", "==", body.courseId)
          .get()
      ).docs.map((c) => c.data());

      enorlledClasses = classes.filter((c) => body.classIds.indexOf(c.id) >= 0);
      if (enorlledClasses.length === 0) {
        res.status(400).send({ code: 400, message: "Classes not found" });
        return;
      }
    } catch (error) {
      res.status(400).send({ code: 400, message: "Classes not found" });
      return;
    }

    try {
      if (body.promoCode) {
        promoCode = (
          await db
            .collection(env.FIRESTORE_COLLECTIONS.PROMOCODES)
            .doc(body.promoCode)
            .get()
        ).data();
      }
    } catch (error) {
      res.status(400).send({ code: 400, message: "Promo code is not valid" });
      return;
    }

    // Promo calculations
    if (
      promoCode &&
      promoCode.enabled &&
      promoCode.limit > promoCode.usedBy.length
    ) {
      const expiers = new Date(promoCode.expiers);
      const now = new Date();

      if (expiers > now) {
        discountPercent += promoCode.percentage;
      } else {
        res.status(400).send({ code: 400, message: "Promo code is not valid" });
        return;
      }
    } else if (promoCode) {
      res.status(400).send({ code: 400, message: "Promo code is not valid" });
      return;
    }

    if (classes.length === enorlledClasses.length) {
      discountPercent += 5;
    }

    // Creating onetime checkout coupon
    if (discountPercent > 0) {
      try {
        const coupon = await stripe.coupons.create({
          percent_off: discountPercent,
          duration: "once",
        });
        discounts.push({ coupon: coupon.id });
      } catch (error) {
        functions.logger.error("Coupon generation faild");
        res.status(400).send({ code: 400, message: "Something went wrong" });
        return;
      }
    }

    // Products adding
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (course && classes.length > 0) {
      enorlledClasses.forEach((c) => {
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
          promoCode: body.promoCode,
        });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: body.user.email,
        line_items: lineItems,
        mode: "payment",
        discounts: discounts,
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
