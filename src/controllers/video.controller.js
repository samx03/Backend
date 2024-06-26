import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 5, sortType, sortBy, query, userId } = req.query;

  const aggregationPipeline = [];

  //Sort Type -- Ascending or descending
  if (sortType === "asc") {
    aggregationPipeline.push({ $sort: { createdAt: 1 } });
  } else if (sortType === "desc") {
    aggregationPipeline.push({ $sort: { createdAt: -1 } });
  }

  // Sort alphabetically
  if (sortBy === "atoz") {
    aggregationPipeline.push({ $sort: { title: 1 } });
  } else if (sortBy === "ztoa") {
    aggregationPipeline.push({ $sort: { title: -1 } });
  }

  //Search query
  if (query) {
    aggregationPipeline.unshift({
      $search: {
        index: "default",
        text: {
          query: query,
          path: "title",
        },
      },
    });
  }

  //Sort by user id
  //Check if userId is passed
  if (userId) {
    const ownerId = new mongoose.Types.ObjectId(userId);
    aggregationPipeline.push({ $match: { owner: ownerId } });
  }

  const aggregate = Video.aggregate(aggregationPipeline);

  Video.aggregatePaginate(aggregate, { page, limit })
    .then((results) =>
      res
        .status(200)
        .json(new ApiResponse(200, results, "Videos fetched successfully"))
    )
    .catch((err) => {
      res
        .status(400)
        .json(new ApiResponse(400, "Error occured while fetching videos"));
    });
});

export const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  let videoLocalPath;
  let thumbnailLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.video) &&
    req.files.video.length > 0
  ) {
    videoLocalPath = req.files.video[0].path;
  }

  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video and thumbnail is required");
  }

  //upload to cloudinary
  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!video.url || !thumbnail.url) {
    throw new ApiError(
      500,
      "Error uploading video and thumbnail to cloudinary"
    );
  }

  const publishedVideo = await Video.create({
    videoFile: video.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: video.duration,
    owner: req.user._id,
  });

  if (!publishedVideo) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, publishedVideo, "Video published successfully"));
});

export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully."));
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You cannot update this video since you are not the owner"
    );
  }

  if (!title || !description) {
    throw new ApiError(401, "Title or description is required");
  }

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(401, "Thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail.url) {
    throw new ApiError(401, "Error uploading thumbnail to cloudinary");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You cannot update this video since you are not the owner"
    );
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully."));
});

export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You cannot update this video since you are not the owner"
    );
  }

  const currentVideo = await Video.findById(videoId);
  if (!currentVideo) {
    throw new ApiError(404, "Video not found");
  }

  const currentPublishStatus = currentVideo.isPublished;

  const updatedPublishStatus = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !currentPublishStatus,
      },
    },
    { new: true }
  ).select("-videoFile -thumbnail -duration -views");

  if (!updatedPublishStatus) {
    throw new ApiError(400, "Error updating status");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPublishStatus, "Publish status updated"));
});
