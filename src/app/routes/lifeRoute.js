module.exports = function (app) {
  const life = require("../controllers/lifeController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/town-lives", jwtMiddleware, life.selectPosts);
};
