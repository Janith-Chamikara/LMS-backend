const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: Object,
  rating: {
    type: Number,
    default: 0,
  },
  comment: {
    type: String,
  },
  commentReplies: [Object],
});

const linkSchema = new mongoose.Schema({
  title: String,
  url: String,
});

const questionSchema = new mongoose.Schema({
  user: Object,
  question: String,
  questionReplies: [Object],
});

const courseInfoSchema = new mongoose.Schema({
  videoUrl: String,
  videoThumbnail: Object,
  title: String,
  videoSection: String,
  description: String,
  videoLength: Number,
  videoPlayer: String,
  links: [linkSchema],
  suggestions: String,
  questions: [questionSchema],
});

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Please provide a name for your course."],
    },
    description: {
      type: String,
      required: [true, "Course description is required."],
    },
    price: {
      type: Number,
      required: [true, "Course Price is required"],
    },
    estimatedPrice: {
      type: Number,
    },
    thumbnail: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
    tags: {
      type: [String], // Changed to an array of strings
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    demoUrl: {
      type: String,
      required: true,
    },
    benifits: [{ title: String }],
    preRequisties: [{ title: String }],
    reviews: [reviewSchema],
    ratings: Number,
    courseInfo: [courseInfoSchema],
    purchased: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
