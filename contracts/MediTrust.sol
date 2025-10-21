// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MediTrust {
    struct Record {
        address patient;
        string cid;
        string description;
        uint256 timestamp;
    }

    Record[] public records;
    mapping(address => Record[]) private patientRecords;

    event RecordStored(address indexed patient, string cid, string description, uint256 timestamp);

    function storeRecord(address _patient, string memory _cid, string memory _desc) public {
        Record memory newRecord = Record(_patient, _cid, _desc, block.timestamp);
        patientRecords[_patient].push(newRecord);
        records.push(newRecord);
        emit RecordStored(_patient, _cid, _desc, block.timestamp);
    }

    function getRecords(address _patient) public view returns (Record[] memory) {
        return patientRecords[_patient];
    }
}
