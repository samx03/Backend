import { Router } from "express";
import {
  getLikedVideos,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/likes.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/likedVideos").get(getLikedVideos);

export default router;
