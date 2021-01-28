module.exports = function (app) {
  const index = require("../controllers/indexController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/", index.default);
  // app.get('/app', jwtMiddleware, index.default);
};
