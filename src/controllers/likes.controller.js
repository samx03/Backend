import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked._id);
    return res.status(200).json(new ApiResponse(200, {}, "Like removed"));
  } else {
    const like = await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });

    if (!like) {
      throw new ApiError(400, "Some error occured. You cannot like this video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, like, "Video liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //comment not coded yet
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked._id);
    return res.status(200).json(new ApiResponse(200, {}, "Like removed"));
  } else {
    const like = await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });

    if (!like) {
      throw new ApiError(400, "Some error occured. You cannot like this tweet");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, like, "Tweet liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        video: {
          _id: 1,
          thumbnail: 1,
          title: 1,
          duration: 1,
          owner: {
            _id: 1,
            username: 1,
            avatar: 1,
          },
          createdAt: 1,
        },
      },
    },
  ]);

  if (likedVideos.length === 0) {
    throw new ApiError(400, "You have not liked any videos");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleTweetLike, getLikedVideos };
