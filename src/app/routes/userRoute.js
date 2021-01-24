module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.post("/users", user.signUp);
  app.post("/login", user.signIn);
  app.delete("/users", jwtMiddleware, user.deleteUser);
  app.patch("/users", jwtMiddleware, user.update);
  app.get("/users/like", jwtMiddleware, user.like);
  app.get("/users/block", jwtMiddleware, user.block);
  app.patch("/users/block", jwtMiddleware, user.changeBlock);
  app.get("/users/:userIdx", jwtMiddleware, user.profile);

  app.get("/check", jwtMiddleware, user.check);
};
