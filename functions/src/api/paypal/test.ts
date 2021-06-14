import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Stripe } from "stripe";
import { env } from "../../env/env";
import * as http from "http";
// import { Base64 } from "js-base64";

const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: "2020-08-27",
});

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
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

    functions.logger.debug("#########################################################");

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

      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ["card"],
      //   customer_email: body.user.email,
      //   line_items: lineItems,
      //   mode: "payment",
      //   discounts: discounts,
      //   metadata: {
      //     pendingPaymentId: pendingPayment.id,
      //   },
      //   success_url: `${env.WEBURL}/course/payment-success`,
      //   cancel_url: `${env.WEBURL}/course/payment-error`,
      // });

      functions.logger.debug(pendingPayment);

      // const request = new paypal.orders.OrdersCreateRequest();
      // request.prefer("return=representation");
      // request.requestBody({
      //   intent: 'CAPTURE',
      //   application_context: {
      //     "return_url": `${env.WEBURL}/course/payment-success`,
      //     "cancel_url": `${env.WEBURL}/course/payment-error`,
      //     "brand_name": "Classbe",
      //     "locale": "en-US",
      //     "landing_page": "BILLING",
      //     "user_action": "CONTINUE"
      //   },
      //   purchase_units: [{
      //     amount: {
      //       currency_code: 'USD',
      //       value: '220.00'
      //     }
      //   }]
      // });

      // const PAYPAL_CLIENT = "AdmQ62w8ZwWGkqSp49Jzb5zTH-M7a5XDWm3-oAbaMag4snizNWfvsaTk21EZ3VYY9grlvtn5xZEv8oPz";
      // const PAYPAL_SECRET = "EIVt4OQ7_DbI4Ua9G-sS0C2neGYtgevTO0tPxlM-b9PCoCc1Yjq5IyT19B9wsIi0oiqCm1NSuYKuyW8N";

      const PAYPAL_OAUTH_API = "https://api-m.sandbox.paypal.com/v1/oauth2/token/";
      const PAYPAL_ORDER_API = "https://api-m.sandbox.paypal.com/v2/checkout/orders/";

      // const basicAuth = Base64.encode(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`);
      // const basicAuth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString("base64");
      const basicAuth = "QWRtUTYydzhad1dHa3FTcDQ5SnpiNXpUSC1NN2E1WERXbTMtb0FiYU1hZzRzbml6TldmdnNhVGsyMUVaM1ZZWTlncmx2dG41eFpFdjhvUHo6RUlWdDRPUTdfRGJJNFVhOUctc1MwQzJuZUdZdGdldlRPMHRQeGxNLWI5UENvQ2MxWWpxNUl5VDE5Qjl3c0lpMG9pcUNtMU5TdVlLdXlXOE4=";
      functions.logger.debug(basicAuth);

      const reqbody = {
        "grant_type": "client_credentials",
      };

      const options = {
        host: PAYPAL_OAUTH_API,
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(JSON.stringify(reqbody)),
        },
        body: JSON.stringify(reqbody),
      };

      let access: any;

      const req = await http.request(options, (res1) => {
        functions.logger.debug(res1);
        res.on("data", (d) => {
          functions.logger.debug(d);
          access = d;
        });
      });

      req.on("error", (error) => {
        functions.logger.debug(error);
        res.status(400).send({ code: 400, message: error, from: "1st" });
      });

      const options1 = {
        host: PAYPAL_ORDER_API,
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access ? access.access_token : " "}`,
        },
        data: {
          intent: "CAPTURE",
          purchase_units: [{
            amount: {
              currency_code: "USD",
              value: "220.00",
            },
          },
        ],
        },
      };

      const order = await http.request(options1, (res2) => {
        functions.logger.debug(res2);
        res.on("data", (o) => {
          functions.logger.debug(o);
          res.status(200).json({
            orderID: o.id,
          });
        });
      });

      order.on("error", (error) => {
        functions.logger.debug(error);
        res.status(400).send({ code: 400, message: error, from: "2nd", basicAuth: basicAuth, access: access.access_token });
      });

      return;
    } catch (error) {
      functions.logger.debug(error);
      res.status(400).send({ code: 400, message: error, from: "3rd" });
      return;
    }
  }
);

paypalRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
