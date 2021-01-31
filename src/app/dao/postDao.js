const { pool } = require("../../../config/database");

// 접속한 user의 동네기반 위치 정보 확인
async function selectUserLocation(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectUserLocationQuery = `select locationId, location, latitude, longitude, nearbyPost from Location where userId = ? and locationOrder = 'first';`;
  const selectUserLocationParams = [userId];
  const [userLocationRows] = await connection.query(selectUserLocationQuery, selectUserLocationParams);
  connection.release();

  return userLocationRows;
}

// 동네기반 게시물 검색
async function selectPost(userId, userLocationRows) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { location, latitude, longitude, nearbyPost } = userLocationRows[0];
  const selectPostQuery = `
  select Post.postId,            
  firstImageUrl as postImageUrl,
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
    inner join (select User.userId, location, locationOrder, distance
                from User
                         inner join (select userId,
                                            location,
                                            locationOrder,
                                            (6371 * acos(cos(radians(?)) *
                                                         cos(radians(latitude)) *
                                                         cos(radians(longitude) - radians(?))
                                                + sin(radians(?)) *
                                                  sin(radians(latitude)))) AS distance
                                     from Location
                                     where locationOrder = 'first'
                                     having distance < ?) UserLocation
                                    on User.userId = UserLocation.userId) UserLocationTable
               on Post.sellerId = UserLocationTable.userId
    inner join (select PostImage.postId, imageurl as firstImageUrl
    from PostImage
              inner join (select postId, min(imageNo) as firstImageNo
                          from PostImage
                          group by postId) firstImage
                        on PostImage.imageNO = firstImage.firstImageNo) PostImages
    on Post.postId = PostImages.postId
    left outer join (select postId, count(*) as favoriteCount from Favorite group by postId) FavoriteCount
                    on Post.postId = FavoriteCount.postId
    left outer join (select postId, count(*) as chatCount from Room group by postId) ChatCount
                    on Post.postId = ChatCount.postId
where Post.postStatus != 3
and Post.categoryId in (select Category.categoryId
  from LikeCategory
           inner join Category on LikeCategory.categoryId = Category.categoryId
  where LikeCategory.userId = ? and LikeCategory.likeStatus = 1)
  and Post.sellerId not in (select targetUserId from Block where Block.userId = ?);
`;
  const selectPostParams = [location, latitude, longitude, latitude, nearbyPost, userId, userId];
  const [postRows] = await connection.query(selectPostQuery, selectPostParams);
  connection.release();

  return postRows;
}

// 키워드에 해당하는 게시물 검색
async function selectKeywordPost(userId, keyword, completed, userLocationRows) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { location, latitude, longitude, nearbyPost } = userLocationRows[0];
  if (completed === "true") {
    completed = "3";
  } else {
    completed = "2";
  }
  const selectKeywordQuery = `
  select Post.postId,           
  firstImageUrl                   as postImageUrl,
  postName,
  sellerId, 
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
    inner join (select User.userId, location, locationOrder, distance
                from User
                         inner join (select userId,
                                            location,
                                            locationOrder,
                                            (6371 * acos(cos(radians(?)) *
                                                         cos(radians(latitude)) *
                                                         cos(radians(longitude) - radians(?))
                                                + sin(radians(?)) *
                                                  sin(radians(latitude)))) AS distance
                                     from Location
                                     having distance < ?) UserLocation
                                    on User.userId = UserLocation.userId) UserLocationTable
               on Post.sellerId = UserLocationTable.userId
    inner join (select PostImage.postId, imageurl as firstImageUrl
    from PostImage
              inner join (select postId, min(imageNo) as firstImageNo
                          from PostImage
                          group by postId) firstImage
                        on PostImage.imageNO = firstImage.firstImageNo) PostImages
    on Post.postId = PostImages.postId
    left outer join (select postId, count(*) as favoriteCount from Favorite group by postId) FavoriteCount
                    on Post.postId = FavoriteCount.postId
    left outer join (select postId, count(*) as chatCount from Room group by postId) ChatCount
                    on Post.postId = ChatCount.postId
where (Post.postName like concat('%', ?, '%') or Post.contents like concat('%', ?, '%'))
and Post.postStatus not in ('3', ?)
and Post.sellerId not in (select targetUserId from Block where Block.userId = ?); `;
  const selectKeywordParams = [
    location,
    latitude,
    longitude,
    latitude,
    nearbyPost,
    keyword,
    keyword,
    completed,
    userId,
  ];
  const [postKeywordRows] = await connection.query(selectKeywordQuery, selectKeywordParams);
  connection.release();

  return postKeywordRows;
}

// 상품 상세조회
async function selectArticleInfo(postId, userLocationRows) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { location } = userLocationRows[0];
  const selectArticleInfoQuery = `
  select Post.postId as postId,
       sellerId,
       if(SUBSTRING_INDEX(location, ' ', 1) = SUBSTRING_INDEX(?, ' ', 1),
          SUBSTRING_INDEX(location, ' ', -1), location)
                                as postLocation,
       postName,
       ratingScore,
       categoryName,
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
       Post.contents,
       if(price >= 1000000, concat(truncate((price / 10000), 0), '만원'), concat(format(price, 0), '원'))
                                as postPrice,
       IFNULL(chatCount, 0)     as chatCount,
       IFNULL(favoriteCount, 0) as favoriteCount,
       IFNULL(viewCount, 0)     as viewCount,
       priceNegoPossible
from Post
         inner join (select User.userId, location, locationId, ratingScore
                     from User
                              inner join (select userId,
                                                 locationId,
                                                 location
                                          from Location) UserLocation
                                         on User.userId = UserLocation.userId) UserLocationTable
                    on Post.locationId = UserLocationTable.locationId
         inner join Category on Post.categoryId = Category.categoryId
         left outer join (select postId, count(*) as favoriteCount from Favorite group by postId) FavoriteCount
                         on Post.postId = FavoriteCount.postId
         left outer join (select postId, count(*) as chatCount from Room group by postId) ChatCount
                         on Post.postId = ChatCount.postId
         left outer join (select postId, count(*) as viewCount from View group by postId) viewCount
                         on Post.postId = viewCount.postId
where Post.postId = ? and Post.postStatus != 3;
`;
  const selectArticleInfoParams = [location, postId];
  const [articleInfoRows] = await connection.query(selectArticleInfoQuery, selectArticleInfoParams);
  connection.release();

  return articleInfoRows;
}

// 상품 상세이미지 조회
async function selectArticleImages(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectArticleImagesQuery = `
  select imageNo, imageUrl from PostImage where postId = ?;
`;
  const selectArticleImagesParams = [postId];
  const [articleImagesRows] = await connection.query(selectArticleImagesQuery, selectArticleImagesParams);
  connection.release();

  return articleImagesRows;
}

// 사용자 상품 좋아요 여부
async function selectLikeStatus(userId, postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectLikeStatusQuery = `
  select favoriteStatus from Favorite where userId = ? and PostId = ?;
`;
  const selectLikeStatusParams = [userId, postId];
  const [LikeStatusRows] = await connection.query(selectLikeStatusQuery, selectLikeStatusParams);
  connection.release();

  return LikeStatusRows;
}

// 상품 게시글 등록
async function insertArticle(
  userId,
  postName,
  categoryIdx,
  locationId,
  price,
  priceNegoPossible,
  contents,
  postShowArea
) {
  const connection = await pool.getConnection(async (conn) => conn);
  price === undefined ? (price = 0) : (price = price);
  const insertArticleQuery = `
  INSERT INTO Post (sellerId, postName, categoryId, locationId, price, contents, postShowArea, priceNegoPossible) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?);
`;
  const insertArticleParams = [
    userId,
    postName,
    categoryIdx,
    locationId,
    price,
    contents,
    postShowArea,
    priceNegoPossible,
  ];
  const [articleRows] = await connection.query(insertArticleQuery, insertArticleParams);
  connection.release();

  return articleRows;
}

// 상품 이미지 등록
async function insertPostImage(postId, imageUrl) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertPostImageQuery = `
  INSERT INTO PostImage (postId, imageUrl) 
  VALUES (?, ?);
`;
  const insertPostImageParams = [postId, imageUrl];
  const [postImageRows] = await connection.query(insertPostImageQuery, insertPostImageParams);
  connection.release();

  return postImageRows;
}

// 상품 판매글 수정
async function editArticle(
  postName,
  categoryIdx,
  price,
  priceNegoPossible,
  contents,
  postShowArea,
  postId,
  userLocationRows
) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { locationId } = userLocationRows[0];
  price === undefined ? (price = 0) : (price = price);
  const editArticleQuery = `
  UPDATE Post
  SET postName = ?, categoryId = ?, locationId = ?, price = ?, contents = ?, postShowArea = ?, priceNegoPossible = ? 
  WHERE postId = ?;
`;
  const editArticleParams = [
    postName,
    categoryIdx,
    locationId,
    price,
    contents,
    postShowArea,
    priceNegoPossible,
    postId,
  ];
  const [editArticleRows] = await connection.query(editArticleQuery, editArticleParams);
  connection.release();

  return editArticleRows;
}

// 상품 이미지 수정
async function editPostImage(imageIdx, imageUrl) {
  const connection = await pool.getConnection(async (conn) => conn);
  const editPostImageQuery = `
  UPDATE PostImage
  SET imageUrl = ?, imageStatus = 'Y'
  WHERE ImageNo = ?;
`;
  const editPostImageParams = [imageUrl, imageIdx];
  const [editPostImageRows] = await connection.query(editPostImageQuery, editPostImageParams);
  connection.release();

  return editPostImageRows;
}

// 상품 이미지 삭제
async function deletePostImage(imageIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deletePostImageQuery = `
    UPDATE PostImage
    SET imageStatus = 'N'
    WHERE ImageNo = ?;
  `;
  const deletePostImageParams = [imageIdx];
  const [deletePostImageRows] = await connection.query(deletePostImageQuery, deletePostImageParams);
  connection.release();

  return deletePostImageRows;
}

// 상품 판매글 삭제
async function deleteArticle(postId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deletePostQuery = `
  UPDATE Post
  SET postStatus = 3 
  WHERE postId = ?;
  `;
  const deleteArticleParams = [postId];
  const [deleteArticleRows] = await connection.query(deletePostQuery, deleteArticleParams);
  connection.release();

  return deleteArticleRows;
}

// 상품 예약중으로 변경
async function updateReserved(postIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const updateReservedQuery = `
  UPDATE Post
  SET postStatus = 1
  WHERE postId = ?;
  `;
  const updateReservedParams = [postIdx];
  const [updateReservedRows] = await connection.query(updateReservedQuery, updateReservedParams);
  connection.release();
  return updateReservedRows;
}

// 상품 판매완료로 변경
async function updateCompleted(postIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const updateCompletedQuery = `
  UPDATE Post
  SET postStatus = 2
  WHERE postId = ?;
  `;
  const updateCompletedParams = [postIdx];
  const [updateCompletedRows] = await connection.query(updateCompletedQuery, updateCompletedParams);
  connection.release();
  return updateCompletedRows;
}

// 관심목록 추가
async function insertLikeArticle(userIdx, postIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertLikeArticleQuery = `
  INSERT INTO Favorite (userId, postId) 
  VALUES (?, ?);
  `;
  const insertLikeArticleParams = [userIdx, postIdx];
  const [insertLikeArticleRows] = await connection.query(insertLikeArticleQuery, insertLikeArticleParams);
  connection.release();
  return insertLikeArticleRows;
}

// 관심목록 상태 변경
async function deletelikeArticle(userIdx, postIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deletelikeArticleQuery = `
  UPDATE Favorite 
  SET favoriteStatus = if(favoriteStatus = 'Y', 'N', 'Y')
  WHERE userId = ? and postId = ?;
  `;
  const deletelikeArticleParams = [userIdx, postIdx];
  const [deletelikeArticleRows] = await connection.query(deletelikeArticleQuery, deletelikeArticleParams);
  connection.release();

  return deletelikeArticleRows;
}

// 모아보기
async function collectPost(userId, location) {
  const connection = await pool.getConnection(async (conn) => conn);
  const collectPostQuery = `
  select Post.postId,
        firstImageUrl as postImageUrl,
        postName,
        userName,
        if(SUBSTRING_INDEX(location, ' ', 1) = SUBSTRING_INDEX(?, ' ', 1),
            SUBSTRING_INDEX(location, ' ', -1), location)
                      as postLocation,
        case
            when Post.postStatus = 1
              then '예약중'
            when Post.postStatus = 2
              then '거래완료'
            else '판매중'
            end       as postStatus,
        price
  from Post
          inner join (select User.userId, userName, location
                      from User
                                inner join (select userId,
                                                  location
                                            from Location) UserLocation
                                          on User.userId = UserLocation.userId) UserLocationTable
                      on Post.sellerId = UserLocationTable.userId
          inner join (select PostImage.postId, imageurl as firstImageUrl
                      from PostImage
                                inner join (select postId, min(imageNo) as firstImageNo
                                            from PostImage
                                            group by postId) firstImage
                                          on PostImage.imageNO = firstImage.firstImageNo) PostImages
                      on Post.postId = PostImages.postId
  where userId in (select targetUserId from Collect where userId = ?)
  `;
  const collectPostParams = [location, userId];
  const [collectPostRows] = await connection.query(collectPostQuery, collectPostParams);
  connection.release();

  return collectPostRows;
}

// collectStatusCheck
async function selectCollectStatus(userId, targetUserId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectCollectQuery = `
                SELECT collectStatus
                FROM Collect 
                WHERE userId = ? and targetUserId = ?;
                `;
  const selectCollectParams = [userId, targetUserId];
  const [collectStatus] = await connection.query(selectCollectQuery, selectCollectParams);
  connection.release();

  return collectStatus;
}

// insertCollect
async function insertCollect(userId, targetUserId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertCollectQuery = `
        INSERT INTO Collect(userId, targetUserId)
        VALUES (?, ?);
    `;
  const insertCollectParams = [userId, targetUserId];
  const insertCollectRow = await connection.query(insertCollectQuery, insertCollectParams);
  connection.release();
  return insertCollectRow;
}
// updatecollect
async function updateCollect(userId, targetUserId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const updatecollectQuery = `
        UPDATE Collect
        SET collectStatus = if(collectStatus = 'Y', 'N', 'Y')
        WHERE userId = ? and targetUserId = ?;
    `;
  const updatecollectParams = [userId, targetUserId];
  const updatecollectRow = await connection.query(updatecollectQuery, updatecollectParams);
  connection.release();
  return updatecollectRow;
}

module.exports = {
  selectUserLocation,
  selectPost,
  selectKeywordPost,
  selectArticleInfo,
  selectArticleImages,
  selectLikeStatus,
  insertArticle,
  insertPostImage,
  editArticle,
  editPostImage,
  deletePostImage,
  deleteArticle,
  updateReserved,
  updateCompleted,
  insertLikeArticle,
  deletelikeArticle,
  collectPost,
  selectCollectStatus,
  insertCollect,
  updateCollect,
};
