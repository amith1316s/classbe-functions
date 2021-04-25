import * as express from "express";
import {RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole} from "agora-access-token";

// This is the router which will be imported in our
// api hub (the index.ts which will be sent to Firebase Functions).
export const agoraRouter = express.Router();

// Now that we have a router, we can define routes which this router
// will handle. Please look into the Express documentation for more info.
agoraRouter.get(
  "/getRtcToken",
  async function updateUserActive(req: express.Request, res: express.Response) {
    const appID = "dd512a9f236b47ee839c42e17365630a";
    const appCertificate = "e5e27be9ead54aceaf213e9356364284";
    // const channelName = '7d72365eb983485397e3e3f9d460bdda';
    // const uid = 2882341273;
    // const account = "2882341273";
    const role = RtcRole.PUBLISHER;

    const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      // const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, req.params.channelId, req.params.userId, role, privilegeExpiredTs);
      // console.log("Token With Integer Number Uid: " + tokenA);
      const tokenB = RtcTokenBuilder.buildTokenWithAccount(appID, appCertificate, req.params.channelId, req.params.userId, role, privilegeExpiredTs);
      console.log("Token With UserAccount: " + tokenB);

      res.status(200).send({ error: null, code: 200, token: tokenB });
    } catch {
      res.status(400).send({ error: "Something went wrong!", code: 400 });
    }
  }
);

agoraRouter.get(
  "/getRtmToken",
  async function updateUserActive(req: express.Request, res: express.Response) {
    const appID = "dd512a9f236b47ee839c42e17365630a";
    const appCertificate = "e5e27be9ead54aceaf213e9356364284";
    // const account = "test_user_id";

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      const token = RtmTokenBuilder.buildToken(appID, appCertificate, req.params.userId, RtmRole.Rtm_User, privilegeExpiredTs);
      console.log("Rtm Token: " + token);

      res.status(200).send({ error: null, code: 200, token: token });
    } catch {
      res.status(400).send({ error: "Something went wrong!", code: 400 });
    }
  }
);

agoraRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
