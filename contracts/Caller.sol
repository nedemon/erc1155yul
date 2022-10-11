// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface MyIERC20 {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
	function mint(address to, uint256 id, uint256 amount, bytes memory data) external;
	function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external; 

	function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
	function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;

    function getArrayElement(uint256[] calldata array, uint256 index) external view returns(uint256);
    function getArray() external view returns(uint256[] memory);
}

contract Caller1 {
    MyIERC20 public target;

    constructor(MyIERC20 _target) {
        target = _target;
    }

    function callBalanceOf(address arg) external view returns(uint256) {
        return target.balanceOf(arg);
    }

    function callTotalSupply() external view returns(uint256) {
        return target.totalSupply();
    }

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return target.balanceOf(account, id);
    }
    function setApprovalForAll(address operator, bool approved) external {
        return target.setApprovalForAll(operator, approved);
    }
    function isApprovedForAll(address account, address operator) external view returns (bool){
        return target.isApprovedForAll(account, operator);
    }
	function mint(address to, uint256 id, uint256 amount, bytes memory data) external {
        return target.mint(to, id, amount, data);
    }
	function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external {
        return target.safeTransferFrom(from, to, id, amount, data);
    }
    ///////////////////////// batch operations
	function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory) {
        return target.balanceOfBatch(accounts, ids);
    }
	function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external {
        return target.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
    function getArrayElement(uint256[] calldata array, uint256 index) external view returns(uint256) {
        return target.getArrayElement(array, index);
    }
    function getArray() external view returns(uint256[] memory) {
        return target.getArray();
    }

    function getSelector(string memory selector) external pure returns(bytes4) {
        return bytes4(keccak256(abi.encodePacked(selector)));
    }

    function getEventSelector(string memory selector) external pure returns(bytes32) {
        return keccak256(abi.encodePacked(selector));
    }
}