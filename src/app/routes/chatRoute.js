module.exports = function (app) {
  const chat = require("../controllers/chatController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/chat/:userId", jwtMiddleware, chat.selectChat);
  app.get("/chat/:userId/:roomId", jwtMiddleware, chat.selectRoom);
  app.post("/chatmessage/:roomId", jwtMiddleware, chat.sendMessage);
};
