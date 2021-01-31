const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const categoryDao = require("../dao/categoryDao");

// 관심 카테고리 조회
exports.selectCategory = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userId } = req.params;

  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }

  try {
    let likecategoryRows = await categoryDao.selectCategory(id);
    let categoryRows = ``;
    for (let i = 0; i < likecategoryRows.length; i++) {
      categoryRows = await categoryDao.selectCategoryStatus(id, likecategoryRows[i].categoryId);
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
  const { userId, categoryId } = req.params;

  const conn = await pool.getConnection();

  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }

  try {
    await conn.beginTransaction();

    const deleteCategoryRow = await categoryDao.deleteCategory(id, categoryId);
    console.log(deleteCategoryRow);
    if (deleteCategoryRow[0].affectedRows === 0) {
      const insertCategoryRow = await categoryDao.insertCategory(id, categoryId);
      if (insertCategoryRow.length === 0) {
        return res.json({
          isSuccess: false,
          code: 400,
          message: "관심카테고리 변경 실패",
        });
      }
    }

    const categoryStatus = await categoryDao.selectCategoryStatus(id, categoryId);
    if (categoryStatus[0].likeStatus === 1) {
      await conn.commit();
      return res.json({
        isSuccess: true,
        code: 200,
        message: "관심 카테고리 추가 성공",
      });
    } else {
      await conn.commit();
      return res.json({
        isSuccess: true,
        code: 201,
        message: "관심 카테고리 헤제 성공",
      });
    }
  } catch (err) {
    await conn.rollback();
    logger.error(`App - changeCategory Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};
