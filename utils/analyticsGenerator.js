const getLast12MonthsAnalytics = async (model) => {
  let analytics = [];
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);

  for (let i = 11; i >= 0; i--) {
    const endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - i * 28
    );
    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() - 28
    );
    const period = `${startDate.toLocaleDateString("defalut", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}-${endDate.toLocaleDateString("defalut", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
    const count = await model.countDocuments({
      createdAt: {
        $lt: endDate,
        $gt: startDate,
      },
    });
    analytics.push({ period, count });
  }
  return analytics;
};

module.exports = { getLast12MonthsAnalytics };
