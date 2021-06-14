import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { env } from "../../env/env";
const paypal = require("@paypal/checkout-server-sdk");

export const paypalRouter = express.Router();

paypalRouter.post(
  "/get-payments",
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

    // Products adding
    let costValue = 0;
    let unitValue = 0;
    if (course && classes.length > 0) {
      enorlledClasses.forEach((c) => {
        unitValue = course ? course.ratePerHour : 0;
        costValue += unitValue * c.hours;
      });
    } else {
      res
        .status(400)
        .send({ code: 400, message: "Course or classes not found" });
      return;
    }

    const netCostValue = costValue - (costValue * discountPercent) / 100;

    try {
      const pendingPayment = await db
        .collection(env.FIRESTORE_COLLECTIONS.PENDINGPAYMENTS)
        .add({
          uid: body.user.uid,
          teacherId: course.teacherId,
          email: body.user.email,
          classes: body.classIds,
          course: body.courseId,
          promoCode: body.promoCode,
          cost: costValue,
        });

      functions.logger.debug(pendingPayment);

      const PAYPAL_CLIENT =
        "AdmQ62w8ZwWGkqSp49Jzb5zTH-M7a5XDWm3-oAbaMag4snizNWfvsaTk21EZ3VYY9grlvtn5xZEv8oPz";
      const PAYPAL_SECRET =
        "EIVt4OQ7_DbI4Ua9G-sS0C2neGYtgevTO0tPxlM-b9PCoCc1Yjq5IyT19B9wsIi0oiqCm1NSuYKuyW8N";

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: "AUTHORIZE",
        application_context: {
          return_url: `${env.WEBURL}/course/payment-success`,
          cancel_url: `${env.WEBURL}/course/payment-error`,
          brand_name: "Classbe",
          locale: "en-US",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
        purchase_units: [
          {
            reference_id: pendingPayment.id,
            amount: {
              currency_code: "USD",
              value: netCostValue.toString(),
            },
          },
        ],
      });

      let order;
      try {
        order = await new paypal.core.PayPalHttpClient(
          new paypal.core.SandboxEnvironment(PAYPAL_CLIENT, PAYPAL_SECRET)
        ).execute(request);
      } catch (err) {
        console.error(err);
        return res.send(500);
      }

      res.status(200).json({
        orderID: order.result.id,
      });

      return;
    } catch (error) {
      functions.logger.debug(error);
      res.status(400).send({ code: 400, message: error, from: "3rd" });
      return;
    }
  }
);

// https://us-central1-classbe-1deb7.cloudfunctions.net/api/paypal/complete-checkout
paypalRouter.post(
  "/complete-checkout",
  async function createPayment(req: express.Request, res: express.Response) {
    const body = req.body.object;
    const paymentPendingId = body.purchase_units[0].reference_id;
    const db = admin.firestore();

    try {
      // Add payment details for future reference
      await db.collection(env.FIRESTORE_COLLECTIONS.PAYMENTS).add({
        ...body,
        created: body.id,
        eventId: body.id,
      });

      const paymentDataRef = db
        .collection(env.FIRESTORE_COLLECTIONS.PENDINGPAYMENTS)
        .doc(paymentPendingId);
      const paymentData = (await paymentDataRef.get()).data();

      if (paymentData) {
        const batch = db.batch();

        // Update wallet in user collection
        batch.update(
          db.collection(env.FIRESTORE_COLLECTIONS.USERS).doc(paymentData.teacherId),
          {
            wallet: admin.firestore.FieldValue.increment(paymentData.cost),
          }
        );

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
        functions.logger.error("No payment data found in pending");
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
      functions.logger.error(error);
      res.status(400).send({ error: error, code: 400 });
      return;
    }
  }
);

paypalRouter.post(
  "/authorize-paypal-transaction",
  async function AuthorizePaypalTransaction(
    req: express.Request,
    res: express.Response
  ) {
    const orderID = req.body.orderID;

    const PAYPAL_CLIENT =
      "AdmQ62w8ZwWGkqSp49Jzb5zTH-M7a5XDWm3-oAbaMag4snizNWfvsaTk21EZ3VYY9grlvtn5xZEv8oPz";
    const PAYPAL_SECRET =
      "EIVt4OQ7_DbI4Ua9G-sS0C2neGYtgevTO0tPxlM-b9PCoCc1Yjq5IyT19B9wsIi0oiqCm1NSuYKuyW8N";

    const request = new paypal.orders.OrdersAuthorizeRequest(orderID);
    request.requestBody({});

    try {
      const authorization = await new paypal.core.PayPalHttpClient(
        new paypal.core.SandboxEnvironment(PAYPAL_CLIENT, PAYPAL_SECRET)
      ).execute(request);

      const authorizationID =
        authorization.result.purchase_units[0].payments.authorizations[0].id;
      console.log(authorizationID);
    } catch (err) {
      console.error(err);
      return res.status(500).send({ code: 400, message: err });
    }
    return res.send(200);
  }
);

paypalRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
