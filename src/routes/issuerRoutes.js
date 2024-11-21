const express = require('express');
const bcrypt = require('bcrypt');
const Web3 = require('web3').Web3;
const axios = require('axios');
const fs = require('fs');
const router = express.Router();

require('dotenv').config();
const MONGODB_API_URL = process.env.MONGODB_API_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Web3 설정
const web3 = new Web3('http://127.0.0.1:8545');
const account = web3.eth.accounts.privateKeyToAccount(
    process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : '0x' + process.env.PRIVATE_KEY
);
web3.eth.accounts.wallet.add(account);

// ABI 및 컨트랙트 설정
const contractABI = JSON.parse(fs.readFileSync('./src/abi/VCNFT.json', 'utf-8'));
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

// 해시 생성 함수
const generateHash = (data) => {
    return web3.utils.sha3(JSON.stringify(data));
};


// Mint (발행) API
router.post('/mint', async (req, res) => {
    const { 
        uri, 
        tokenId, 
        ItokenId, 
        password, 
        to, 
        issuanceTime, 
        expirationTime, 
        optionalData 
    } = req.body;

    // 필수값 검사
    if (!uri || !tokenId || !to || issuanceTime === undefined || expirationTime === undefined) {
        return res.status(400).json({ error: 'uri, tokenId, to, issuanceTime, expirationTime는 필수값입니다.' });
    }

    try {
        // uri에서 claimKey 추출
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

        // Claim 데이터 해시화
        const claimHash = generateHash(claimData);

        // `ItokenId`가 없을 경우 기본값으로 `0` 설정
        const parentTokenId = ItokenId || 0;

        // optionalData가 없으면 빈 문자열로 설정
        const optionalDataValue = optionalData || "";

        // ERC-721 컨트랙트의 certify 함수 호출, to 주소로 민팅
        const certifyTx = contract.methods.certify(
            to,
            tokenId,
            uri,
            claimHash,
            parentTokenId,
            issuanceTime,
            expirationTime,
            optionalDataValue
        );

        const gas = await certifyTx.estimateGas({ from: account.address });
        const certifyTxData = certifyTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: certifyTxData,
            gas
        };

        // 트랜잭션 전송
        const receipt = await web3.eth.sendTransaction(tx);

        res.status(200).json({ 
            message: 'Mint 성공', 
            tokenId, 
            transactionHash: receipt.transactionHash,
            claimHash
        });
    } catch (error) {
        console.error(error);

        // 에러가 비밀번호 불일치로 인한 것인지 확인
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }

        res.status(500).json({ error: 'Mint 실패' });
    }
});


// Revoke (소각) API 추가
router.post('/revoke', async (req, res) => {
    const { tokenId } = req.body;

    if (!tokenId) {
        return res.status(400).json({ error: 'tokenId는 필수값입니다.' });
    }

    try {
        // ERC-721 컨트랙트의 revoke 함수 호출
        const revokeTx = contract.methods.revoke(tokenId);

        const gas = await revokeTx.estimateGas({ from: account.address });
        const revokeTxData = revokeTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: revokeTxData,
            gas
        };

        // 트랜잭션 전송
        const receipt = await web3.eth.sendTransaction(tx);

        // MongoDB API 서버에 논리 삭제 요청
        await axios.delete(`${MONGODB_API_URL}/api/credentials/${tokenId}`);

        res.status(200).json({ 
            message: 'Revoke 성공', 
            tokenId, 
            transactionHash: receipt.transactionHash 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Revoke 실패' });
    }
});

// ClaimURI 조회 API
router.get('/claimURI/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        const claimURI = await contract.methods.claimURI(tokenId).call();
        res.status(200).json({ tokenId, claimURI });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ClaimURI 조회 실패' });
    }
});

// ClaimHash 조회 API
router.get('/claimHash/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        const claimHash = await contract.methods.claimHash(tokenId).call();
        res.status(200).json({ tokenId, claimHash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ClaimHash 조회 실패' });
    }
});

// Credential 조회 API 수정
router.get('/credential/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        const credentialData = await contract.methods.credential(tokenId).call();

        // Credential 구조체의 모든 필드 포함
        const formattedCredentialData = {
            claimURI: credentialData.ClaimURI,
            claimHash: credentialData.ClaimHash,
            issuer: credentialData.Issuer,
            issuerTokenID: credentialData.IssuerTokenID.toString(),
            issueDate: credentialData.IssueDate.toString(),
            expirationDate: credentialData.ExpirationDate.toString(),
            optionalData: credentialData.OptionalData
        };

        res.status(200).json({ tokenId, credential: formattedCredentialData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Credential 조회 실패' });
    }
});


// TransferFrom 전송 API
router.post('/transfer', async (req, res) => {
    const { from, to, tokenId } = req.body;

    if (!from || !to || !tokenId) {
        return res.status(400).json({ error: 'from, to, tokenId는 필수값입니다.' });
    }

    try {
        // `transferFrom` 트랜잭션 생성
        const transferTx = contract.methods.transferFrom(from, to, tokenId);

        const gas = await transferTx.estimateGas({ from: account.address });
        const transferTxData = transferTx.encodeABI();

        const tx = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: transferTxData,
            gas
        };

        // 트랜잭션 전송
        const receipt = await web3.eth.sendTransaction(tx);

        res.status(200).json({ 
            message: 'Transfer 성공', 
            tokenId, 
            transactionHash: receipt.transactionHash 
        });
    } catch (error) {
        console.error('Transfer 실패:', error);
        res.status(500).json({ error: 'Transfer 실패' });
    }
});

module.exports = router;
