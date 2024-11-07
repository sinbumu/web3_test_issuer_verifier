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

// 1. Verify (검증) API
router.get('/verify', async (req, res) => {
    const { tokenId, password } = req.query;

    // 필수값 검사
    if (!tokenId) {
        return res.status(400).json({ error: 'tokenId는 필수값입니다.' });
    }

    try {
        let currentTokenId = tokenId;
        let iterationCount = 0;
        const issuerClaims = [];

        while (currentTokenId && iterationCount < 23) {
            // Web3를 통해 컨트랙트에서 데이터 가져오기
            const credentialData = await contract.methods.credential(currentTokenId).call();
            const { ClaimURI, ClaimHash, Issuer, IssuerTokenID } = credentialData;
            console.log(`credentialData for tokenId ${currentTokenId}: `, credentialData);

            // MongoDB API 서버에서 tokenId로 데이터 조회
            let queryUrl = `${ClaimURI}?tokenId=${currentTokenId}`;
            if (password) {
                queryUrl += `&password=${password}`;
            }
            const response = await axios.get(queryUrl);
            const mongoCredentialData = response.data;

            console.log(`MongoDB response data for tokenId ${currentTokenId}:`, mongoCredentialData);

            // MongoDB에서 가져온 Claim 데이터 확인
            if (!mongoCredentialData.credential || !mongoCredentialData.credential.Claim) {
                console.error(`Claim data not found in MongoDB response for tokenId ${currentTokenId}`);
                return res.status(400).json({ error: 'Claim 데이터가 없습니다.' });
            }
            const mongoClaim = mongoCredentialData.credential.Claim;

            // 무결성 체크: MongoDB에서 가져온 Claim 데이터를 해시화하여 컨트랙트의 claimHash와 비교
            const computedHash = generateHash(mongoClaim);
            if (computedHash !== ClaimHash) {
                return res.status(400).json({ error: '무결성 체크 실패: 데이터가 손상되었습니다.' });
            }

            // issuerClaims 배열에 결과 추가
            issuerClaims.push({
                tokenId: currentTokenId,
                mongoClaim,
                ClaimURI,
                ClaimHash,
                Issuer,
                IssuerTokenID: IssuerTokenID.toString() // BigInt를 문자열로 변환
            });

            // 다음 IssuerTokenID로 반복 처리
            currentTokenId = IssuerTokenID !== 0n ? IssuerTokenID.toString() : null;
            iterationCount++;
        }

        // 응답 데이터 형식: 첫 번째 토큰과 그에 연결된 모든 IssuerClaim 포함
        res.status(200).json({
            mainCredential: issuerClaims[0],
            issuerClaims: issuerClaims.slice(1) // 첫 번째 제외하고 나머지 IssuerClaims 반환
        });
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
