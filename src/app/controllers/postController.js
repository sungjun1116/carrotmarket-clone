const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const postDao = require("../dao/postDao");

exports.selectPost = async function (req, res) {
  const { id } = req.verifiedToken;

  // 접속한 user의 위치 정보 추출
  const userLocatidonRows = await postDao.selectUserLocation(id);
  if (userLocatidonRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 308,
      message: "해당하는 위치정보가 없습니다.",
    });
  }

  try {
    const postRows = await postDao.selectPost(id, userLocatidonRows);
    if (postRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "게시물 검색 성공",
        data: postRows,
      });
    }
    return res.json({
      isSucess: false,
      code: 300,
      message: "게시물이 존재하지 않습니다.",
    });
  } catch (err) {
    logger.error(`App - findPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

exports.selectKeywordPost = async function (req, res) {
  const { id } = req.verifiedToken;

  // 접속한 user의 위치 정보 추출
  const userLocatidonRows = await postDao.selectUserLocation(id);
  if (userLocatidonRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 308,
      message: "해당하는 위치정보가 없습니다.",
    });
  }
  const { keyword } = req.params;
  let { showCompleted } = req.query;
  showCompleted ? (showCompleted = showCompleted) : (showCompleted = "true");

  try {
    const postKeywordRows = await postDao.selectKeywordPost(
      id,
      keyword,
      showCompleted,
      userLocatidonRows
    );
    if (postKeywordRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "게시물 검색 성공",
        data: postKeywordRows,
      });
    }
    return res.json({
      isSucess: false,
      code: 300,
      message: "게시물이 존재하지 않습니다.",
    });
  } catch (err) {
    logger.error(`App - selectKeywordPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
