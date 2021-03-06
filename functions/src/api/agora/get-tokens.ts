import * as express from "express";
import {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} from "agora-access-token";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { env } from "../../env/env";

export async function getRtcToken(
  req: express.Request,
  res: express.Response
) {
  const appId = functions.config().agora.appid;
  const appCertificate = functions.config().agora.certificate;

  const expirationTimeInSeconds = 3600 * 10;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const db = admin.firestore();
  const userRef = db
    .collection(env.FIRESTORE_COLLECTIONS.USERS)
    .doc(req.body.user.uid);
  let user = null;

  try {
    user = (await userRef.get()).data();
    if (!user || !user.intUID) {
      res.status(400).send({
        error: "Token generation failed due to invalid user",
        code: 400,
      });
      return;
    }
  } catch (error) {
    res.status(400).send({
      error: "Token generation failed due to invalid user",
      code: 400,
    });
    return;
  }

  try {
    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      req.params.channelId,
      user.intUID,
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

export async function getRtmToken(
  req: express.Request,
  res: express.Response
) {
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
