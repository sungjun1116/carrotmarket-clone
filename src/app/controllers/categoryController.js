const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const categoryDao = require("../dao/categoryDao");

// 관심 카테고리 조회
exports.selectCategory = async function (req, res) {
  const { id } = req.verifiedToken;

  try {
    const likecategoryRows = await categoryDao.selectCategory(id);
    if (likecategoryRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "관심 카테고리 조회 성공",
        data: likecategoryRows,
      });
    }
    return res.json({
      isSucess: false,
      code: 300,
      message: "관심 카테고리 정보가 존재하지 않습니다.",
    });
  } catch (err) {
    logger.error(`App - selectCategory Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 관심 카테고리 추가
exports.addCategory = async function (req, res) {
  const { id } = req.verifiedToken;
  const { categoryId } = req.body;
  const categoryRow = await categoryDao.categoryCheck(id, categoryId);

  try {
    if (categoryRow.length < 1) {
      const insertCategoryRow = await categoryDao.insertCategory(
        id,
        categoryId
      );
      if (insertCategoryRow.length > 0) {
        return res.json({
          isSuccess: true,
          code: 200,
          message: "추가 됐습니다.",
        });
      }
    } else if (categoryRow[0].likeStatus === 0) {
      const updateCategoryRow = await categoryDao.updateCategory(
        id,
        categoryId
      );
      if (updateCategoryRow.length > 0) {
        return res.json({
          isSuccess: true,
          code: 200,
          message: "추가 됐습니다.",
        });
      }
    } else {
      return res.json({
        isSucess: false,
        code: 300,
        message: "이미 추가된 카테고리 입니다.",
      });
    }
  } catch (err) {
    logger.error(`App - addCategory Query error\n: ${JSON.stringify(err)}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 관심 카테고리 헤제
exports.deleteCategory = async function (req, res) {
  const { id } = req.verifiedToken;
  const { categoryId } = req.body;
  const categoryRow = await categoryDao.categoryCheck(id, categoryId);

  try {
    if (categoryRow.length < 1) {
      return res.json({
        isSuccess: false,
        code: 300,
        message: "해당 카테고리는 관심 카테고리로 등록되지 않았습니다.",
      });
    } else {
      const deleteCategoryRow = await categoryDao.deleteCategory(
        id,
        categoryId
      );
      return res.json({
        isSuccess: true,
        code: 200,
        message: "헤제 됐습니다",
      });
    }
  } catch (err) {
    logger.error(`App - deleteCategory Query error\n: ${JSON.stringify(err)}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
