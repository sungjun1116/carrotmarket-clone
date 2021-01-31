const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const lifeDao = require("../dao/lifeDao");

// 동네생활 게시물 조회
exports.selectPosts = async function (req, res) {
  const { id } = req.verifiedToken;

  try {
    const postRows = await lifeDao.selectPosts(id);
    for (let i = 0; i < postRows.length; i++) {}
    // let countRows = await lifeDao.checkCountComment(id, postId);
    return res.json({
      isSucess: true,
      code: 200,
      message: "동네생활 게시글 조회 성공",
      result: postRows,
    });
  } catch (err) {
    logger.error(`App - selectPosts Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
