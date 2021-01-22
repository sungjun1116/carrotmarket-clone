const { pool } = require("../../../config/database");

// Signup
async function userEmailCheck(email) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectEmailQuery = `
                SELECT email, nickname 
                FROM UserInfo 
                WHERE email = ?;
                `;
  const selectEmailParams = [email];
  const [emailRows] = await connection.query(
    selectEmailQuery,
    selectEmailParams
  );
  connection.release();

  return emailRows;
}

async function userNicknameCheck(nickname) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectNicknameQuery = `
                SELECT email, nickname 
                FROM UserInfo 
                WHERE nickname = ?;
                `;
  const selectNicknameParams = [nickname];
  const [nicknameRows] = await connection.query(
    selectNicknameQuery,
    selectNicknameParams
  );
  connection.release();
  return nicknameRows;
}

async function insertUserInfo(insertUserInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertUserInfoQuery = `
        INSERT INTO UserInfo(email, pswd, nickname)
        VALUES (?, ?, ?);
    `;
  const insertUserInfoRow = await connection.query(
    insertUserInfoQuery,
    insertUserInfoParams
  );
  connection.release();
  return insertUserInfoRow;
}

// SignIn
async function selectUserInfo(phoneNumber) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectUserInfoQuery = `
                SELECT userId, phoneNumber, userStatus 
                FROM User 
                WHERE phoneNumber = ?;
                `;

  let selectUserInfoParams = [phoneNumber];
  const [userInfoRows] = await connection.query(
    selectUserInfoQuery,
    selectUserInfoParams
  );
  connection.release();
  return userInfoRows;
}

// selectUserProfile
async function selectUserProfile(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectUserProfileQuery = `
                SELECT userId, userName, profileImageUrl, ratingScore 
                FROM User 
                WHERE userId = ?;
                `;

  let selectUserProfileParams = [userId];
  const [userProfileRows] = await connection.query(
    selectUserProfileQuery,
    selectUserProfileParams
  );
  connection.release();
  return userProfileRows;
}

module.exports = {
  userEmailCheck,
  userNicknameCheck,
  insertUserInfo,
  selectUserInfo,
  selectUserProfile,
};
