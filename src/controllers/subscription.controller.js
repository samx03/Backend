import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const alreadySubscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (alreadySubscribed) {
    await Subscription.findOneAndDelete({
      subscriber: req.user?._id,
      channel: channelId,
    });
    return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed"));
  } else {
    const createdSubscriber = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });

    if (!createdSubscriber) {
      throw new ApiError(500, "Something went wrong while subscribing.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, createdSubscriber, "Subscribed successfully"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId) {
    throw new ApiError(400, "Invalid channel Id");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: new mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
      },
    },
    {
      $addFields: {
        subscriber: {
          $first: "$subscriber",
        },
      },
    },
    {
      $project: {
        subscriber: {
          _id: 1,
          username: 1,
          avatar: 1,
        },
        createdAt: 1,
      },
    },
  ]);

  if (!subscribers) {
    throw new ApiError(400, "Something went wrong while fetching subscribers");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId) {
    throw new ApiError(400, "Invalid subscriber id");
  }

  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "User not found");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribers: {
                $size: "$subscribers",
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        channel: {
          _id: 1,
          username: 1,
          avatar: 1,
          subscribers: 1,
        },
        createdAt: 1,
      },
    },
  ]);

  if (!subscribedChannels) {
    throw new ApiError(
      500,
      "Something went wrong while fetching channel list of user"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribedChannels, "Channels fetched successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
