const { pool } = require("../../../config/database");

// selectUserLocationInfo
async function selectUserLocation(userId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectUserLocationQuery = `select location, latitude, longitude, nearbyPost from Location where userId = ? and locationOrder = 'first';`;
  const selectUserLocationParams = [userId];
  const [userLocatidonRows] = await connection.query(
    selectUserLocationQuery,
    selectUserLocationParams
  );
  connection.release();

  return userLocatidonRows;
}

// selectAll
async function selectPost(userId, userLocatidonRows) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { location, latitude, longitude, nearbyPost } = userLocatidonRows[0];
  const selectPostQuery = `
  select Post.postId              as postNo,
  Post.postImageUrl,
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
                                     having distance < ?) UserLocation
                                    on User.userId = UserLocation.userId) UserLocationTable
               on Post.sellerId = UserLocationTable.userId
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
  const selectPostParams = [
    location,
    latitude,
    longitude,
    latitude,
    nearbyPost,
    userId,
    userId,
  ];
  const [postRows] = await connection.query(selectPostQuery, selectPostParams);
  connection.release();

  return postRows;
}

// selectKeywordPost
async function selectKeywordPost(
  userId,
  keyword,
  showCompleted,
  userLocatidonRows
) {
  const connection = await pool.getConnection(async (conn) => conn);
  const { location, latitude, longitude, nearbyPost } = userLocatidonRows[0];
  if (showCompleted === "true") {
    showCompleted = "3";
  } else {
    showCompleted = "2";
  }
  const selectKeywordQuery = `
  select Post.postId              as postNo,
  Post.postImageUrl,
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
                                     having distance < ?) UserLocation
                                    on User.userId = UserLocation.userId) UserLocationTable
               on Post.sellerId = UserLocationTable.userId
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
    showCompleted,
    userId,
  ];
  const [postKeywordRows] = await connection.query(
    selectKeywordQuery,
    selectKeywordParams
  );
  connection.release();

  return postKeywordRows;
}

module.exports = {
  selectUserLocation,
  selectPost,
  selectKeywordPost,
};
