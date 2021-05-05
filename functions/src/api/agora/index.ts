import * as express from "express";
import { getTempRtcToken, getTempRtmToken } from "./get-temp-tokens";
import { getRtcToken, getRtmToken } from "./get-tokens";

export const agoraRouter = express.Router();

agoraRouter.get("/getRtcToken/:channelId", getRtcToken);
agoraRouter.get("/getRtmToken", getRtmToken);
agoraRouter.get("/getTempRtcToken/:channelId", getTempRtcToken);
agoraRouter.get("/getTempRtmToken", getTempRtmToken);

agoraRouter.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("No found");
});
