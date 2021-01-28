module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.post("/users", user.signUp);
  app.post("/login", user.signIn);
  app.get("/users/like", jwtMiddleware, user.like);
  app.get("/users/block", jwtMiddleware, user.block);
  app.patch("/users/block", jwtMiddleware, user.changeBlock);
  app.delete("/users/:userId", jwtMiddleware, user.deleteUser);
  app.patch("/users/:userId", jwtMiddleware, user.update);
  app.get("/users/:userId", jwtMiddleware, user.profile);

  app.get("/jwt", jwtMiddleware, user.isValidJWT);
};
