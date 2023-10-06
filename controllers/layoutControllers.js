const Layout = require("../models/layoutModel");
const ErrorHandler = require("../utils/ErrorHandler");
const { cloudinary } = require("../utils/cloudinary");

const createLayout = async (req, res, next) => {
  try {
    const { type } = req.body;
    const isTypeExists = await Layout.findOne({ type });
    if (isTypeExists) {
      return next(new ErrorHandler(`Type - ${type} already exists.`, 400));
    }

    if (type === "banner") {
      const { image, title, subTitle } = req.body;
      const cloud = await cloudinary.v2.uploader.upload(image, {
        folder: "layout-banners",
      });
      const newImage = {
        publc_id: cloud.public_id,
        url: cloud.secure_url,
      };
      const newBanner = {
        image: newImage,
        title,
        subTitle,
      };
      const layout = await Layout.create({ type, newBanner });
      res.status(200).json({
        success: true,
        message: "Created Layout.",
        layout,
      });
    }
    if (type === "faq") {
      const { faqs } = req.body;
      if (faqs.length === 0) {
        return next(new ErrorHandler("Please provide some faqs.", 400));
      }
      const layout = await Layout.create({ type, faq: [...faqs] });
      res.status(200).json({
        success: true,
        message: "Created Layout.",
        layout,
      });
    }
    if (type === "category") {
      const { categories } = req.body;
      if (categories.length === 0) {
        return next(new ErrorHandler("Please provide some categories.", 400));
      }
      const layout = await Layout.create({
        type,
        categories: [...categories],
      });
      res.status(200).json({
        success: true,
        message: "Created Layout.",
        layout,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const updateLayout = async (req, res, next) => {
  try {
    const { type } = req.body;
    const layout = await Layout.findOne({ type });
    if (!layout) {
      return next(new ErrorHandler("Create a layout to update.", 400));
    }
    if (type === "banner") {
      const { url, title, subTitle } = req.body;
      if (layout?.banner?.public_id) {
        await cloudinary.v2.uploader.destroy(public_id);
        const cloud = await cloudinary.v2.uploader.upload(url, {
          folder: "layout-banners",
        });
        const image = {
          publc_id: cloud.public_id,
          url: cloud.secure_url,
        };
        image && (layout.banner.image = image);
        title && (layout.banner.title = title);
        subTitle && (layout.banner.subTitle = subTitle);
        const updatedLayout = await layout.save();
        res.status(200).json({
          success: true,
          messge: "Banner updated successfully.",
          updatedLayout,
        });
      }
    }
    if (type === "faq") {
      const layout = await Layout.findOne({ type });

      const { faqs } = req.body;
      if (!faqs) {
        return next(new ErrorHandler("Please provide a faqs array.", 400));
      }
      layout.faq = [...faqs];
      const updatedLayout = await layout.save();
      res.status(200).json({
        success: true,
        messge: "FAQ updated successfully.",
        updatedLayout,
      });
    }
    if (type === "category") {
      const { categories } = req.body;
      if (!categories) {
        return next(
          new ErrorHandler("Please provide a categories array.", 400)
        );
      }
      const layout = await Layout.findOne({ type });
      layout.categories = [...categories];
      const updatedLayout = await layout.save();
      res.status(200).json({
        success: true,
        messge: "Categories updated successfully.",
        updatedLayout,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
const getLayoutByType = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!type) {
      return next(new ErrorHandler("Please provide type of the layout.", 400));
    }
    const layout = await Layout.findOne({ type });
    if (!layout) {
      return next(new ErrorHandler("Invalid type.", 400));
    }
    res.status(200).json({
      success: true,
      layout,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
module.exports = {
  createLayout,
  updateLayout,
  getLayoutByType,
};
