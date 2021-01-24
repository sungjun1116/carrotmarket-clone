module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.route("/signUp").post(user.signUp);
  app.post("/login", user.signIn);
  app.get("/users/like", jwtMiddleware, user.like);
  app.get("/users/block", jwtMiddleware, user.block);
  app.get("/users/:userIdx", jwtMiddleware, user.profile);

  app.get("/check", jwtMiddleware, user.check);
};

// app.route("/app/signIn").post(user.signIn);
