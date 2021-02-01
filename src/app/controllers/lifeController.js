const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const lifeDao = require("../dao/lifeDao");

// 동네생활 게시물 조회
exports.selectPosts = async function (req, res) {
  const { id } = req.verifiedToken;

  try {
    const postsRows = await lifeDao.selectPosts(id);
    let result = 0;
    let count = 0;
    for (let i = 0; i < postsRows.length; i++) {
      result = 0;
      let commentsRows = await lifeDao.selectComment(postsRows[i].postId);
      result += commentsRows.length;
      count = 0;
      for (let j = 0; j < commentsRows.length; j++) {
        let replyRows = await lifeDao.selectReply(commentsRows[j].commentId);
        console.log(i, j, replyRows.length);
        count += replyRows.length;
      }
      result += count;
      postsRows[i].commentCount = result;

      let sympathyRows = await lifeDao.selectSympathyStatus(id, postsRows[i].postId);
      if (sympathyRows.length === 0 || sympathyRows[0].rowStatus === "N") {
        postsRows[i].sympathyStatus = false;
      } else {
        postsRows[i].sympathyStatus = true;
      }
    }

    return res.json({
      isSucess: true,
      code: 200,
      message: "동네생활 게시글 조회 성공",
      result: postsRows,
    });
  } catch (err) {
    logger.error(`App - selectPosts Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 동네생활 게시물 상세조회
exports.selectPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postId } = req.params;

  try {
    const postRows = await lifeDao.selectPost(postId);

    if (postRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 411,
        message: "postId에 조회할 게시글이 없습니다.",
      });
    }

    let result = 0;
    let count = 0;
    for (let i = 0; i < postRows.length; i++) {
      result = 0;
      let commentsRows = await lifeDao.selectComment(postRows[i].postId);
      result += commentsRows.length;
      count = 0;
      for (let j = 0; j < commentsRows.length; j++) {
        let replyRows = await lifeDao.selectReply(commentsRows[j].commentId);
        count += replyRows.length;
      }
      result += count;
      postRows[i].commentCount = result;

      let sympathyRows = await lifeDao.selectSympathyStatus(id, postRows[i].postId);
      if (sympathyRows.length === 0 || sympathyRows[0].LikeStatus === 0) {
        postRows[i].sympathyStatus = false;
      } else {
        postRows[i].sympathyStatus = true;
      }
    }

    // 게시글 사진들
    const imageRows = await lifeDao.selectImages(postId);
    postRows[0].imageUrlList = imageRows;

    return res.json({
      isSucess: true,
      code: 200,
      message: "동네생활 게시글 상세조회 성공",
      result: postRows,
    });
  } catch (err) {
    logger.error(`App - selectPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 동네생활 게시글 생성
exports.createPost = async function (req, res) {
  const { id, locationId } = req.verifiedToken;
  const { imageUrlList, category, postContents } = req.body;

  const conn = await pool.getConnection();

  if (imageUrlList) {
    for (const postImageUrl of imageUrlList) {
      if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(postImageUrl))
        return res.json({
          isSuccess: false,
          code: 411,
          message: "imageUrl을 url형식에 맞게 입력해주세요.",
        });
    }
  }
  if (!category)
    return res.json({
      isSuccess: false,
      code: 412,
      message: "category를 입력 해주세요.",
    });
  if (typeof category !== "string")
    return res.json({
      isSuccess: false,
      code: 421,
      message: "category는 문자열을 입력하세요.",
    });

  if (!postContents)
    return res.json({
      isSuccess: false,
      code: 422,
      message: "postContents를 입력하세요.",
    });
  if (typeof postContents !== "string" && postContents.length >= 8)
    return res.json({
      isSuccess: false,
      code: 431,
      message: "postContents는 8자 이상의 문자열을 입력하세요.",
    });

  try {
    await conn.beginTransaction();
    const createPostRows = await lifeDao.createPost(id, locationId, category, postContents);
    if (createPostRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "게시글 생성에 실패했습니다.",
      });
    }

    if (imageUrlList) {
      let postImageRows = ``;
      let imageIdxList = [];
      for (let i = 0; i < imageUrlList.length; i++) {
        postImageRows = await lifeDao.insertPostImage(createPostRows.insertId, imageUrlList[i]);
        if (postImageRows.length === 0) {
          return res.json({
            isSuccess: false,
            code: 432,
            message: "imageUrl등록에 실패했습니다.",
          });
        }
        imageIdxList.push(postImageRows.insertId);
      }
    }

    await conn.commit();
    return res.json({
      postId: createPostRows.insertId,
      isSuccess: true,
      code: 200,
      message: "동네생활 게시글 추가 성공",
    });
  } catch (err) {
    await conn.rollback();
    logger.error(`App - createPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};

// 동네생활 게시글 수정
exports.editPost = async function (req, res) {
  const { id, locationId } = req.verifiedToken;
  const { imageUrlList, category, postContents } = req.body;
  const { postId } = req.params;

  const conn = await pool.getConnection();

  if (imageUrlList) {
    for (const postImageUrl of imageUrlList) {
      if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(postImageUrl))
        return res.json({
          isSuccess: false,
          code: 411,
          message: "imageUrl을 url형식에 맞게 입력해주세요.",
        });
    }
  }
  if (!category)
    return res.json({
      isSuccess: false,
      code: 412,
      message: "category를 입력 해주세요.",
    });
  if (typeof category !== "string")
    return res.json({
      isSuccess: false,
      code: 421,
      message: "category는 문자열을 입력하세요.",
    });

  if (!postContents)
    return res.json({
      isSuccess: false,
      code: 422,
      message: "postContents를 입력하세요.",
    });
  if (typeof postContents !== "string" && postContents.length >= 8)
    return res.json({
      isSuccess: false,
      code: 431,
      message: "postContents는 8자 이상의 문자열을 입력하세요.",
    });

  try {
    await conn.beginTransaction();

    const postRows = await lifeDao.selectPost(postId);
    if (postRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 432,
        message: "postId에 게시글이 존재하지 않습니다.",
      });
    }

    if (postRows[0].userId !== id) {
      return res.json({
        isSuccess: false,
        code: 441,
        message: "권한이 없습니다.",
      });
    }

    const editPostRows = await lifeDao.editPost(locationId, category, postContents, postId);
    if (editPostRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "게시글 생성에 실패했습니다.",
      });
    }

    const imageRows = await lifeDao.selectImages(postId);
    let imageIdxList = [];
    for (let i = 0; i < imageRows.length; i++) {
      imageIdxList.push(imageRows[i].imageId);
    }
    let editPostImageRows = ``;
    let cnt = 0;

    if (imageUrlList) {
      for (let i = 0; i < imageUrlList.length; i++) {
        editPostImageRows = await lifeDao.editPostImage(imageIdxList[i], imageUrlList[i]);
        cnt++;
      }
    }

    for (let i = cnt; i < imageIdxList.length; i++) {
      console.log(imageIdxList[i]);
      deletePostImageRows = await lifeDao.deletePostImage(imageIdxList[i]);
    }

    await conn.commit();
    return res.json({
      isSuccess: true,
      code: 200,
      message: "동네생활 게시글 수정 성공",
    });
  } catch (err) {
    await conn.rollback();
    logger.error(`App - editPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};

// deletePost API = 동네생활 게시글 삭제
exports.deletePost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postId } = req.params;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const postRows = await lifeDao.selectPost(postId);
    if (postRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 411,
        message: "postId에 게시글이 존재하지 않습니다.",
      });
    }

    if (postRows[0].userId !== id) {
      return res.json({
        isSuccess: false,
        code: 412,
        message: "권한이 없습니다.",
      });
    }

    const deletePostRows = await lifeDao.deletePost(postId);
    if (deletePostRows.affectedRows === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "동네생활 게시글 삭제에 실패했습니다.",
      });
    }

    const imageRows = await lifeDao.selectImages(postId);
    let imageIdxList = [];
    for (let i = 0; i < imageRows.length; i++) {
      imageIdxList.push(imageRows[i].imageId);
    }

    for (let i = 0; i < imageIdxList.length; i++) {
      deletePostImageRows = await lifeDao.deletePostImage(imageIdxList[i]);
    }

    await conn.commit();
    return res.json({
      isSuccess: true,
      code: 200,
      message: "동네생활 게시글 삭제 성공",
    });
  } catch (err) {
    await conn.rollback();
    logger.error(`App - deletePost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};

// 동네생활 게시물 댓글조회
exports.selectComment = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postId } = req.params;
  const { sort } = req.query;

  let commmentRows = ``;
  try {
    if (sort === "latest") {
      commmentRows = await lifeDao.selectComment(postId);
    } else {
      commmentRows = await lifeDao.selectCommentDesc(postId);
    }
    for (let i = 0; i < commmentRows.length; i++) {
      let commentLikedRows = await lifeDao.selectCommentLiked(id, commmentRows[i].commentId);
      if (commentLikedRows.length === 0 || commentLikedRows[0].rowStatus === "N") {
        commmentRows[i].isCommentLiked = false;
      } else {
        commmentRows[i].isCommentLiked = true;
      }

      let replyRows = await lifeDao.selectReply(commmentRows[i].commentId);
      for (let i = 0; i < replyRows.length; i++) {
        let replyLikedRows = await lifeDao.selectReplyLiked(id, replyRows[i].replyId);
        if (replyLikedRows.length === 0 || replyLikedRows[0].rowStatus === "N") {
          replyRows[i].isReplyLiked = false;
        } else {
          replyRows[i].isRelyLiked = true;
        }
      }
      commmentRows[i].replyList = replyRows;
    }

    return res.json({
      isSucess: true,
      code: 200,
      message: "댓글 답글 조회 성공",
      result: commmentRows,
    });
  } catch (err) {
    logger.error(`App - selectComment Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
