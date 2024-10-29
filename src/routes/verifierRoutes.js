const express = require('express');
const axios = require('axios');
const router = express.Router();

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;

// 1. Verify (검증) API
router.get('/verify', async (req, res) => {
    const { tokenId, password } = req.query;

    // 필수값 검사
    if (!tokenId) {
        return res.status(400).json({ error: 'tokenId는 필수값입니다.' });
    }

    try {
        // MongoDB API 서버에서 기본 tokenId로 데이터 조회
        let queryUrl = `${MONGODB_API_URL}/api/credentials?tokenId=${tokenId}`;
        if (password) {
            queryUrl += `&password=${password}`;
        }
        
        const response = await axios.get(queryUrl);
        const credentialData = response.data;

        // pTokenId가 있는 경우 부모 데이터 추가 조회
        let parentData = null;
        if (credentialData.pTokenId) {
            const parentResponse = await axios.get(`${MONGODB_API_URL}/api/credentials?tokenId=${credentialData.pTokenId}`);
            parentData = parentResponse.data;
        }

        // 응답 데이터 형식: 기본 데이터 + (optional) 부모 데이터
        const result = {
            credential: credentialData,
            parentCredential: parentData || null
        };

        res.status(200).json(result);
    } catch (error) {
        console.error(error);

        if (error.response && error.response.status === 401) {
            res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        } else if (error.response && error.response.status === 404) {
            res.status(404).json({ error: '해당 tokenId에 대한 Credential이 없습니다.' });
        } else {
            res.status(500).json({ error: '서버 오류로 인해 조회에 실패했습니다.' });
        }
    }
});

module.exports = router;
