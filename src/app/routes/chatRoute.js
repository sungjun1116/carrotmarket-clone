module.exports = function (app) {
  const post = require("../controllers/chatController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/chat", jwtMiddleware, post.selectChat);
};
