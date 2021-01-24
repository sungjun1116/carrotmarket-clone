module.exports = function (app) {
  const post = require("../controllers/postController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/search", jwtMiddleware, post.selectPost);
  app.get("/search/:keyword", jwtMiddleware, post.selectKeywordPost);
  app.get("/posts/:postId", jwtMiddleware, post.selectArticleInfo);
  app.post("/posts", jwtMiddleware, post.createPost);
  app.patch("/posts/:postIdx", jwtMiddleware, post.editPost);
  app.delete("/posts/:postIdx", jwtMiddleware, post.deletePost);
  app.patch("/posts/:postIdx/reserved", jwtMiddleware, post.updateReserved);
  app.patch("/posts/:postIdx/completed", jwtMiddleware, post.updateCompleted);
  app.patch("/posts/:postIdx/like", jwtMiddleware, post.likePost);
};
