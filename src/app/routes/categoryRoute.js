module.exports = function (app) {
  const category = require("../controllers/categoryController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/category/:userId", jwtMiddleware, category.selectCategory);
  app.patch("/category/:userId/:categoryId", jwtMiddleware, category.changeCategory);
};
