module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.route("/app/signUp").post(user.signUp);
  app.post("/app/singIn", user.signIn);
  app.get("/app/users/:userId", jwtMiddleware, user.profile);

  app.get("/check", jwtMiddleware, user.check);
};

// app.route("/app/signIn").post(user.signIn);