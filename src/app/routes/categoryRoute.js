module.exports = function (app) {
  const category = require("../controllers/categoryController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/app/category", jwtMiddleware, category.selectCategory);
  app.post("/app/category", jwtMiddleware, category.addCategory);
  app.delete("/app/category", jwtMiddleware, category.deleteCategory);
};
