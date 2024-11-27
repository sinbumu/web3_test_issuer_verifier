const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();
const Web3 = require('web3').Web3;
const fs = require('fs');

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;
const CLIENT_PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY; // 클라이언트의 개인 키
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // 컨트랙트 주소

// Web3 인스턴스 생성
const web3 = new Web3('http://127.0.0.1:8545'); // 필요한 프로바이더로 변경 가능

// 컨트랙트 ABI 및 인스턴스 설정
const contractABI = JSON.parse(fs.readFileSync('./src/abi/VCNFT.json', 'utf-8'));
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

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

// 메시지를 받아 서명을 생성하여 반환하는 API
router.post('/sign', async (req, res) => {
    const { message } = req.body;

    // 필수값 검사
    if (!message) {
        return res.status(400).json({ error: 'message는 필수값입니다.' });
    }

    try {
        // 환경 변수에서 개인 키를 가져옴
        const privateKey = CLIENT_PRIVATE_KEY.startsWith('0x') ? CLIENT_PRIVATE_KEY : '0x' + CLIENT_PRIVATE_KEY;

        if (!privateKey) {
            return res.status(500).json({ error: '서버에 개인 키가 설정되어 있지 않습니다.' });
        }

        // 개인 키로 계정 객체 생성
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);

        // 메시지 서명 생성
        const signatureObject = account.sign(message);

        res.status(200).json({
            message: '서명 생성 성공',
            signature: signatureObject.signature,
            address: account.address
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서명 생성 실패' });
    }
});

// 클라이언트로부터 tokenId를 받아 민팅된 토큰을 검증하는 API
router.post('/verify-token', async (req, res) => {
    const { tokenId, uri, password } = req.body;

    // 필수값 검사
    if (!tokenId || !uri) {
        return res.status(400).json({ error: 'tokenId와 uri는 필수값입니다.' });
    }

    try {
        // 1. 블록체인에서 credential 데이터 가져오기
        const credentialData = await contract.methods.credential(tokenId).call();

        // 2. Claim 데이터를 uri를 통해 가져오기
        const uriObj = new URL(uri);
        const claimKey = uriObj.searchParams.get('claimKey');

        if (!claimKey) {
            return res.status(400).json({ error: 'uri에 claimKey가 포함되어 있지 않습니다.' });
        }

        // MongoDB API 서버에 Claim 데이터 요청
        const claimResponse = await axios.get(`${MONGODB_API_URL}/api/claims`, {
            params: {
                claimKey,
                password: password || ''
            }
        });

        const claimData = claimResponse.data.Claim;

        // 3. Claim 데이터 해시화
        const claimHash = web3.utils.sha3(JSON.stringify(claimData));

        // 4. 해시 비교
        if (claimHash === credentialData.ClaimHash) {
            res.status(200).json({
                message: '토큰 검증 성공: ClaimHash가 일치합니다.',
                tokenId,
                claimHash
            });
        } else {
            res.status(400).json({
                error: '토큰 검증 실패: ClaimHash가 일치하지 않습니다.',
                expectedClaimHash: claimHash,
                actualClaimHash: credentialData.ClaimHash
            });
        }
    } catch (error) {
        console.error(error);

        // 비밀번호 불일치 에러 처리
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }

        res.status(500).json({ error: '토큰 검증 실패' });
    }
});

module.exports = router;
