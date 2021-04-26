import * as express from "express";
import {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} from "agora-access-token";
import * as functions from "firebase-functions";

// This is the router which will be imported in our
// api hub (the index.ts which will be sent to Firebase Functions).
export const agoraRouter = express.Router();

// Now that we have a router, we can define routes which this router
// will handle. Please look into the Express documentation for more info.
agoraRouter.get(
  "/getRtcToken/:channelId",
  async function updateUserActive(req: express.Request, res: express.Response) {
    const appId = functions.config().agora.appid;
    const appCertificate = functions.config().agora.certificate;

    const expirationTimeInSeconds = 3600 * 10;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      // const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, req.params.channelId, req.params.userId, role, privilegeExpiredTs);
      // console.log("Token With Integer Number Uid: " + tokenA);
      const token = RtcTokenBuilder.buildTokenWithAccount(
        appId,
        appCertificate,
        req.params.channelId,
        req.body.user.uid,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );
      functions.logger.debug("Token With UserAccount: " + token);

      res.status(200).send({ error: null, code: 200, token: token });
    } catch (error) {
      functions.logger.debug(error);
      res.status(400).send({ error: "Token generation failed", code: 400 });
    }
  }
);

agoraRouter.get(
  "/getRtmToken",
  async function updateUserActive(req: express.Request, res: express.Response) {
    const appID = functions.config().agora.appid;
    const appCertificate = functions.config().agora.certificate;

    const expirationTimeInSeconds = 3600 * 10;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      const token = RtmTokenBuilder.buildToken(
        appID,
        appCertificate,
        req.body.user.uid,
        RtmRole.Rtm_User,
        privilegeExpiredTs
      );
      functions.logger.debug("Token With UserAccount: " + token);

      res.status(200).send({ error: null, code: 200, token: token });
    } catch (error) {
      functions.logger.debug(error);
      res.status(400).send({ error: "Token generation failed", code: 400 });
    }
  }
);

agoraRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
