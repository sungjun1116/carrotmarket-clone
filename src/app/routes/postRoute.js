module.exports = function (app) {
  const post = require("../controllers/postController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/posts", jwtMiddleware, post.selectPost);
  app.post("/posts", jwtMiddleware, post.createPost);
  app.get("/posts/:postId", jwtMiddleware, post.selectArticleInfo);
  app.patch("/posts/:postId", jwtMiddleware, post.editPost);
  app.delete("/posts/:postId", jwtMiddleware, post.deletePost);
  app.patch("/posts/:postId/status", jwtMiddleware, post.updateStatus);
  app.get("/collected-posts/:userId", jwtMiddleware, post.selectCollectedPost);
  app.patch("/collected-posts/:userId/:targetUserId", jwtMiddleware, post.collectPost);
};
