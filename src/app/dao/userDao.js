const { pool } = require("../../../config/database");

// Signup
async function userEmailCheck(email, userIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectEmailQuery = `
                SELECT email
                FROM User
                WHERE email = ? and userId != ?;
                `;
  const selectEmailParams = [email, userIdx];
  const [emailRows] = await connection.query(
    selectEmailQuery,
    selectEmailParams
  );
  connection.release();

  return emailRows;
}

async function userNameCheck(userName) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectNicknameQuery = `
                SELECT userName 
                FROM User
                WHERE userName = ?;
                `;
  const selectNicknameParams = [userName];
  const [userNameRows] = await connection.query(
    selectNicknameQuery,
    selectNicknameParams
  );
  connection.release();
  return userNameRows;
}

async function phoneNumberCheck(phoneNumber) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectphoneNumberQuery = `
                SELECT phoneNumber 
                FROM User
                WHERE phoneNumber = ?;
                `;
  const selectphoneNumberParams = [phoneNumber];
  const [phoneNumberRows] = await connection.query(
    selectphoneNumberQuery,
    selectphoneNumberParams
  );
  connection.release();
  return phoneNumberRows;
}

async function insertUserInfo(insertUserInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertUserInfoQuery = `
        INSERT INTO User(userName, profileImageUrl, phoneNumber)
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

// 회원정보 수정
async function updateUserInfo(
  userName,
  profileImageUrl,
  phoneNumber,
  email,
  userIdx
) {
  const connection = await pool.getConnection(async (conn) => conn);
  const updateUserInfoQuery = `
            UPDATE User
            SET userName = ?, profileImageUrl = ?, phoneNumber= ?, email= ?
            WHERE userId = ?;
                `;
  let updateUserInfoParams = [
    userName,
    profileImageUrl,
    phoneNumber,
    email,
    userIdx,
  ];
  const [updateUserInfoRows] = await connection.query(
    updateUserInfoQuery,
    updateUserInfoParams
  );
  connection.release();
  return [updateUserInfoRows];
}

// 사용자 프로필 조회
async function selectUserProfile(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectUserProfileQuery = `
                SELECT userId, userName, profileImageUrl, ratingScore 
                FROM User 
                WHERE userId = ? and userStatus = 'Y';
                `;

  let selectUserProfileParams = [userId];
  const [userProfileRows] = await connection.query(
    selectUserProfileQuery,
    selectUserProfileParams
  );
  connection.release();
  return userProfileRows;
}

// 회원 탈퇴
async function deleteUser(userIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deleteUserQuery = `
                UPDATE User
                SET userStatus = 'N'
                WHERE userId = ?;
    `;
  let deleteUserParams = [userIdx];
  const deleteUserRow = await connection.query(
    deleteUserQuery,
    deleteUserParams
  );
  connection.release();
  return [deleteUserRow];
}

// 사용자 관심목록 조회
async function selectUserLike(userIdx, userLocationRows) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { location } = userLocationRows[0];
  const selectUserLikeQuery = `
    select Post.postId              as postIdx,
    firstImageUrl            as postImageUrl,
    postName,
    if(SUBSTRING_INDEX(location, ' ', 1) = SUBSTRING_INDEX(?, ' ', 1),
      SUBSTRING_INDEX(location, ' ', -1), location)
                            as postLocation,
    case
        when TIMESTAMPDIFF(HOUR, Post.updatedAt, current_timestamp()) >= 48
            then if(Post.createdAt = Post.updatedAt, '그저께', '끝올 그저께')
        when TIMESTAMPDIFF(HOUR, Post.updatedAt, current_timestamp()) >= 24
            then if(Post.createdAt = Post.updatedAt, '어제', '끝올 어제')
        when TIMESTAMPDIFF(HOUR, Post.updatedAt, current_timestamp()) >= 1
            then if(Post.createdAt = Post.updatedAt,
                    concat(TIMESTAMPDIFF(HOUR, Post.updatedAt, current_timestamp()), '시간 전'),
                    concat('끝올 ', TIMESTAMPDIFF(HOUR, Post.updatedAt, current_timestamp()), '시간 전'))
        when TIMESTAMPDIFF(SECOND, Post.updatedAt, current_timestamp()) >= 60
            then if(Post.createdAt = Post.updatedAt,
                    concat(TIMESTAMPDIFF(MINUTE, Post.updatedAt, current_timestamp()), '분 전'),
                    concat('끝올 ', TIMESTAMPDIFF
                        (MINUTE, Post.updatedAt, current_timestamp()), '분 전'))
        else if(Post.createdAt = Post.updatedAt,
                concat(TIMESTAMPDIFF(SECOND, Post.updatedAt, current_timestamp()), '초 전'),
                concat('끝올 ', TIMESTAMPDIFF(SECOND, Post.updatedAt, current_timestamp()), '초 전'))
        end                  as lastPostUpdateTime,
    if(price >= 1000000, concat(truncate((price / 10000), 0), '만원'), concat(format(price, 0), '원'))
                            as postPrice,
    IFNULL(chatCount, 0)     as chatCount,
    IFNULL(favoriteCount, 0) as favoriteCount
    from Post
        inner join (select PostImage.postId, imageurl as firstImageUrl
                    from PostImage
                            inner join (select postId, min(imageNo) as firstImageNo
                                        from PostImage
                                        group by postId) firstImage
                                        on PostImage.imageNO = firstImage.firstImageNo) PostImages
                  on Post.postId = PostImages.postId
        inner join (select locationId, location from Location) postLocation
                  on Post.locationId = postLocation.locationId
        inner join (select userId, postId from Favorite) postFavorite on Post.postId = postFavorite.postID
        left outer join (select postId, count(*) as favoriteCount from Favorite group by postId) FavoriteCount
                        on Post.postId = FavoriteCount.postId
        left outer join (select postId, count(*) as chatCount from Room group by postId) ChatCount
                        on Post.postId = ChatCount.postId
    where postFavorite.userId = ?
  `;

  let selectUserLikeParams = [location, userIdx];
  const [userLikeRows] = await connection.query(
    selectUserLikeQuery,
    selectUserLikeParams
  );
  connection.release();
  return userLikeRows;
}

// 차단 사용자 목록 조회
async function selectUserBlock(userIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectUserBlockQuery = `
        select User.userId as userIdx, User.profileImageUrl,User.userName
        from Block inner join User 
        on Block.targetUserId = User.userId where Block.userId = ?
                `;
  const selectUserBlockParams = [userIdx];
  const [blockRows] = await connection.query(
    selectUserBlockQuery,
    selectUserBlockParams
  );
  connection.release();

  return blockRows;
}

// 차단 사용자인지 여부 조회
async function selectBlockStatus(targetUserIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const targetUserIdxQuery = `
          select blockStatus from Block where targetUserId = ?;
                `;
  const targetUserIdxParams = [targetUserIdx];
  const [blockStatus] = await connection.query(
    targetUserIdxQuery,
    targetUserIdxParams
  );
  connection.release();

  return blockStatus;
}

// 차단 사용자 추가
async function insertUserBlock(userIdx, targetUserIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertUserBlockQuery = `
  INSERT INTO Block (userId, targetUserId)
  VALUES(?, ?)
  `;
  const insertUserBlockParams = [userIdx, targetUserIdx];
  const [insertUserBlockRows] = await connection.query(
    insertUserBlockQuery,
    insertUserBlockParams
  );
  connection.release();
  return insertUserBlockRows;
}

// 차단 사용자 상태 변경
async function deleteUserBlock(userIdx, targetUserIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deleteUserBlockQuery = `
  UPDATE Block 
  SET blockStatus = if(blockStatus = 'Y', 'N', 'Y')
  WHERE userId = ? and targetUserId = ?;
  `;
  const deleteUserBlockParams = [userIdx, targetUserIdx];
  const [deleteUserBlockRows] = await connection.query(
    deleteUserBlockQuery,
    deleteUserBlockParams
  );
  connection.release();

  return deleteUserBlockRows;
}

module.exports = {
  userEmailCheck,
  userNameCheck,
  phoneNumberCheck,
  insertUserInfo,
  deleteUser,
  selectUserInfo,
  updateUserInfo,
  selectUserProfile,
  selectUserLike,
  selectUserBlock,
  selectBlockStatus,
  insertUserBlock,
  deleteUserBlock,
};
