const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const postDao = require("../dao/postDao");

// 01.search API = 동네기반 상품 찾기
exports.selectPost = async function (req, res) {
  const { id } = req.verifiedToken;

  // 접속한 user의 위치 정보 추출
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 308,
      message: "해당하는 위치정보가 없습니다.",
    });
  }

  try {
    const postRows = await postDao.selectPost(id, userLocationRows);
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

// 02.keywordSearch API = 상품 검색(키워드)
exports.selectKeywordPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { keyword } = req.params;
  let { showCompleted } = req.query;
  showCompleted ? (showCompleted = showCompleted) : (showCompleted = "true");

  // 접속한 user의 위치 정보 추출
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 308,
      message: "해당하는 위치정보가 없습니다.",
    });
  }

  try {
    const postKeywordRows = await postDao.selectKeywordPost(
      id,
      keyword,
      showCompleted,
      userLocationRows
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

// 03. Article API = 상품 상세조회
exports.selectArticleInfo = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postId } = req.params;

  // 접속한 user의 위치 정보 추출
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 308,
      message: "해당하는 위치정보가 없습니다.",
    });
  }
  try {
    const articleInfoRows = await postDao.selectArticleInfo(
      postId,
      userLocationRows
    );
    if (articleInfoRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "상품 상세조회 검색 성공",
        data: articleInfoRows,
      });
    }
    return res.json({
      isSucess: false,
      code: 300,
      message: "상품이 존재하지 않습니다.",
    });
  } catch (err) {
    logger.error(`App - selectArticleInfo Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
