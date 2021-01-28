module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.post("/users", user.signUp);
  app.post("/login", user.signIn);
  app.get("/liked-users/:userId", jwtMiddleware, user.like);
  app.patch("/liked-users/:postId", jwtMiddleware, user.likePost);
  app.get("/blocked-users/:userId", jwtMiddleware, user.block);
  app.patch("/blocked-users/:userId/:targetId", jwtMiddleware, user.changeBlock);
  app.delete("/users/:userId", jwtMiddleware, user.deleteUser);
  app.patch("/users/:userId", jwtMiddleware, user.update);
  app.get("/users/:userId", jwtMiddleware, user.profile);

  app.get("/jwt", jwtMiddleware, user.isValidJWT);
};
