# 프젝 설명
ERC 제의 관련 컨트랙트를 테스트 하기 위한 issuer와 verify역할을 하는 서버
이 프로젝트는 Issuer와 Verifier 역할을 하는 API 서버입니다. 블록체인 네트워크와 상호작용하여 토큰을 발행(mint), 소각(burn), 전송(transfer)하거나 자격 증명 데이터를 조회할 수 있는 기능을 제공합니다. 이 API는 Node.js 환경에서 실행됩니다.

주요 기능
```
토큰 발행 (Mint): 블록체인 상에서 새로운 자격 증명 토큰을 생성
토큰 소각 (Burn): 특정 토큰을 소각하여 무효화
토큰 전송 (Transfer): 소유자의 권한으로 다른 계정으로 토큰 전송
자격 증명 조회 (Credential): 특정 토큰에 대한 자격 증명 정보 조회
```
요구사항
```
Node.js: v14 이상
NPM (Node 패키지 관리자): Node.js 설치 시 포함됨
MongoDB: MongoDB API 서버가 필요 (프로젝트의 .env 파일에 MONGODB_API_URL 설정 필요)
Web3 Provider: 블록체인 네트워크에 연결할 Infura 등의 Web3 provider가 필요 (.env 파일에서 설정)
```

설치 및 실행 방법

프로젝트 클론

```
git clone https://github.com/your-repository/issuer-verifier-api.git
cd issuer-verifier-api
```

필수 환경 변수 설정 프로젝트 루트에 .env 파일을 생성하고 아래 내용을 추가합니다.

```
MONGODB_API_URL=your_mongodb_api_server_url
ETHEREUM_MAINNET=https://mainnet.infura.io/v3/your_infura_project_id
ETHEREUM_DEVNET=https://goerli.infura.io/v3/your_infura_project_id
PRIVATE_KEY=your_metamask_private_key
USE_DEVNET=true  # true면 테스트 네트워크, false면 메인넷 연결
CONTRACT_ADDRESS=your_target_contract_address #대상이 될 컨트랙트 주소
```

의존성 설치
```
npm install
```

서버 실행
```
node src/app.js
```

API 테스트 서버가 http://localhost:3000 에서 실행됩니다. 

Postman 또는 curl 명령어를 사용하여 API 요청을 테스트할 수 있습니다.

## src/routes/issuerRoutes.js
### 1. Mint API 사용 예시
Endpoint: POST /api/issuer/mint

설명:
mint API는 다음과 같은 필수 파라미터를 받습니다:

- uri: 인증서 URI
- tokenId: 토큰의 고유 ID
- ItokenId: 부모 토큰 ID
- password: 클라이언트가 설정할 암호 (이후 검증에 사용)
- Claim: 인증서 데이터 객체 (JSON 형식)
- to: 민팅할 대상 주소 (ERC-721 토큰을 받을 주소)

요청이 성공하면 tokenId, transactionHash, password, claimHash 값을 반환합니다. 

반환된 password와 claimHash 값은 클라이언트가 저장해 두어 이후 검증에 사용할 수 있습니다.

#### 요청 예시
```
curl -X POST http://localhost:3000/api/issuer/mint \
   -H "Content-Type: application/json" \
   -d '{
      "uri": "http://3.34.178.233:3000/api/credentials",
      "tokenId": "90909173",
      "password": "mysecretpassword",
      "Claim": {
         "name": "Example Credential",
         "type": "ExampleType"
      },
      "to": "0x3488dDf18de8dBD52Ac9Cb95E2685185D90663F5",
      "ItokenId": "111111120"
   }'

curl -X POST http://localhost:3000/api/issuer/mint \
   -H "Content-Type: application/json" \
   -d '{
      "uri": "http://3.34.178.233:3000/api/credentials",
      "tokenId": "111111120",
      "Claim": {
         "name": "Example Credential",
         "type": "ExampleType"
      },
      "to": "0x9D1840102FFcFd72857394A0D0393D8442d4edd2",
      "ItokenId": "111111119"
   }'
```
요청 파라미터:

- uri: 인증서 URI (필수)
- tokenId: 토큰의 고유 ID (필수)
- password: 사용자 정의 암호 (필수)
- Claim: 인증서 데이터 객체, JSON 형식으로 다양한 데이터를 포함할 수 있음 (필수)
- to: 토큰을 받을 대상 주소 (필수)
- ItokenId: 부모 토큰 ID (선택적)

```
//응답 예
{
   "message": "Mint 성공",
   "tokenId": "112345",
   "transactionHash": "0xabc123...def456",
   "password": "generatedpassword",
   "claimHash": "hashvalue12345"
}
```

### 2. Burn API 사용 예시
Endpoint: POST /api/issuer/burn

설명:

burn API는 tokenId를 필수로 받습니다.

요청이 성공하면 해당 토큰이 소각되며, transactionHash와 tokenId가 응답됩니다.

```
curl -X POST http://localhost:3000/api/issuer/burn \
   -H "Content-Type: application/json" \
   -d '{
      "tokenId": "90909166"
   }'

```

요청 예시:

tokenId: 소각할 토큰의 고유 ID (필수)

```
//성공응답 예
{
   "message": "Burn 성공",
   "tokenId": "112345",
   "transactionHash": "0xabc123...def456"
}
```
### Credential 조회
```
curl -X GET http://localhost:3000/api/issuer/credential/111111117
```

### TransferFrom 전송
```
curl -X POST http://localhost:3000/api/issuer/transfer \
-H "Content-Type: application/json" \
-d '{
    "from": "0xSenderAddress",
    "to": "0xReceiverAddress",
    "tokenId": "90909091"
}'
```

### 기타

ClaimURI 조회
```
curl -X GET http://localhost:3000/api/issuer/claimURI/90909091
```

ClaimHash 조회
```
curl -X GET http://localhost:3000/api/issuer/claimHash/90909091
```

## src/routes/verifierRoutes.js
엔드포인트: GET /api/verifier/verify

파라미터:

tokenId (필수): 조회할 토큰 ID

password (선택): 토큰에 접근하기 위한 비밀번호

조회 로직:

tokenId와 선택적인 password를 기반으로 MongoDB API 서버에 조회 요청을 보냅니다.

조회 결과에 pTokenId가 존재하면 부모 tokenId로도 추가 조회를 수행합니다.

```
//비밀번호 없는 경우
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=111111119"

//있는 경우
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=90909173&password=mysecretpassword"
```
```
//응답 예시 
//pTokenId가 있지만, 대응하는 credential을 올려두진 않아서 null로 옴.
blockoxyz@BLOCKOs-MacBook-Pro Downloads % 
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=9999999&password=mysecretpassword"
{"credential":{"credential":{"_id":"6720927d5b5cb2141cd03bf3","uri":"https://example.com/resource","tokenId":"9999999","pTokenId":"67890","credential":{"name":"Example Credential","type":"ExampleType"},"password":"$2b$10$dL1haEErLfzWoOta3cDz/uxDGfpDzr6Dr9BBT5bLjXAeSgvFYEql2","isDeleted":false,"__v":0}},"parentCredential":null}%  
```

## 해쉬 무결성 체크 관련
```
//issuerRoutes.js 에서
const { uri, tokenId, ItokenId, password, Claim, to } = req.body;
//저기서 Claim 에 대해서
const claimHash = generateHash(Claim)
//이렇게 해쉬화 하기 때문에
//나중에 데이터 무결성 체크 검증이 필요해 진다면 위와 같은 절차를 밟아야 함.

//verifierRoutes.js 에서 
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
//이런식으로 현재 따지는데, 위처럼 정확히 mint시에 Claim으로 전달한 부분만 해시채크를 해야 하고
//몽고에 적재한 document를 통으로 해시화 하면 제대로 불일치 확인이 안 될 수 있음을 주의
```
