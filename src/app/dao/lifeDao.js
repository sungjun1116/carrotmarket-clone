const { pool } = require("../../../config/database");

// 동네생활 게시물 검색
async function selectPosts(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectPostQuery = `
  select TownLife.postId,
  category,
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
  postContents,
  ifnull(sympathyCount, 0)           as sympathyCount
    from TownLife
    inner join (select User.userId, userName, location, locationId
                from User
                         inner join (select userId,
                                            locationId,
                                            location
                                     from Location) UserLocation
                                    on User.userId = UserLocation.userId) UserLocationTable
               on TownLife.locationId = UserLocationTable.locationId
    left outer join (select postId, count(*) as sympathyCount from Sympathy group by postId) SympathyCount
               on TownLife.postId = SympathyCount.postId
    where TownLife.status='Y';
`;
  const selectPostParams = [];
  const [postsRows] = await connection.query(selectPostQuery, selectPostParams);
  connection.release();

  return postsRows;
}

// 게시물 댓글 조회
async function selectComment(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectCommentsQuery = `
        select C.commentId,
        C.userId as commentUserId,
        profileImageUrl as commentUserProfileImageUrl,
        userName as commentUserName,
        contents as commentContents,
        SUBSTRING_INDEX(location, ' ', -1) as commentLocation,
        case
            when TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()) >= 48
                then '그저께'
            when TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()) >= 24
                then '어제'
            when TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()) >= 1
                then concat(TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()), '시간 전')
            when TIMESTAMPDIFF(SECOND, C.updatedAt, current_timestamp()) >= 60
                then concat(TIMESTAMPDIFF(MINUTE, C.updatedAt, current_timestamp()), '분 전')
            else concat(TIMESTAMPDIFF(SECOND, C.updatedAt, current_timestamp()), '초 전')
            end                            as commentUpdatedTime,
        sympathyCount as commentLikedCount
        from Comment C
            inner join (select User.userId, userName, location, locationId, profileImageUrl
                        from User
                                inner join (select userId,
                                                    locationId,
                                                    location
                                            from Location) UserLocation
                                            on User.userId = UserLocation.userId) UserLocationTable
                    on C.locationId = UserLocationTable.locationId
            left outer join (select commentId, count(*) as sympathyCount from CommentSympathy group by commentId) S
            on C.commentId = S.commentId
        where postId = ? and commentStatus='Y'
        order by C.updatedAt;
  `;
  const selectCommentsParams = [postId];
  const [commentsRows] = await connection.query(selectCommentsQuery, selectCommentsParams);
  connection.release();

  return commentsRows;
}

// 게시물 댓글 조회
async function selectCommentDesc(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectCommentsQuery = `
        select C.commentId,
        C.userId as commentUserId,
        profileImageUrl as commentUserProfileImageUrl,
        userName as commentUserName,
        contents as commentContents,
        SUBSTRING_INDEX(location, ' ', -1) as commentLocation,
        case
            when TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()) >= 48
                then '그저께'
            when TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()) >= 24
                then '어제'
            when TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()) >= 1
                then concat(TIMESTAMPDIFF(HOUR, C.updatedAt, current_timestamp()), '시간 전')
            when TIMESTAMPDIFF(SECOND, C.updatedAt, current_timestamp()) >= 60
                then concat(TIMESTAMPDIFF(MINUTE, C.updatedAt, current_timestamp()), '분 전')
            else concat(TIMESTAMPDIFF(SECOND, C.updatedAt, current_timestamp()), '초 전')
            end                            as commentUpdatedTime,
        sympathyCount as commentLikedCount
        from Comment C
            inner join (select User.userId, userName, location, locationId, profileImageUrl
                        from User
                                inner join (select userId,
                                                    locationId,
                                                    location
                                            from Location) UserLocation
                                            on User.userId = UserLocation.userId) UserLocationTable
                    on C.locationId = UserLocationTable.locationId
            left outer join (select commentId, count(*) as sympathyCount from CommentSympathy group by commentId) S
            on C.commentId = S.commentId
        where postId = ? and commentStatus='Y'
        order by C.updatedAt DESC;
  `;
  const selectCommentsParams = [postId];
  const [commentsRows] = await connection.query(selectCommentsQuery, selectCommentsParams);
  connection.release();

  return commentsRows;
}

// 댓글 답글 조회
async function selectReply(commetId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectReplyQuery = `
        select R.replyId,
        R.userId as replyUserId,
        userName as replyUserName,
        profileImageUrl as replyProfileImageUrl,
        contents as replyContents,
        SUBSTRING_INDEX(location, ' ', -1) as replyLocation,
        case
            when TIMESTAMPDIFF(HOUR, R.updatedAt, current_timestamp()) >= 48
                then '그저께'
            when TIMESTAMPDIFF(HOUR, R.updatedAt, current_timestamp()) >= 24
                then '어제'
            when TIMESTAMPDIFF(HOUR, R.updatedAt, current_timestamp()) >= 1
                then concat(TIMESTAMPDIFF(HOUR, R.updatedAt, current_timestamp()), '시간 전')
            when TIMESTAMPDIFF(SECOND, R.updatedAt, current_timestamp()) >= 60
                then concat(TIMESTAMPDIFF(MINUTE, R.updatedAt, current_timestamp()), '분 전')
            else concat(TIMESTAMPDIFF(SECOND, R.updatedAt, current_timestamp()), '초 전')
            end                            as replyUpdateTime,
        sympathyCount as replyLikedCount  
        from Reply R
            inner join (select User.userId, userName, location, locationId, profileImageUrl
                        from User
                                inner join (select userId,
                                                    locationId,
                                                    location
                                            from Location) UserLocation
                                            on User.userId = UserLocation.userId) UserLocationTable
                    on R.locationId = UserLocationTable.locationId
            left outer join (select replyId, count(*) as sympathyCount from ReplySympathy group by replyId) S
            on R.replyId = S.replyId
            where R.commentId = ? and replyStatus = 'Y';
    `;
  const selectReplyParams = [commetId];
  const [replyRows] = await connection.query(selectReplyQuery, selectReplyParams);
  connection.release();

  return replyRows;
}

// 동네생활 게시글 공감 여부
async function selectSympathyStatus(userId, postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectSympathyStatusQuery = `
    select rowStatus from Sympathy where userId = ? and PostId = ? and rowStatus='Y';
  `;
  const selectSympathyStatusParams = [userId, postId];
  const [sympathyRows] = await connection.query(selectSympathyStatusQuery, selectSympathyStatusParams);
  connection.release();

  return sympathyRows;
}

// 게시글 댓글 공감 여부
async function selectCommentLiked(userId, commentId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectCommentLikedQuery = `
    select rowStatus from CommentSympathy where userId = ? and commentId = ? and rowStatus='Y';
  `;
  const selectCommentLikedParams = [userId, commentId];
  const [commentLikedRow] = await connection.query(selectCommentLikedQuery, selectCommentLikedParams);
  connection.release();

  return commentLikedRow;
}

// 게시글 답글 공감 여부
async function selectReplyLiked(userId, replyId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectReplyLikedQuery = `
    select rowStatus from ReplySympathy where userId = ? and replyId = ? and rowStatus='Y';
  `;
  const selectReplyLikedParams = [userId, replyId];
  const [replyLikedRow] = await connection.query(selectReplyLikedQuery, selectReplyLikedParams);
  connection.release();

  return replyLikedRow;
}

// 동네생활 게시물 상세조회
async function selectPost(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectPostQuery = `
    select TownLife.postId,
    category,
    TownLife.userId,
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
    postContents,
    ifnull(sympathyCount, 0)           as sympathyCount
      from TownLife
      inner join (select User.userId, userName, location, locationId
                  from User
                           inner join (select userId,
                                              locationId,
                                              location
                                       from Location) UserLocation
                                      on User.userId = UserLocation.userId) UserLocationTable
                 on TownLife.locationId = UserLocationTable.locationId
      left outer join (select postId, count(*) as sympathyCount from Sympathy group by postId) SympathyCount
                 on TownLife.postId = SympathyCount.postId
      where TownLife.status='Y' and TownLife.postId = ?;
  `;
  const selectPostParams = [postId];
  const [postRows] = await connection.query(selectPostQuery, selectPostParams);
  connection.release();

  return postRows;
}

// 게시글 상세이미지 조회
async function selectImages(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectImagesQuery = `
    select imageId, imageUrl from LifeImage where postId = ?;
  `;
  const selectImagesParams = [postId];
  const [ImagesRows] = await connection.query(selectImagesQuery, selectImagesParams);
  connection.release();

  return ImagesRows;
}

// 동네생활 게시글 등록
async function createPost(userId, locationId, category, postContents) {
  const connection = await pool.getConnection(async (conn) => conn);
  const createPostQuery = `
    INSERT INTO TownLife (userId, locationId, category, postContents)
    VALUES (?, ?, ?, ?);
  `;
  const createPostParams = [userId, locationId, category, postContents];
  const [createPostRows] = await connection.query(createPostQuery, createPostParams);
  connection.release();
  return createPostRows;
}

// 게시글 이미지 등록
async function insertPostImage(postId, imageUrl) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertPostImageQuery = `
    INSERT INTO LifeImage (postId, imageUrl) 
    VALUES (?, ?);
  `;
  const insertPostImageParams = [postId, imageUrl];
  const [postImageRows] = await connection.query(insertPostImageQuery, insertPostImageParams);
  connection.release();

  return postImageRows;
}

// 게시글 수정
async function editPost(locationId, category, postContents, postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const editPostQuery = `
      UPDATE TownLife
      SET locationId = ?, category = ?, postContents = ?
      WHERE postId = ?;
  `;
  const editPostParams = [locationId, category, postContents, postId];
  const [editPostRows] = await connection.query(editPostQuery, editPostParams);
  connection.release();

  return editPostRows;
}

// 게시글 이미지 수정
async function editPostImage(imageId, imageUrl) {
  const connection = await pool.getConnection(async (conn) => conn);
  const editPostImageQuery = `
  UPDATE LifeImage
  SET imageUrl = ?, imageStatus = 'Y'
  WHERE ImageId = ?;
`;
  const editPostImageParams = [imageUrl, imageId];
  const [editPostImageRows] = await connection.query(editPostImageQuery, editPostImageParams);
  connection.release();

  return editPostImageRows;
}

// 게시글 이미지 삭제
async function deletePostImage(imageId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deletePostImageQuery = `
    UPDATE LifeImage
    SET imageStatus = 'N'
    WHERE ImageId = ?;
  `;
  const deletePostImageParams = [imageId];
  const [deletePostImageRows] = await connection.query(deletePostImageQuery, deletePostImageParams);
  connection.release();

  return deletePostImageRows;
}

// 상품 판매글 삭제
async function deletePost(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deletePostQuery = `
  UPDATE TownLife
  SET status = 'N' 
  WHERE postId = ?;
  `;
  const deletePostParams = [postId];
  const [deletePostRows] = await connection.query(deletePostQuery, deletePostParams);
  connection.release();

  return deletePostRows;
}

module.exports = {
  selectPosts,
  selectComment,
  selectCommentDesc,
  selectReply,
  selectSympathyStatus,
  selectCommentLiked,
  selectReplyLiked,
  selectPost,
  selectImages,
  createPost,
  insertPostImage,
  editPost,
  editPostImage,
  deletePostImage,
  deletePost,
};
