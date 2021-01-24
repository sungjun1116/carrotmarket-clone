module.exports = function (app) {
  const category = require("../controllers/categoryController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/category", jwtMiddleware, category.selectCategory);
  app.post("/category", jwtMiddleware, category.addCategory);
  app.delete("/category/:categoryIdx", jwtMiddleware, category.deleteCategory);
};
