module.exports = function (app) {
  const post = require("../controllers/postController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/posts", jwtMiddleware, post.selectPost);
  app.post("/posts", jwtMiddleware, post.createPost);
  app.get("/posts/:postId", jwtMiddleware, post.selectArticleInfo);
  app.patch("/posts/:postId", jwtMiddleware, post.editPost);
  app.delete("/posts/:postId", jwtMiddleware, post.deletePost);
  app.patch("/posts/:postId/reserved", jwtMiddleware, post.updateReserved);
  app.patch("/posts/:posId/completed", jwtMiddleware, post.updateCompleted);
  app.patch("/posts/:postId/like", jwtMiddleware, post.likePost);
};
