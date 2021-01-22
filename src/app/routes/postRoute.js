module.exports = function (app) {
  const post = require("../controllers/postController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/app/search", jwtMiddleware, post.selectPost);
  app.get("/app/search/:keyword", jwtMiddleware, post.selectKeywordPost);

  app.get("/app/posts/:postId", jwtMiddleware, post.selectArticleInfo);
};
