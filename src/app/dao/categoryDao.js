const { pool } = require("../../../config/database");

// selectCategory
async function selectCategory(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectCategoryQuery = `
                SELECT LikeCategory.categoryId, categoryName
                FROM LikeCategory inner join Category on LikeCategory.categoryid = Category.categoryId
                WHERE LikeCategory.userId = ?;
                `;
  const selectCategoryParams = [userId];
  const [likecategoryRows] = await connection.query(selectCategoryQuery, selectCategoryParams);
  connection.release();

  return likecategoryRows;
}

// categoryCheck
async function selectCategoryStatus(userId, categoryId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectCategoryQuery = `
                SELECT likeStatus
                FROM LikeCategory 
                WHERE userId = ? and categoryId = ?;
                `;
  const selectCategoryParams = [userId, categoryId];
  const [categoryStatus] = await connection.query(selectCategoryQuery, selectCategoryParams);
  connection.release();

  return categoryStatus;
}

// insertCategory
async function insertCategory(userId, categoryId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertCategoryQuery = `
        INSERT INTO LikeCategory(userID, categoryId)
        VALUES (?, ?);
    `;
  const insertCategoryParams = [userId, categoryId];
  const insertCategoryRow = await connection.query(insertCategoryQuery, insertCategoryParams);
  connection.release();
  return insertCategoryRow;
}

// updatecategory
async function deleteCategory(userId, categoryId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deleteCategoryQuery = `
        UPDATE LikeCategory
        SET likeStatus = if(likeStatus = 1, 0, 1)
        WHERE userId = ? and categoryId = ?;
    `;
  const deleteCategoryParams = [userId, categoryId];
  const deleteCategoryRow = await connection.query(deleteCategoryQuery, deleteCategoryParams);
  connection.release();
  return deleteCategoryRow;
}

module.exports = {
  selectCategory,
  selectCategoryStatus,
  insertCategory,
  deleteCategory,
};
