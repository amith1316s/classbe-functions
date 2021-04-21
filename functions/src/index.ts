import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as usersApi from "./api/users";
import { validateFirebaseIdToken } from "./auth/token-validator";

admin.initializeApp(functions.config().firebase);

const app = express();

app.disable("x-powered-by");

app.use(cors({ origin: true }));
app.use(cookieParser());
app.use(validateFirebaseIdToken);

// Any requests to /api/users will be routed to the user router!
app.use("/users", usersApi.userRouter);

app.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("Not found");
});

exports.api = functions.https.onRequest(app);
