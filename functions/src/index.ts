import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as usersApi from "./api/users";

admin.initializeApp(functions.config().firebase);

const app = express();

app.disable("x-powered-by");

// Any requests to /api/users will be routed to the user router!
app.use("/users", usersApi.userRouter);

app.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("Not found");
});

exports.api = functions.https.onRequest(app);
