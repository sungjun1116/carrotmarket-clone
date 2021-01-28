module.exports = function (app) {
  const category = require("../controllers/categoryController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/category", jwtMiddleware, category.selectCategory);
  app.patch("/category/:categoryIdx", jwtMiddleware, category.changeCategory);
};
