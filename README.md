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

## src/routes/clientRoutes.js
### 1. upload API 
엔드포인트: POST /upload

설명:

- /upload 엔드포인트는 클라이언트가 자신의 Claim 데이터를 안전하게 업로드할 수 있도록 합니다. 업로드된 Claim은 서버에 저장되며, 고유한 uri를 반환합니다. 이 uri는 claimKey라는 쿼리 파라미터를 포함하고 있어 나중에 Claim을 조회할 때 사용됩니다. 비밀번호를 제공한 경우, Claim은 비밀번호로 보호되며 이후 액세스 시 동일한 비밀번호가 필요합니다.

요청 파라미터:

- Claim (필수): 자격 증명 데이터 객체로, JSON 형식입니다. 발행자가 처리하고 토큰을 발행하는 데 필요한 모든 정보를 포함해야 합니다.
- password (선택): Claim을 보호하기 위한 사용자 정의 비밀번호입니다. 제공된 경우, 이후 Claim에 액세스할 때 필요합니다.

응답 파라미터:

- message: Claim이 성공적으로 업로드되었음을 나타내는 메시지입니다.
- uri: 업로드된 Claim에 액세스할 수 있는 고유한 URI입니다. claimKey가 쿼리 파라미터로 포함되어 있습니다.
- password: 클라이언트가 제공한 원본 비밀번호 (있는 경우).

예시
```
curl -X POST http://localhost:3000/api/client/upload \
   -H "Content-Type: application/json" \
   -d '{
      "Claim": {
         "title": "Im adult",
         "validate": "InJung"
      },
      "password": "mysecretpassword"
   }'
```
응답예시
```
{
   "message": "Claim 업로드 성공",
   "uri": "http://your-mongodb-api.com/api/claims?claimKey=a1b2c3d4e5f6g7h8i9j0",
   "password": "mysecretpassword"
}
```

### 2. sign API

서명할 평문을 보내면 .env 에 넣어둔 CLIENT_PRIVATE_KEY 이 프라이빗 키 값으로 signature를 생성함.

```
curl -X POST http://localhost:3000/api/client/sign \
   -H "Content-Type: application/json" \
   -d '{
      "message": "http://3.34.178.233:3000/api/claims?claimKey=6ae5b7fce924cc551128"
   }'


curl -X POST http://localhost:3000/api/client/sign \
   -H "Content-Type: application/json" \
   -d '{
      "message": "초기 검증용 평문"
   }'
```

### 3. verify token (client가 issuer가 생성한 토큰의 hash가 옳바른지 체크)

```
curl -X POST http://localhost:3000/api/client/verify-token \
   -H "Content-Type: application/json" \
   -d '{
      "tokenId": "123458",
      "uri": "http://3.34.178.233:3000/api/claims?claimKey=6ae5b7fce924cc551128",
      "password": "mysecretpassword"
   }'

```

## src/routes/issuerRoutes.js
### 1. Mint API 사용 예시
Endpoint: POST /api/issuer/mint

설명:
/mint 엔드포인트는 발행자가 클라이언트가 업로드한 Claim 데이터를 기반으로 새로운 토큰을 발행(mint)할 수 있도록 합니다. 발행자는 클라이언트로부터 받은 uri를 제공하며, 서버는 해당 uri를 통해 Claim을 조회하고 (비밀번호 검증 포함), Claim 데이터를 해시화한 후 스마트 컨트랙트의 certify 함수를 호출하여 토큰을 발행합니다.

##### 요청 파라미터

- uri (필수): Claim 데이터에 액세스할 수 있는 URI입니다. claimKey가 쿼리 파라미터로 포함되어 있어야 합니다 (예: http://your-mongodb-api.com/api/claims?claimKey=a1b2c3d4e5f6g7h8i9j0).
- password (선택): 업로드 시 Claim이 비밀번호로 보호된 경우, 해당 비밀번호를 제공해야 합니다.
- tokenId (필수): 발행할 토큰의 고유 식별자입니다.
- ItokenId (선택): 부모 토큰 ID입니다. 기본값은 0입니다.
- to (필수): 토큰이 발행될 대상의 이더리움 주소입니다.
- issuanceTime (필수): 발급 시각을 나타내는 Unix 타임스탬프 (초 단위).
- expirationTime (필수): 만료 시각을 나타내는 Unix 타임스탬프 (초 단위).
- optionalData (선택): 토큰과 함께 저장할 추가 데이터입니다.

##### 응답 파라미터

- essage: 발행이 성공했음을 나타내는 메시지입니다.
- tokenId: 발행된 토큰의 ID입니다.
- transactionHash: 블록체인 상에서의 발행 트랜잭션 해시입니다.
- claimHash: 검증에 사용된 Claim 데이터의 해시 값입니다.

#### 요청 예시

Unix 시간은 초 단위이며, 아래 예시에서는 발급 시각을 현재 시간으로 설정하고, 만료 시각을 1년 후로 설정하였습니다 (1년은 31,536,000초입니다).

```
# 첫 번째 예시: password와 optionalData 포함
curl -X POST http://localhost:3000/api/issuer/mint \
   -H "Content-Type: application/json" \
   -d '{
      "uri": "http://3.34.178.233:3000/api/claims?claimKey=6ae5b7fce924cc551128",
      "password": "mysecretpassword",
      "tokenId": "123458",
      "ItokenId": "0x0000000000000000000000000000000000000000",
      "to": "0x17D02C217cC867401dB61291e1253DbE579dB56e",
      "issuanceTime": 1697788800,
      "expirationTime": 1729324800,
      "optionalData": "Additional information",
      "signature": "0x5c051d4ab93f09abc6dc95288187cf99c0cc0b9668d1a503da12ee0aa343feb92c1e3e9172d925a823057f864487556960533d4e702d35fca48c7de879e95e071b"
   }'



# 두 번째 예시: password와 optionalData 없이
curl -X POST http://localhost:3000/api/issuer/mint \
   -H "Content-Type: application/json" \
   -d '{
      "uri": "http://example.com/credentials/111111120",
      "tokenId": "111111120",
      "Claim": {
         "name": "Another Credential",
         "type": "AnotherType"
      },
      "to": "0x9D1840102FFcFd72857394A0D0393D8442d4edd2",
      "ItokenId": "111111119",
      "issuanceTime": 1732068275,
      "expirationTime": 1755655475
   }'
```
##### 요청 파라미터 설명:
- uri (필수): 인증서의 URI입니다.
- tokenId (필수): 발행할 토큰의 고유 ID입니다.
- Claim (필수): 인증서 데이터 객체로, JSON 형식으로 다양한 데이터를 포함할 수 있습니다.
- to (필수): 토큰을 받을 대상의 주소입니다.
- issuanceTime (필수): 발급 시각을 나타내는 Unix 시간(초 단위)입니다.
- expirationTime (필수): 만료 시각을 나타내는 Unix 시간(초 단위)입니다.
- ItokenId (선택적): 부모 토큰의 ID입니다. 기본값은 0입니다.
- password (선택적): 사용자 정의 암호로, 이후 검증에 사용됩니다.
- optionalData (선택적): 기타 추가 정보를 문자열로 전달할 수 있습니다.

```
//응답 예
{
   "message": "Mint 성공",
   "tokenId": "90909173",
   "transactionHash": "0xabc123...def456",
   "password": "mysecretpassword",
   "claimHash": "0x123456789abcdef..."
}
```

##### 참고사항:
- 타임스탬프 형식: issuanceTime과 expirationTime은 초 단위의 Unix 시간이어야 합니다.
- password 필드: password를 입력한 경우에만 응답에 password 필드가 포함됩니다. 민감한 정보이므로 안전하게 보관해야 합니다.
- claimHash: Claim 데이터의 해시 값이며, 이후 검증을 위해 사용됩니다.
- 에러 처리: 모든 필수 파라미터가 제공되지 않거나 형식이 잘못된 경우 400 상태 코드와 함께 에러 메시지를 반환합니다.

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
curl -X GET http://localhost:3000/api/issuer/credential/123456
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

### 1. verify

엔드포인트: GET /api/verifier/verify

파라미터:

tokenId (필수): 조회할 토큰 ID

password (선택): 토큰에 접근하기 위한 비밀번호

조회 로직:

tokenId와 선택적인 password를 기반으로 MongoDB API 서버에 조회 요청을 보냅니다.

조회 결과에 pTokenId가 존재하면 부모 tokenId로도 추가 조회를 수행합니다.

```
curl -X POST http://localhost:3000/api/verifier/verify \
   -H "Content-Type: application/json" \
   -d '{
      "tokenId": "123458",
      "uri": "http://3.34.178.233:3000/api/claims?claimKey=6ae5b7fce924cc551128",
      "password": "mysecretpassword",
      "signature": "0xf87d439ab1236daff84f55f6d69baddfe2925bad149e46cbca5ef97103984d4a3e07ce4703dda3512e67f46c22d9fda02719b254e97380ef1a141756d41bb7891b"
   }'

```
```
//응답 예시 
//pTokenId가 있지만, 대응하는 credential을 올려두진 않아서 null로 옴.
blockoxyz@BLOCKOs-MacBook-Pro Downloads % 
curl -X GET "http://localhost:3000/api/verifier/verify?tokenId=9999999&password=mysecretpassword"
{"credential":{"credential":{"_id":"6720927d5b5cb2141cd03bf3","uri":"https://example.com/resource","tokenId":"9999999","pTokenId":"67890","credential":{"name":"Example Credential","type":"ExampleType"},"password":"$2b$10$dL1haEErLfzWoOta3cDz/uxDGfpDzr6Dr9BBT5bLjXAeSgvFYEql2","isDeleted":false,"__v":0}},"parentCredential":null}%  
```

### 2. plaintext

검증을 위한 signature를 생성할 떄 쓸, 평문을 응답해줌

```
curl -X GET http://localhost:3000/api/verifier/plaintext
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

### 추수 변경/추가 될 수 있는 사항

1. 현재는 certify(mint) api를 호출하는게 Issuer가 하는 행위이며, 이 떄 Claim의 내용물을 받아서 해쉬값도 만들어두고, 저장소에 직접 올려서 저장하고 해당 저장소에 대한 uri도 이 api에서 생성함. - 추후에는 클라이언트가 Claim을 스스로 어딘가 저장하고 uri등을 건널 수 있으며, 이럴 경우에는 저장소에 올리는 행위 없이 이더리움 노드와 통신해 블록체인상 기록만 하고, 클라이언트에게 결과 반환만 하기로. 이럴 경우 credential은 이슈어가 발생시키지만(mint) Claim은 완전히 클라이언트가 작성해서 후에 참조할 참조경로또한 클라이언트가 관리. - 이게 지금 생각엔 처리 방식이 꽤 상이할 거 같아서, 굳이 하나의 api에서 분기 처리 하기보다는 지금처럼 이슈어가 직접 클레임 저장하는 api를 두고, 클라이언트가 클레임을 직접 관리하는 경우 api를 추가하는게 더 깔끔할 것 같음.

2. 도용의 경우 방지하기 위한 구현? - 도용을 신경 써도 안되는 클레임은 tokenId를 알고 있는 누구나 제출 가능해도 상관 없지만(ex: A가 B에 대한 자격이 있음 - 이건 제 3자가 도용해도 자기가 자격이 있는건 아님), 도용에 대해 신경써야 할 경우, tokenId에 대한 OwnerOf의 지갑주소를 제출자가 자기 지갑이 맞다고 증명이 가능한지 따져야 할듯. - 서명에서 주소복구 로직을 써서 증명하면 젤 심플할듯?

3. ~~나중에는 timestamp도 넣을 수 있음 > 이슈어가 컨트랙트에 특정 로직 수행중에 certify(mint)할때 자기가 구해서 전달~~ - 반영

4. 기존 이슈어가 직접 클레임을 적재하고 + 해쉬화 하던건 파기? > 이슈어가 클레임 자체를 직접 저장하면 클라이언트가 전달한걸 변조하지 않았을 거란 보장이 안됨. > 다만 일단 api 예시 구현상에선 api 하나에서 둘다 해도 될듯. (설명을 해둔다면) , > 다시 얘기해서 최종 정리 : 시나리오 상 - 클라이언트가 자기 클레임 uri와 password(optional)을 넘김. 이슈어는 클레임을 열어서 해쉬화 하고 certify컨트랙트 메소드를 호출해서 민팅을하고, 결과를 응답함. < 이게 기본 베이스 시나리오. - 기존 이슈어 api에서 클라이언트가 작업하는 영역(자기 클레임을 스토리지에 올리고 공유,제출) , 이슈어가하는 영역 (받은 클레임에 대한 증명서발급(mint)) - 이거 그냥 issuerRoutes에서 찢을지 Routes를 하나 더 추가할지 고민각
-- 최종 정리 : 현재 mint api에 있는 내용을 나눌거임. clientRoutes.js 를 추가하고, 여기에선 Claim 과 비밀번호(optional) 값을 받으면, dbms api서버에 넘겨서 적재하고, 최종적으로 uri와 password(optional)를 응답 받을 거임. 그리고 기존 mint api에서는 uri+password(optional)을 받아서, 이슈어측에선 uri를 통해 Claim데이터를 조회하고 이를 해쉬화 한뒤 contract의 certify method를 call 해서 mint를 함. 이 과정에서 mint api에서는 더이상 dbms와 통신하는 부분은 없고 해쉬화+컨트랙트 call 만 남음.




