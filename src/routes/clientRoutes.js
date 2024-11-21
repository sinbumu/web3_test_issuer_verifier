const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;

// 클라이언트로부터 Claim과 password(옵션)를 받아 저장하고 uri를 반환하는 API
router.post('/upload', async (req, res) => {
    const { Claim, password } = req.body;

    // 필수값 검사
    if (!Claim) {
        return res.status(400).json({ error: 'Claim은 필수값입니다.' });
    }

    try {
        // 비밀번호 해시화
        const saltRounds = 10;
        const hashedPassword = password ? await bcrypt.hash(password, saltRounds) : null;

        // 랜덤 20자 문자열 생성
        const random20lengthStr = crypto.randomBytes(10).toString('hex'); // 20글자

        // uri 생성 (claimKey를 쿼리 파라미터로 포함)
        const uri = `${MONGODB_API_URL}/api/claims?claimKey=${random20lengthStr}`;

        // DBMS API 서버에 데이터 저장 요청
        await axios.post(`${MONGODB_API_URL}/api/claims`, {
            Claim,
            password: hashedPassword,
            claimKey: random20lengthStr
        });

        // 클라이언트에게 uri와 password(옵션)를 반환
        res.status(200).json({
            message: 'Claim 업로드 성공',
            uri,
            password: password || null
        });
    } catch (error) {
        console.error(error);

        // claimKey 중복 시 에러 처리
        if (error.response && error.response.status === 409) {
            return res.status(409).json({ error: '이미 존재하는 claimKey입니다.' });
        }

        res.status(500).json({ error: 'Claim 업로드 실패' });
    }
});

module.exports = router;
