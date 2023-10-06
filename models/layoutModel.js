const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
  },
  answer: {
    type: String,
  },
});

const categorySchema = new mongoose.Schema({
  title: { type: String },
});

const bannerImageSchema = new mongoose.Schema({
  public_id: { type: String },
  url: { type: String },
});

const layoutSchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    faq: [faqSchema],
    categories: [categorySchema],
    banner: {
      image: bannerImageSchema,
      title: String,
      subTitle: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Layout", layoutSchema);
