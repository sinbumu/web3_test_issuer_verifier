const express = require('express');
const bcrypt = require('bcrypt');
const Web3 = require('web3').Web3;
const axios = require('axios');
const crypto = require('crypto');
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
// const CONTRACT_ADDRESS = '0xB637A0ed6d738702C50a70ed32e3f0ba9D3c6bDB'; // 배포된 컨트랙트 주소로 업데이트 필요
const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

// 하드코딩된 기본 Credential 데이터
// const exampleCredential = {
//     name: 'Example Credential',
//     type: 'ExampleType'
// };

// 해시 생성 함수
// 현재는 Credential이 어떤 데이터 포멧을 가지나 이런게 전혀 없기 때문에
// 그냥 받은 데이터 무조건 web3의 sha3 유틸로 해시화.
// 후에 구체화 되면 조건문 등 들어갈 수 있음.
const generateHash = (data) => {
    return web3.utils.sha3(JSON.stringify(data));
};

// Mint (발행) API
router.post('/mint', async (req, res) => {
    const { uri, tokenId, ItokenId, password, Claim, to } = req.body;

    // 필수값 검사
    if (!uri || !tokenId || !Claim || !to) {
        return res.status(400).json({ error: 'uri, tokenId, Claim, to는 필수값입니다.' });
    }

    try {
        const claimHash = generateHash(Claim); // Claim의 해시값 생성

        // `ItokenId`가 없을 경우 기본값으로 `0` 설정
        const parentTokenId = ItokenId || 0;

        // ERC-721 컨트랙트의 certify 함수 호출, to 주소로 민팅
        const certifyTx = contract.methods.certify(to, tokenId, uri, claimHash, parentTokenId);
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

        // 비밀번호 해시화
        const saltRounds = 10;
        const hashedPassword = password ? await bcrypt.hash(password, saltRounds) : null;


        // MongoDB API 서버에 데이터 저장 요청 (to 주소와 ItokenId 포함)
        await axios.post(`${MONGODB_API_URL}/api/credentials`, {
            uri,
            tokenId,
            ItokenId: parentTokenId, // ItokenId로 저장
            Claim: Claim,
            password: hashedPassword, // 해시된 비밀번호
            hash: claimHash,
            to // to 주소 추가
        });

        res.status(200).json({ 
            message: 'Mint 성공', 
            tokenId, 
            transactionHash: receipt.transactionHash,
            password, // 원본 비밀번호 반환
            claimHash
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Mint 실패' });
    }
});

// Burn (소각) API
router.post('/burn', async (req, res) => {
    const { tokenId } = req.body;

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

        res.status(200).json({ message: 'Burn 성공', tokenId, transactionHash: receipt.transactionHash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Burn 실패' });
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

// Credential 조회 API
router.get('/credential/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        const credentialData = await contract.methods.credential(tokenId).call();
        
        // 정확한 프로퍼티 이름을 사용하고 BigInt를 문자열로 변환
        const formattedCredentialData = {
            claimURI: credentialData.ClaimURI,
            claimHash: credentialData.ClaimHash,
            issuer: credentialData.Issuer,
            issuerTokenID: credentialData.IssuerTokenID.toString()
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
        
        // `account.address`에서 가스 추정 및 트랜잭션 데이터 생성
        const gas = await transferTx.estimateGas({ from: account.address });
        const transferTxData = transferTx.encodeABI();

        // 트랜잭션 설정
        const tx = {
            from: account.address,       // 트랜잭션 생성 계정
            to: CONTRACT_ADDRESS,        // 컨트랙트 주소
            data: transferTxData,        // `transferFrom` 트랜잭션 데이터
            gas
        };

        // 트랜잭션 전송
        const receipt = await web3.eth.sendTransaction(tx);
        res.status(200).json({ message: 'Transfer 성공', tokenId, transactionHash: receipt.transactionHash });
    } catch (error) {
        console.error('Transfer 실패:', error);
        res.status(500).json({ error: 'Transfer 실패' });
    }
});


module.exports = router;
