import * as express from "express";
import * as admin from "firebase-admin";

// This is the router which will be imported in our
// api hub (the index.ts which will be sent to Firebase Functions).
export const userRouter = express.Router();

// Now that we have a router, we can define routes which this router
// will handle. Please look into the Express documentation for more info.
userRouter.put(
  "/:uid",
  async function updateUserActive(req: express.Request, res: express.Response) {
    const uid = req.params.uid;
    console.log(req.body);

    try {
      const userRecord = await admin.auth().getUser(uid);
      await admin.auth().updateUser(uid, {
        disabled: !userRecord.disabled,
      });
      res.status(200).send({ error: null, code: 200 });
    } catch {
      res.status(400).send({ error: "No users found!", code: 400 });
    }
  }
);

userRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
