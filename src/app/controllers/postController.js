const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const postDao = require("../dao/postDao");

// 01.search API = 동네기반 상품 찾기
exports.selectPost = async function (req, res) {
  const { id, locationId, location, latitude, longitude, nearbyPost } = req.verifiedToken;
  const userLocationRows = [{ locationId, location, latitude, longitude, nearbyPost }];
  let { keyword, completed } = req.query;
  completed ? (completed = completed) : (completed = "true");

  try {
    if (!keyword) {
      const postRows = await postDao.selectPost(id, userLocationRows);
      if (postRows.length > 0) {
        return res.json({
          isSuccess: true,
          code: 200,
          message: "게시물 검색 성공",
          result: postRows,
        });
      }
      return res.json({
        isSucess: false,
        code: 411,
        message: "게시물이 존재하지 않습니다.",
      });
    } else {
      const postKeywordRows = await postDao.selectKeywordPost(id, keyword, completed, userLocationRows);
      if (postKeywordRows.length > 0) {
        return res.json({
          isSuccess: true,
          code: 200,
          message: "게시물 검색 성공",
          result: postKeywordRows,
        });
      }
      return res.json({
        isSucess: false,
        code: 412,
        message: "해당 키워드 게시물이 존재하지 않습니다.",
      });
    }
  } catch (err) {
    logger.error(`App - findPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 02. Article API = 상품 상세조회
exports.selectArticleInfo = async function (req, res) {
  const { id, loationId, location, latitude, longitude, nearbyPost } = req.verifiedToken;
  const { postId } = req.params;
  const userLocationRows = [{ loationId, location, latitude, longitude, nearbyPost }];

  try {
    const articleInfoRows = await postDao.selectArticleInfo(postId, userLocationRows);

    if (articleInfoRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 411,
        message: "postId에 조회할 상품 상세정보가 없습니다.",
      });
    }
    console.log(articleInfoRows);

    // 사용자 상품에 대한 관심상품 등록 여부
    const LikeStatusRows = await postDao.selectLikeStatus(id, postId);
    if (LikeStatusRows.length === 0 || LikeStatusRows[0].LikeStatus === 0) {
      articleInfoRows[0].likeStatus = false;
    } else {
      articleInfoRows[0].likeStatus = true;
    }

    // 상품 사진들
    const articleImagesRows = await postDao.selectArticleImages(postId);
    articleInfoRows[0].postImageUrlList = articleImagesRows;

    return res.json({
      isSuccess: true,
      code: 200,
      message: "상품 상세조회 검색 성공",
      result: articleInfoRows,
    });
  } catch (err) {
    logger.error(`App - selectArticleInfo Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 03. CreatePost API = 상품 판매글 등록
exports.createPost = async function (req, res) {
  const { id, locationId } = req.verifiedToken;
  const { postImageUrlList, postName, categoryIdx, price, priceNegoPossible, contents, postShowArea } = req.body;

  const conn = await pool.getConnection();

  if (postImageUrlList) {
    for (const postImageUrl of postImageUrlList) {
      if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(postImageUrl))
        return res.json({
          isSuccess: false,
          code: 411,
          message: "postImageUrl을 url형식에 맞게 입력해주세요.",
        });
    }
  }
  if (!postName)
    return res.json({
      isSuccess: false,
      code: 412,
      message: "postName을 입력 해주세요.",
    });
  if (typeof postName !== "string")
    return res.json({
      isSuccess: false,
      code: 413,
      message: "postName은 문자열을 입력하세요.",
    });

  if (!categoryIdx)
    return res.json({
      isSuccess: false,
      code: 421,
      message: "categoryIdx를 입력하세요.",
    });
  if (typeof categoryIdx !== "number")
    return res.json({
      isSuccess: false,
      code: 422,
      message: "categoryIdx는 정수를 입력하세요.",
    });

  if (price) {
    if (typeof price !== "number")
      return res.json({
        isSuccess: false,
        code: 423,
        message: "price는 정수를 입력하세요.",
      });
  }

  if (priceNegoPossible !== 1 && priceNegoPossible !== 0) {
    return res.json({
      isSuccess: false,
      code: 431,
      message: "priceNegoPossible은 1 아니면 0을 입력하세요.",
    });
  }

  if (!contents) {
    return res.json({
      isSuccess: false,
      code: 432,
      message: "contents를 입력하세요.",
    });
  }
  if (typeof contents !== "string")
    return res.json({
      isSuccess: false,
      code: 433,
      message: "contents는 문자열을 입력하세요.",
    });

  if (!postShowArea) {
    return res.json({
      isSuccess: false,
      code: 441,
      message: "postShowArea 입력하세요.",
    });
  }
  if (postShowArea !== 5 && postShowArea !== 5 && postShowArea !== 2) {
    return res.json({
      isSuccess: false,
      code: 442,
      message: "postShowArea를 5, 3, 2중에서 입력하세요",
    });
  }

  try {
    await conn.beginTransaction();
    const articleRows = await postDao.insertArticle(
      id,
      postName,
      categoryIdx,
      locationId,
      price,
      priceNegoPossible,
      contents,
      postShowArea
    );
    if (articleRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "판매글 생성에 실패했습니다.",
      });
    }

    if (postImageUrlList) {
      let postImageRows = ``;
      let imageIdxList = [];
      for (let i = 0; i < postImageUrlList.length; i++) {
        postImageRows = await postDao.insertPostImage(articleRows.insertId, postImageUrlList[i]);
        if (postImageRows.length === 0) {
          return res.json({
            isSuccess: false,
            code: 443,
            message: "imageUrl등록에 실패했습니다.",
          });
        }
        imageIdxList.push(postImageRows.insertId);
      }
    }

    await conn.commit();
    return res.json({
      postId: articleRows.insertId,
      isSuccess: true,
      code: 200,
      message: "상품 판매글 추가 성공",
    });
  } catch (err) {
    await conn.rollback();
    logger.error(`App - createPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};

// 04. editPost API = 상품 판매글 수정
exports.editPost = async function (req, res) {
  const { id, locationId, location, latitude, longitude, nearbyPost } = req.verifiedToken;
  const userLocationRows = [{ locationId, location, latitude, longitude, nearbyPost }];
  const { postId } = req.params;
  const { postImageUrlList, postName, categoryIdx, price, priceNegoPossible, contents, postShowArea } = req.body;

  const conn = await pool.getConnection();

  if (postImageUrlList) {
    for (const postImageUrl of postImageUrlList) {
      if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(postImageUrl))
        return res.json({
          isSuccess: false,
          code: 411,
          message: "postImageUrl을 url형식에 맞게 입력해주세요.",
        });
    }
  }
  if (!postName)
    return res.json({
      isSuccess: false,
      code: 412,
      message: "postName을 입력 해주세요.",
    });
  if (typeof postName !== "string")
    return res.json({
      isSuccess: false,
      code: 413,
      message: "postName은 문자열을 입력하세요.",
    });

  if (!categoryIdx)
    return res.json({
      isSuccess: false,
      code: 421,
      message: "categoryIdx를 입력하세요.",
    });
  if (typeof categoryIdx !== "number")
    return res.json({
      isSuccess: false,
      code: 422,
      message: "categoryIdx는 정수를 입력하세요.",
    });

  if (price) {
    if (typeof price !== "number")
      return res.json({
        isSuccess: false,
        code: 423,
        message: "price는 정수를 입력하세요.",
      });
  }

  if (priceNegoPossible !== 1 && priceNegoPossible !== 0) {
    return res.json({
      isSuccess: false,
      code: 431,
      message: "priceNegoPossible은 1 아니면 0을 입력하세요.",
    });
  }

  if (!contents) {
    return res.json({
      isSuccess: false,
      code: 432,
      message: "contents를 입력하세요.",
    });
  }
  if (typeof contents !== "string")
    return res.json({
      isSuccess: false,
      code: 433,
      message: "contents는 문자열을 입력하세요.",
    });

  if (!postShowArea) {
    return res.json({
      isSuccess: false,
      code: 441,
      message: "postShowArea를 입력하세요.",
    });
  }
  if (postShowArea !== 5 && postShowArea !== 5 && postShowArea !== 2) {
    return res.json({
      isSuccess: false,
      code: 442,
      message: "postShowArea를 정수 (5, 3, 2)중에서 입력하세요.",
    });
  }

  try {
    await conn.beginTransaction();

    const articleInfoRows = await postDao.selectArticleInfo(postId, userLocationRows);
    console.log(articleInfoRows);
    if (articleInfoRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 443,
        message: "postId에 상품이 존재하지 않습니다.",
      });
    }

    if (articleInfoRows[0].sellerId !== id) {
      return res.json({
        isSuccess: false,
        code: 441,
        message: "권한이 없습니다.",
      });
    }

    const editArticleRows = await postDao.editArticle(
      postName,
      categoryIdx,
      price,
      priceNegoPossible,
      contents,
      postShowArea,
      postId,
      userLocationRows
    );
    if (editArticleRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "판매글 수정에 실패했습니다.",
      });
    }
    const articleImagesRows = await postDao.selectArticleImages(postId);
    console.log(articleImagesRows);
    let imageIdxList = [];
    for (let i = 0; i < articleImagesRows.length; i++) {
      imageIdxList.push(articleImagesRows[i].imageNo);
    }
    let editPostImageRows = ``;
    let cnt = 0;

    if (postImageUrlList) {
      for (let i = 0; i < postImageUrlList.length; i++) {
        editPostImageRows = await postDao.editPostImage(imageIdxList[i], postImageUrlList[i]);
        cnt++;
      }
    }

    for (let i = cnt; i < imageIdxList.length; i++) {
      console.log(imageIdxList[i]);
      deletePostImageRows = await postDao.deletePostImage(imageIdxList[i]);
    }

    await conn.commit();
    return res.json({
      isSuccess: true,
      code: 200,
      message: "상품 판매글 수정 성공",
    });
  } catch (err) {
    await conn.rollback();
    logger.error(`App - editPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};

// 05. deletePost API = 상품 판매글 삭제
exports.deletePost = async function (req, res) {
  const { id, location } = req.verifiedToken;
  const { postId } = req.params;
  const userLocationRows = [{ location }];

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const articleInfoRows = await postDao.selectArticleInfo(postId, userLocationRows);
    if (articleInfoRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 411,
        message: "postId에 상품이 존재하지 않습니다.",
      });
    }

    if (articleInfoRows[0].sellerId !== id) {
      return res.json({
        isSuccess: false,
        code: 412,
        message: "권한이 없습니다.",
      });
    }

    const deleteArticleRows = await postDao.deleteArticle(postId);
    if (deleteArticleRows.affectedRows === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "판매글 삭제에 실패했습니다.",
      });
    }

    const articleImagesRows = await postDao.selectArticleImages(postId);
    console.log(articleImagesRows);
    let imageIdxList = [];
    for (let i = 0; i < articleImagesRows.length; i++) {
      imageIdxList.push(articleImagesRows[i].imageNo);
    }

    for (let i = 0; i < imageIdxList.length; i++) {
      console.log(imageIdxList[i]);
      deletePostImageRows = await postDao.deletePostImage(imageIdxList[i]);
    }

    await conn.commit();
    return res.json({
      isSuccess: true,
      code: 200,
      message: "상품 판매글 삭제 성공",
    });
  } catch (err) {
    await conn.rollback();
    logger.error(`App - deletePost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};

// 06. updateStatus API = 상품 상태변경
exports.updateStatus = async function (req, res) {
  const { id, location } = req.verifiedToken;
  const { postId } = req.params;
  const { status } = req.body;
  const userLocationRows = [{ location }];

  try {
    const articleInfoRows = await postDao.selectArticleInfo(postId, userLocationRows);
    console.log(articleInfoRows);
    if (articleInfoRows[0].sellerId !== id) {
      return res.json({
        isSuccess: false,
        code: 411,
        message: "권한이 없습니다.",
      });
    }

    if (!status) {
      return res.json({
        isSuccess: false,
        code: 412,
        message: "stauts를 입력하세요.",
      });
    }

    if (status === "reserved") {
      const updateReservedRows = await postDao.updateReserved(postId);
      if (updateReservedRows.affectedRows !== 0) {
        return res.json({
          isSuccess: true,
          code: 200,
          message: "상품 예약중으로 변경 성공",
        });
      }
      return res.json({
        isSuccess: false,
        code: 400,
        message: "상품 예약중으로 변경 실패",
      });
    } else if (status === "completed") {
      const updateCompletedRows = await postDao.updateCompleted(postId);
      if (updateCompletedRows.affectedRows !== 0) {
        return res.json({
          isSuccess: true,
          code: 201,
          message: "상품 판매완료로 변경 성공",
        });
      }
      return res.json({
        isSuccess: false,
        code: 401,
        message: "상품 판매완료로 변경 실패",
      });
    } else {
      return res.json({
        isSuccess: false,
        code: 413,
        message: 'status는 "reserved" 혹은 "completed"로 입력하세요.',
      });
    }
  } catch (err) {
    logger.error(`App - updateStatus Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 07. selectCollectedPost API = 상품 모아보기
exports.selectCollectedPost = async function (req, res) {
  const { id, location } = req.verifiedToken;
  const { userId } = req.params;

  if (id != userId) {
    return res.json({
      isSucess: false,
      code: 411,
      message: "권한이 없습니다.",
    });
  }

  try {
    const collectPostRows = await postDao.collectPost(id, location);
    if (collectPostRows.length > 0)
      return res.json({
        isSuccess: true,
        code: 200,
        message: "상품 모아보기 성공",
        result: collectPostRows,
      });
    return res.json({
      isSuccess: false,
      code: 400,
      message: "상품 모아보기 실패",
    });
  } catch (err) {
    logger.error(`App - updateStatus Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 08. collectPost API = 상품 모아보기 추가 및 헤제
exports.collectPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { userId, targetUserId } = req.params;

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

    const updateCollectRow = await postDao.updateCollect(id, targetUserId);
    console.log(updateCollectRow);
    if (updateCollectRow[0].affectedRows === 0) {
      const insertCollectRow = await postDao.insertCollect(id, targetUserId);
      if (insertCollectRow.length === 0) {
        return res.json({
          isSuccess: false,
          code: 400,
          message: "모아보기 변경 실패",
        });
      }
    }

    const collectStatus = await postDao.selectCollectStatus(id, targetUserId);
    console.log(collectStatus);
    if (collectStatus[0].collectStatus === "Y") {
      await conn.commit();
      return res.json({
        isSuccess: true,
        code: 200,
        message: "모아보기에 사용자 추가 성공",
      });
    } else {
      await conn.commit();
      return res.json({
        isSuccess: true,
        code: 201,
        message: "모아보기에서 사용자 헤제 성공",
      });
    }
  } catch (err) {
    await conn.rollback();
    logger.error(`App - collectPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  } finally {
    conn.release();
  }
};
