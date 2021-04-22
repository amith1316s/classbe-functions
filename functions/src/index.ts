import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as usersApi from "./api/users";

admin.initializeApp(functions.config().firebase);

const app = express();

app.disable("x-powered-by");

app.use(cors({ origin: true }));
app.use(cookieParser());

app.use("/users", usersApi.userRouter);

app.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("Not found");
});

exports.api = functions.https.onRequest(app);
