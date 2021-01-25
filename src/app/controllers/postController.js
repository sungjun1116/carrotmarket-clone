const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");

const postDao = require("../dao/postDao");

// 01.search API = 동네기반 상품 찾기
exports.selectPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  try {
    const postRows = await postDao.selectPost(id, userLocationRows);
    if (postRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "게시물 검색 성공",
        data: postRows,
      });
    }
    return res.json({
      isSucess: false,
      code: 412,
      message: "게시물이 존재하지 않습니다.",
    });
  } catch (err) {
    logger.error(`App - findPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 02.keywordSearch API = 상품 검색(키워드)
exports.selectKeywordPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { keyword } = req.params;
  let { showCompleted } = req.query;
  showCompleted ? (showCompleted = showCompleted) : (showCompleted = "true");

  // 접속한 user의 위치 정보 추출
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  try {
    const postKeywordRows = await postDao.selectKeywordPost(
      id,
      keyword,
      showCompleted,
      userLocationRows
    );
    if (postKeywordRows.length > 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "게시물 검색 성공",
        data: postKeywordRows,
      });
    }
    return res.json({
      isSucess: false,
      code: 412,
      message: "게시물이 존재하지 않습니다.",
    });
  } catch (err) {
    logger.error(`App - selectKeywordPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 03. Article API = 상품 상세조회
exports.selectArticleInfo = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postId } = req.params;
  const userLocationRows = await postDao.selectUserLocation(id);

  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  try {
    const articleInfoRows = await postDao.selectArticleInfo(
      postId,
      userLocationRows
    );

    if (articleInfoRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "postIdx에 조회할 상품 상세정보가 없습니다.",
      });
    }
    console.log(articleInfoRows);

    // 사용자 상품에 대한 관심상품 등록 여부
    const LikeStatusRows = await postDao.selectLikeStatus(id, postId);
    if (LikeStatusRows.length === 0 || LikeStatusRows[0].LikeStatus === 0) {
      articleInfoRows[0].LikeStatus = false;
    } else {
      articleInfoRows[0].LikeStatus = true;
    }

    // 상품 사진들
    const articleImagesRows = await postDao.selectArticleImages(postId);
    articleInfoRows[0].postImageUrlList = articleImagesRows;

    return res.json({
      isSuccess: true,
      code: 200,
      message: "상품 상세조회 검색 성공",
      data: articleInfoRows,
    });
  } catch (err) {
    logger.error(`App - selectArticleInfo Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 04. CreatePost API = 상품 판매글 등록
exports.createPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const {
    postImageUrlList,
    postName,
    categoryIdx,
    price,
    priceNegoPossible,
    contents,
    postShowArea,
  } = req.body;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  try {
    const articleRows = await postDao.insertArticle(
      id,
      postName,
      categoryIdx,
      price,
      priceNegoPossible,
      contents,
      postShowArea,
      userLocationRows
    );
    if (articleRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "판매글 생성에 실패했습니다.",
      });
    }

    let postImageRows = ``;
    let imageIdxList = [];
    for (let i = 0; i < postImageUrlList.length; i++) {
      postImageRows = await postDao.insertPostImage(
        articleRows.insertId,
        postImageUrlList[i]
      );
      if (postImageRows.length === 0) {
        return res.json({
          isSuccess: false,
          code: 412,
          message: "imageUrlList는 string으로 이루어져야 합니다.",
        });
      }
      imageIdxList.push(postImageRows.insertId);
    }

    return res.json({
      postIdx: articleRows.insertId,
      imageIdx: imageIdxList,
      isSuccess: true,
      code: 200,
      message: "상품 판매글 추가 성공",
    });
  } catch (err) {
    logger.error(`App - createPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 04. editPost API = 상품 판매글 수정
exports.editPost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postIdx } = req.params;
  const {
    postImageUrlList,
    postName,
    categoryIdx,
    price,
    priceNegoPossible,
    contents,
    postShowArea,
  } = req.body;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  try {
    const editArticleRows = await postDao.editArticle(
      postName,
      categoryIdx,
      price,
      priceNegoPossible,
      contents,
      postShowArea,
      postIdx,
      userLocationRows
    );
    if (editArticleRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 400,
        message: "판매글 수정에 실패했습니다.",
      });
    }
    const articleImagesRows = await postDao.selectArticleImages(postIdx);
    let imageIdxList = [];
    for (let i = 0; i < articleImagesRows.length; i++) {
      imageIdxList.push(articleImagesRows[i].imageNo);
    }
    let editPostImageRows = ``;
    for (let i = 0; i < postImageUrlList.length; i++) {
      editPostImageRows = await postDao.editPostImage(
        imageIdxList[i],
        postImageUrlList[i]
      );
      if (editPostImageRows.length === 0) {
        return res.json({
          isSuccess: false,
          code: 412,
          message: "imageUrl 변경에 실패했습니다.",
        });
      }
    }

    return res.json({
      isSuccess: true,
      code: 200,
      message: "상품 판매글 수정 성공",
    });
  } catch (err) {
    logger.error(`App - editPost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 05. deletePost API = 상품 판매글 삭제
exports.deletePost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postIdx } = req.params;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }

  const articleInfoRows = await postDao.selectArticleInfo(
    postIdx,
    userLocationRows
  );
  if (articleInfoRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 431,
      message: "postIdx에 상품이 존재하지 않습니다.",
    });
  }

  if (articleInfoRows[0].sellerId !== id) {
    return res.json({
      isSuccess: false,
      code: 412,
      message: "postIdx에 접근 권한이 없습니다.",
    });
  }

  try {
    const deleteArticleRows = await postDao.deleteArticle(postIdx);
    if (deleteArticleRows.affectedRows === 0) {
      return res.json({
        isSuccess: false,
        code: 421,
        message: "postIdx에 삭제할 판매글이 없습니다.",
      });
    }

    return res.json({
      isSuccess: true,
      code: 200,
      message: "상품 판매글 삭제 성공",
    });
  } catch (err) {
    logger.error(`App - deletePost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 06. updateReserved API = 상품 예약중으로 변경
exports.updateReserved = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postIdx } = req.params;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }
  try {
    const articleInfoRows = await postDao.selectArticleInfo(
      postIdx,
      userLocationRows
    );
    if (articleInfoRows[0].sellerId !== id) {
      return res.json({
        isSuccess: false,
        code: 412,
        message: "userIdx에 권한이 없습니다.",
      });
    }
    const updateReservedRows = await postDao.updateReserved(postIdx);
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
  } catch (err) {
    logger.error(`App - updateReserved Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 07. updateCompleted API = 상품 판매완료로 변경
exports.updateCompleted = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postIdx } = req.params;
  const userLocationRows = await postDao.selectUserLocation(id);
  if (userLocationRows.length === 0) {
    return res.json({
      isSuccess: false,
      code: 411,
      message: "사용자의 위치정보가 없습니다.",
    });
  }
  try {
    const articleInfoRows = await postDao.selectArticleInfo(
      postIdx,
      userLocationRows
    );
    if (articleInfoRows[0].sellerId !== id) {
      return res.json({
        isSuccess: false,
        code: 412,
        message: "userIdx에 권한이 없습니다.",
      });
    }
    const updateCompletedRows = await postDao.updateCompleted(postIdx);
    if (updateCompletedRows.affectedRows !== 0) {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "상품 판매완료로 변경 성공",
      });
    }

    return res.json({
      isSuccess: false,
      code: 400,
      message: "상품 판매완료로 변경 실패",
    });
  } catch (err) {
    logger.error(`App - updateCompleted Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 08. likePost API = 상품 판매글 관심상품 등록/헤제
exports.likePost = async function (req, res) {
  const { id } = req.verifiedToken;
  const { postIdx } = req.params;

  try {
    const deletelikeArticleRows = await postDao.deletelikeArticle(id, postIdx);
    if (deletelikeArticleRows.affectedRows === 0) {
      const insertLikeArticleRows = await postDao.insertLikeArticle(
        id,
        postIdx
      );
      if (insertLikeArticleRows.length === 0) {
        return res.json({
          isSuccess: false,
          code: 411,
          message: "잘못된 postIdx입니다.",
        });
      }
    }

    const likeStatus = await postDao.selectLikeStatus(id, postIdx);
    if (likeStatus[0].favoriteStatus === "Y") {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "관심상품 추가 성공",
      });
    } else {
      return res.json({
        isSuccess: true,
        code: 201,
        message: "관심상품 헤제 성공",
      });
    }
  } catch (err) {
    logger.error(`App - likePost Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
