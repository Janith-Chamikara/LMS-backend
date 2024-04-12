require("dotenv").config();
const app = require("./api/index");


const connectDB = require("./utils/connectDB");

const port = process.env.PORT || 5001;
const authRoute = require("./routes/authRoutes");
const courseRoute = require("./routes/courseRoutes");
const orderRoute = require("./routes/orderRoute");
const notificationRoute = require("./routes/notificationRoute");
const analyticsRoute = require("./routes/analyticsRoute");
const layoutRoute = require("./routes/layoutRoute");
const errorHandler = require("./middlewares/errorHandler");

app.use("/", authRoute);
app.use("/", courseRoute);
app.use("/", orderRoute);
app.use("/", notificationRoute);
app.use("/", analyticsRoute);
app.use("/", layoutRoute);

app.use("/", errorHandler);

app.listen(port, () => console.log(`Server started at port - ${port}`));
connectDB();
