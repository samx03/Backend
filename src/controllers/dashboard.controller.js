import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

// TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
      },
    },
  ]);

  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesOnVideo: {
          $size: "$likes",
        },
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: "$likesOnVideo" },
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const channelStats = {
    totalSubscribers: totalSubscribers[0]?.totalSubscribers || 0,
    totalLikes: video[0]?.totalLikes || 0,
    totalVideos: video[0]?.totalVideos || 0,
    totalViews: video[0]?.totalViews || 0,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesOnVideo: { $size: "$likes" },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        likesOnVideo: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
