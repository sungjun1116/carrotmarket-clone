const { pool } = require("../../../config/database");

// 동네생활 게시물 검색
async function selectPosts(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectPostQuery = `
  select TownLife.postId,
  userName,
  SUBSTRING_INDEX(location, ' ', -1) as postLocation,
  case
      when TIMESTAMPDIFF(HOUR, TownLife.updatedAt, current_timestamp()) >= 48
          then if(TownLife.createdAt = TownLife.updatedAt, '그저께', '끝올 그저께')
      when TIMESTAMPDIFF(HOUR, TownLife.updatedAt, current_timestamp()) >= 24
          then if(TownLife.createdAt = TownLife.updatedAt, '어제', '끝올 어제')
      when TIMESTAMPDIFF(HOUR, TownLife.updatedAt, current_timestamp()) >= 1
          then if(TownLife.createdAt = TownLife.updatedAt,
                  concat(TIMESTAMPDIFF(HOUR, TownLife.updatedAt, current_timestamp()), '시간 전'),
                  concat('끝올 ', TIMESTAMPDIFF(HOUR, TownLife.updatedAt, current_timestamp()), '시간 전'))
      when TIMESTAMPDIFF(SECOND, TownLife.updatedAt, current_timestamp()) >= 60
          then if(TownLife.createdAt = TownLife.updatedAt,
                  concat(TIMESTAMPDIFF(MINUTE, TownLife.updatedAt, current_timestamp()), '분 전'),
                  concat('끝올 ', TIMESTAMPDIFF
                      (MINUTE, TownLife.updatedAt, current_timestamp()), '분 전'))
      else if(TownLife.createdAt = TownLife.updatedAt,
              concat(TIMESTAMPDIFF(SECOND, TownLife.updatedAt, current_timestamp()), '초 전'),
              concat('끝올 ', TIMESTAMPDIFF(SECOND, TownLife.updatedAt, current_timestamp()), '초 전'))
      end                 as lastPostUpdateTime,
  postContents
    from TownLife
    inner join (select User.userId, userName, location, locationId
                from User
                         inner join (select userId,
                                            locationId,
                                            location
                                     from Location) UserLocation
                                    on User.userId = UserLocation.userId) UserLocationTable
               on TownLife.locationId = UserLocationTable.locationId
`;
  const selectPostParams = [];
  const [postRows] = await connection.query(selectPostQuery, selectPostParams);
  connection.release();

  return postRows;
}

// 게시물 댓글 답글 수 확인
async function checkCountComment(userId, postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkCountQuery = `
        select count(C.contents) + count(R.contents) as count
        from Comment C
            left outer join Reply R on C.commentId = R.commentId
        where postId = 1
  `;
  const checkCountParams = [];
  const [countRows] = await connection.query(checkCountQuery, checkCountParams);
  connection.release();

  return countRows;
}

module.exports = {
  selectPosts,
  checkCountComment,
};
