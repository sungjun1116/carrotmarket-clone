module.exports = function (app) {
  const life = require("../controllers/lifeController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/town-lives", jwtMiddleware, life.selectPosts);
  app.post("/town-lives", jwtMiddleware, life.createPost);
  app.get("/town-lives/:postId", jwtMiddleware, life.selectPost);
  app.patch("/town-lives/:postId", jwtMiddleware, life.editPost);
  app.delete("/town-lives/:postId", jwtMiddleware, life.deletePost);
  app.get("/town-lives/:postId/comment", jwtMiddleware, life.selectComment);
};
