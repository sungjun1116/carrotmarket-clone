const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const categoryDao = require("../dao/categoryDao");

// 관심 카테고리 조회
exports.selectCategory = async function (req, res) {
  const { id } = req.verifiedToken;

  try {
    let likecategoryRows = await categoryDao.selectCategory(id);
    let categoryRows = ``;
    for (let i = 0; i < likecategoryRows.length; i++) {
      categoryRows = await categoryDao.selectCategoryStatus(
        id,
        likecategoryRows[i].categoryIdx
      );
      likecategoryRows[i].likeStatus = categoryRows[0].likeStatus;
    }
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
      code: 400,
      message: "관심 카테고리 조회 실패",
    });
  } catch (err) {
    logger.error(`App - selectCategory Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 관심 카테고리 추가, 헤제
exports.changeCategory = async function (req, res) {
  const { id } = req.verifiedToken;
  const { categoryIdx } = req.params;

  try {
    const deleteCategoryRow = await categoryDao.deleteCategory(id, categoryIdx);
    if (deleteCategoryRow.affectedRows === 0) {
      const insertCategoryRow = await categoryDao.insertCategory(
        id,
        categoryIdx
      );
      if (insertCategoryRow.length === 0) {
        return res.json({
          isSuccess: false,
          code: 411,
          message: "잘못된 categoryIdx입니다.",
        });
      }
    }

    const categoryStatus = await categoryDao.selectCategoryStatus(
      id,
      categoryIdx
    );
    console.log(categoryStatus);
    if (categoryStatus[0].likeStatus === 1) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "관심 카테고리 추가 성공",
      });
    } else {
      return res.json({
        isSuccess: true,
        code: 201,
        message: "관심 카테고리 헤제 성공",
      });
    }
  } catch (err) {
    logger.error(`App - changeCategory Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
