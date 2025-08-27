# Stability Blockchain Examples

Note that no ether libraries or functions are used! I will have my own API key in
.env.local.

From this sample JSON, a smart contract was written. 
{
  "name": "Alice",
  "level": 99,
  "isCool": true
}

The smart contract:
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserData {

    struct User {
        string name;
        uint256 level;
        bool isCool;
    }

    mapping(uint256 => User) public users;
    uint256 public nextId;

    function createUser(string memory _name, uint256 _level, bool _isCool) public {
        uint256 id = nextId++;
        users[id] = User(_name, _level, _isCool);
    }

    function getUser(uint256 _id) public view returns (User memory) {
        return users[_id];
    }

    function updateUser(uint256 _id, string memory _name, uint256 _level, bool _isCool) public {
        users[_id].name = _name;
        users[_id].level = _level;
        users[_id].isCool = _isCool;
    }
}

This smart contract was then deployed and compiled (in same step) by using this CURL command:
curl -X POST 'https://rpc.stabilityprotocol.com/zkt/b0cvbslsk55l' \
-H "Content-Type: application/json" \
--data '{
    "code": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract UserData {\n\n    struct User {\n        string name;\n        uint256 level;\n        bool isCool;\n    }\n\n    mapping(uint256 => User) public users;\n    uint256 public nextId;\n\n    function createUser(string memory _name, uint256 _level, bool _isCool) public {\n        uint256 id = nextId++;\n        users[id] = User(_name, _level, _isCool);\n    }\n\n    function getUser(uint256 _id) public view returns (User memory) {\n        return users[_id];\n    }\n\n    function updateUser(uint256 _id, string memory _name, uint256 _level, bool _isCool) public {\n        users[_id].name = _name;\n        users[_id].level = _level;\n        users[_id].isCool = _isCool;\n    }\n}",
    "arguments": []
}'

or this javascript:
const url = 'https://rpc.stabilityprotocol.com/zkt/b0cvbslsk55l';
const data = {
  code: "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract UserData {\n\n    struct User {\n        string name;\n        uint256 level;\n        bool isCool;\n    }\n\n    mapping(uint256 => User) public users;\n    uint256 public nextId;\n\n    function createUser(string memory _name, uint256 _level, bool _isCool) public {\n        uint256 id = nextId++;\n        users[id] = User(_name, _level, _isCool);\n    }\n\n    function getUser(uint256 _id) public view returns (User memory) {\n        return users[_id];\n    }\n\n    function updateUser(uint256 _id, string memory _name, uint256 _level, bool _isCool) public {\n        users[_id].name = _name;\n        users[_id].level = _level;\n        users[_id].isCool = _isCool;\n    }\n}",
  arguments: []
};

console.log('Sending deploy request to Stability ZKT API...');
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const result = await response.json();

if (!response.ok) {
  console.error('API Error:', result);
  throw new Error(result?.error?.message || result.details || result.error || `Request failed with status ${response.status}`);
}

console.log('API Response received.');
console.log(JSON.stringify(result, null, 2));

const contractAddress = result.contractAddress;

if (contractAddress) {
    console.log('Deployment successful! Contract Address:', contractAddress);
    if (window.updateContractAddress) {
        window.updateContractAddress(contractAddress);
    }
} else {
    console.error('Deployment did not succeed. See full response above.');
}

To write to this smart contract:
Javascript:
const url = 'https://rpc.stabilityprotocol.com/zkt/b0cvbslsk55l';
const data = {
  to: "0xC7Af080FD192db5961421cbd24C292bBb3622E34",
  abi: [
  "function createUser(string,uint256,bool)",
  "function getUser(uint256) view returns ((string,uint256,bool))",
  "function nextId() view returns (uint256)",
  "function updateUser(uint256,string,uint256,bool)",
  "function users(uint256) view returns (string,uint256,bool)"
],
  method: "createUser",
  arguments: ["placeholder", 0, true]
};

if (!data.to || data.to === 'YOUR_CONTRACT_ADDRESS') {
    console.error('Contract address is not set. Please deploy a contract first or enter an address.');
    return;
}
if (data.method === 'YOUR_WRITE_METHOD') {
    console.error('No write method found in the contract ABI.');
    return;
}

console.log('Sending write request to STABILITY API...');
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const result = await response.json();

if (!response.ok) {
  console.error('API Error:', result);
  throw new Error(JSON.stringify(result.error) || `Request failed with status ${response.status}`);
}

console.log('API Response received.');
console.log('Transaction Hash:', result.hash);
console.log(JSON.stringify(result, null, 2));

CURL command:
curl -X POST 'https://rpc.stabilityprotocol.com/zkt/b0cvbslsk55l' \
-H "Content-Type: application/json" \
-d '{
    "to": "0xC7Af080FD192db5961421cbd24C292bBb3622E34",
    "abi": [
  "function createUser(string,uint256,bool)",
  "function getUser(uint256) view returns ((string,uint256,bool))",
  "function nextId() view returns (uint256)",
  "function updateUser(uint256,string,uint256,bool)",
  "function users(uint256) view returns (string,uint256,bool)"
],
    "method": "createUser",
    "arguments": ["placeholder", 0, true]
}'

To read from this contract:
Javascript:
const url = 'https://rpc.stabilityprotocol.com/zkt/b0cvbslsk55l';
const data = {
  to: "0xC7Af080FD192db5961421cbd24C292bBb3622E34",
  abi: [
  "function createUser(string,uint256,bool)",
  "function getUser(uint256) view returns ((string,uint256,bool))",
  "function nextId() view returns (uint256)",
  "function updateUser(uint256,string,uint256,bool)",
  "function users(uint256) view returns (string,uint256,bool)"
],
  method: "nextId",
  arguments: []
};

if (!data.to || data.to === 'YOUR_CONTRACT_ADDRESS') {
    console.error('Contract address is not set. Please deploy a contract first or enter an address.');
    return;
}
if (data.method === 'YOUR_READ_METHOD') {
    console.error('No read method found in the contract ABI.');
    return;
}


console.log('Sending read request to STABILITY API...');
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const result = await response.json();

if (!response.ok) {
  console.error('API Error:', result);
  throw new Error(JSON.stringify(result.error) || `Request failed with status ${response.status}`);
}

console.log('API Response received.');
console.log('Result:', result.result);
console.log(JSON.stringify(result, null, 2));

Or CURL command:
curl -X POST 'https://rpc.stabilityprotocol.com/zkt/b0cvbslsk55l' \
-H "Content-Type: application/json" \
-d '{
    "to": "0xC7Af080FD192db5961421cbd24C292bBb3622E34",
    "abi": [
  "function createUser(string,uint256,bool)",
  "function getUser(uint256) view returns ((string,uint256,bool))",
  "function nextId() view returns (uint256)",
  "function updateUser(uint256,string,uint256,bool)",
  "function users(uint256) view returns (string,uint256,bool)"
],
    "method": "nextId",
    "arguments": []
}'