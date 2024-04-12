require("dotenv").config();
const app = require("./app");

const connectDB = require("./utils/connectDB");

const port = process.env.PORT || 5001;
const authRoute = require("./routes/authRoutes");
const courseRoute = require("./routes/courseRoutes");
const orderRoute = require("./routes/orderRoute");
const notificationRoute = require("./routes/notificationRoute");
const analyticsRoute = require("./routes/analyticsRoute");
const layoutRoute = require("./routes/layoutRoute");
const errorHandler = require("./middlewares/errorHandler");

app.use("/api", authRoute);
app.use("/api", courseRoute);
app.use("/api", orderRoute);
app.use("/api", notificationRoute);
app.use("/api", analyticsRoute);
app.use("/api", layoutRoute);

app.get("/", (req, res) => {
  res.send("Yay!! Backend of lms is now accessible ");
});
app.use("/api", errorHandler);

app.listen(port, () => console.log(`Server started at port - ${port}`));
connectDB();

module.exports = app;
