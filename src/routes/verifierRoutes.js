const express = require('express');
const Web3 = require('web3').Web3;
const axios = require('axios');
const fs = require('fs');
const router = express.Router();

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const web3 = new Web3('http://127.0.0.1:8545');

// ABI 설정 및 컨트랙트 초기화
const contractABI = JSON.parse(fs.readFileSync('./src/abi/VCNFT.json', 'utf-8'));
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

// 해시 생성 함수
const generateHash = (data) => {
    return web3.utils.sha3(JSON.stringify(data));
};

// 검증에 사용할 평문 저장 변수
let currentPlaintext = 'qwerty';

// 검증자의 평문을 제공하는 API (필요 시 유지)
router.get('/plaintext', (req, res) => {
    res.status(200).json({
        message: '현재 검증용 평문입니다.',
        plaintext: currentPlaintext
    });
});

// 1. Verify (검증) API 수정
router.post('/verify', async (req, res) => {
    const { tokenId, password, signature } = req.body;

    // 필수값 검사
    if (!tokenId || !signature) {
        return res.status(400).json({ error: 'tokenId와 signature는 필수값입니다.' });
    }

    try {
        // 1. 서명 검증: signature와 currentPlaintext를 사용하여 주소 복원
        const recoveredAddress = web3.eth.accounts.recover(currentPlaintext, signature);
        console.log("recoveredAddress : ", recoveredAddress);

        // 2. 블록체인에서 토큰의 소유자 확인
        const ownerAddress = await contract.methods.ownerOf(tokenId).call();
        console.log("ownerAddress : ", ownerAddress);

        if (recoveredAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
            return res.status(401).json({ error: '서명 검증 실패: 토큰 소유자와 서명 주소가 일치하지 않습니다.' });
        }

        // 3. 블록체인에서 토큰의 Credential 데이터 가져오기
        const credentialData = await contract.methods.credential(tokenId).call();
        const { ClaimURI, ClaimHash } = credentialData;
        console.log("credentialData : ", credentialData);

        // 4. ClaimURI에서 claimKey 추출
        const uriObj = new URL(ClaimURI);
        const claimKey = uriObj.searchParams.get('claimKey');

        if (!claimKey) {
            return res.status(400).json({ error: 'ClaimURI에 claimKey가 포함되어 있지 않습니다.' });
        }

        // 5. MongoDB API 서버에서 Claim 데이터 가져오기
        const claimResponse = await axios.get(`${MONGODB_API_URL}/api/claims`, {
            params: {
                claimKey,
                password: password || ''
            }
        });

        const claimData = claimResponse.data.Claim;

        // 6. Claim 데이터 해시화
        const claimHash = generateHash(claimData);

        // 7. 해시 비교
        if (claimHash === ClaimHash) {
            res.status(200).json({
                message: '토큰 및 소유자 검증 성공: ClaimHash가 일치하고 소유자가 확인되었습니다.',
                tokenId,
                claimHash
            });
        } else {
            res.status(400).json({
                error: '토큰 검증 실패: ClaimHash가 일치하지 않습니다.',
                expectedClaimHash: claimHash,
                actualClaimHash: ClaimHash
            });
        }
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
