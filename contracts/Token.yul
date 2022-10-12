object "Token" {
    code {
        // Store the creator in slot zero.
        sstore(0, caller())

        // Deploy the contract
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            // Protection against sending Ether
            require(iszero(callvalue()))

            // Dispatcher
            switch selector()           
            case 0x00fdd58e /* "balanceOf(address,uint256)" */ {
                returnUint(balanceOfToken(decodeAsAddress(0), decodeAsUint(1)))
            }
            case 0xa22cb465 /* "setApprovalForAll(address,bool)" */ {
                setApprovalForAll(decodeAsUint(0), decodeAsUint(1))
                returnTrue()
            }
            case 0xe985e9c5 /* "isApprovedForAll(address,address)" */ {
                returnUint(isApprovedForAll(decodeAsAddress(0), decodeAsAddress(1)))
            }
            case 0x731133e9 /* "mint(address,uint256,uint256,bytes)" */ {
                mintToken(decodeAsAddress(0), decodeAsUint(1), decodeAsUint(2))
                returnTrue()
            }
            case 0xf242432a /* "safeTransferFrom(address,address,uint256,uint256,bytes)" */ {
                executeTransferToken(decodeAsAddress(0), decodeAsAddress(1), decodeAsUint(2), decodeAsUint(3))
                returnTrue()
            }
            case 0x4e1273f4 /* "balanceOfBatch(address[],uint256[])" */ {
                let size1 := getCalldataArraySize(0)
                let size2 := getCalldataArraySize(1)
                if eq(eq(size1, size2),0) { revert(0, 0) }
                mstore(0, 0x20)
                mstore(0x20, size1)
                for {let i:= 0 } lt(i,size1) {i := add(i, 1)}
                {
                    let addr := getCalldataArrayElement(0, i)
                    let tokenid := getCalldataArrayElement(1, i)
                    let res := balanceOfToken(addr, tokenid)
                    mstore(add(0x40, mul(i, 0x20)), res)
                }
                mstore(0, 0x20)
                mstore(0x20, size1)
                return (0, add(0x40, mul(size1, 0x20)))
            }
            case 0x2eb2c2d6 /* "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)" */ {
                //TODO: parsing calldata arrays and returning arrays
                let from := decodeAsAddress(0)
                let to := decodeAsAddress(1)
                revertIfZeroAddress(from)
                revertIfZeroAddress(to)
                let size1 := getCalldataArraySize(2)
                let size2 := getCalldataArraySize(3)
                if eq(eq(size1, size2),0) { revert(0, 0) }
                for {let i:= 0 } lt(i,size1) {i := add(i, 1)}
                {
                    let tokenid := getCalldataArrayElement(2, i)
                    let amount := getCalldataArrayElement(3, i)
                    executeTransferToken(from, to, tokenid, amount)
                }
                returnTrue()
            }
            case 0x6f24d3dd /* "getArrayElement(uint256[],uint256)" */ {
                returnUint(processArray(decodeAsAddress(0), decodeAsUint(1)))
            }
            case 0xd504ea1d /* "getArray()" */ {
                returnUintArray()
            }
            default {
                revert(0, 0)
            }
            function returnUintArray() {
                mstore(0, 0x20)
                mstore(0x20, 2)

                mstore(0x40, 1)
                mstore(0x60, 2)
                return(0, 0x80)
            }
            function getCalldataArraySize(calldataSlotNum) -> elem {
                let sign := 4
                let array_ptr := calldataload(add(sign, mul(calldataSlotNum, 0x20)))
                let array_size_pos := add(array_ptr, sign)
                let array_size := calldataload(array_size_pos)
                elem := array_size
            }
            function getCalldataArrayElement(calldataSlotNum, index) -> elem {
                index := add(index, 1)
                let sign := 4
                let array_ptr := calldataload(add(sign, mul(calldataSlotNum, 0x20)))
                let array_size_pos := add(array_ptr, sign)
                elem := calldataload(add(array_size_pos, mul(index, 0x20)))
            }
            function processArray(arr, index) -> elem {
                index := add(index, 1)
                let sign := 4
                let array_ptr := calldataload(sign)
                let array_size_pos := add(array_ptr, sign)
                let array_size := calldataload(array_size_pos)
                elem := calldataload(add(array_size_pos, mul(index, 0x20)))
            }

            function mintToken(account, id, amount) {
                //require(calledByOwner())
                addToBalanceToken(account, id, amount)
                emitTransfer(caller(), 0, account, id, amount)
            }
            function executeTransferToken(from, to, id, amount) {
                revertIfZeroAddress(to)
                deductFromBalanceToken(from, id, amount)
                addToBalanceToken(to, id, amount)
                emitTransfer(caller(), from, to, id, amount)                
            }
            

            /* ---------- calldata decoding functions ----------- */
            function selector() -> s {
                s := div(calldataload(0), 0x100000000000000000000000000000000000000000000000000000000)
            }

            function decodeAsAddress(offset) -> v {
                v := decodeAsUint(offset)
                if iszero(iszero(and(v, not(0xffffffffffffffffffffffffffffffffffffffff)))) {
                    revert(0, 0)
                }
            }
            function decodeAsUint(offset) -> v {
                let pos := add(4, mul(offset, 0x20))
                if lt(calldatasize(), add(pos, 0x20)) {
                    revert(0, 0)
                }
                v := calldataload(pos)
            }
            /* ---------- calldata encoding functions ---------- */
            function returnUint(v) {
                mstore(0, v)
                return(0, 0x20)
            }
            function returnTrue() {
                returnUint(1)
            }

            /* -------- events ---------- */
            function emitTransfer(operator, from, to, id, value) {
                let signatureHash := 0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62
                emitEvent(signatureHash, operator, from, to, id, value)
            }
            function ApprovalForAll(account, operator, approved) {
                let signatureHash := 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31
                emitEventApproval(signatureHash, account, operator, approved)
            }
            function URI(value, id) {
                let signatureHash := 0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b
                //TODO: Implement URI functionality
            }	
	        function TransferBatch(operator, from, to, ids, values) {
                let signatureHash := 0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb
                //TODO: Implement emission of arrays
            }
            function emitEventApproval(signatureHash, indexed1, indexed2, nonIndexed1) {
                mstore(0, nonIndexed1)
                log3(0, 0x20, signatureHash, indexed1, indexed2)
            }
            function emitEvent(signatureHash, indexed1, indexed2, indexed3, nonIndexed1, nonIndexed2) {
                mstore(0, nonIndexed1)
                mstore(0x20, nonIndexed2)
                log4(0, 0x20, signatureHash, indexed1, indexed2, indexed3)
            }

            /* -------- storage layout ---------- */
            function ownerPos() -> p { p := 0 }
            function totalSupplyPos() -> p { p := 1 }
            function accountToStorageOffset(account) -> offset {
                offset := add(0x1000, account)
            }
            function balancesStorageOffset(account, tokenid) -> offset {
                offset := add(accountToStorageOffset(account), 0)
                mstore(0, offset)
                mstore(0x20, tokenid)
                offset := keccak256(0, 0x40)
            }
            function operatorApprovalsStorageOffset(account, operator) -> offset {
                offset := add(accountToStorageOffset(account), 1)
                mstore(0, offset)
                mstore(0x20, operator)
                offset := keccak256(0, 0x40)
            }

            /* -------- storage access ---------- */
            function owner() -> o {
                o := sload(ownerPos())
            }
            function setApprovalForAll(operator, approved) {
                if eq(caller(), operator) { revert(0, 0) }
                sstore(operatorApprovalsStorageOffset(caller(), operator), approved)
                ApprovalForAll(caller(), operator, approved)
            }

            function isApprovedForAll(account, operator) -> approved {
                approved := sload(operatorApprovalsStorageOffset(account, operator))
            }

            function balanceOfToken(account, tokenid) -> bal {
                revertIfZeroAddress(account)
                bal := sload(balancesStorageOffset(account, tokenid))
            }
            function addToBalanceToken(account, tokenid, amount) {
                let offset := balancesStorageOffset(account, tokenid)
                sstore(offset, safeAdd(sload(offset), amount))
            }
            function deductFromBalanceToken(account, tokenid, amount) {
                let offset := balancesStorageOffset(account, tokenid)
                let bal := sload(offset)
                require(lte(amount, bal))
                sstore(offset, sub(bal, amount))
            }

            /* ---------- utility functions ---------- */
            function lte(a, b) -> r {
                r := iszero(gt(a, b))
            }
            function gte(a, b) -> r {
                r := iszero(lt(a, b))
            }
            function safeAdd(a, b) -> r {
                r := add(a, b)
                if or(lt(r, a), lt(r, b)) { revert(0, 0) }
            }
            function calledByOwner() -> cbo {
                cbo := eq(owner(), caller())
            }
            function revertIfZeroAddress(addr) {
                require(addr)
            }
            function require(condition) {
                if iszero(condition) { revert(0, 0) }
            }
        }
    }
}