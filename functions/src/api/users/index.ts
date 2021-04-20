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
    admin
      .auth()
      .updateUser(uid, {
        disabled: true,
      })
      .then((userRecord) => {
        console.log("Successfully updated user", userRecord.toJSON());
      })
      .catch((error) => {
        console.log("Error updating user:", error);
      });
    res.status(200).send(`You requested user with UID = ${uid}`);
  }
);

userRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
