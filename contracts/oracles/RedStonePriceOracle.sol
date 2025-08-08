// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PrimaryProdDataServiceConsumerBase} from "@redstone-finance/evm-connector/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";

contract RedStonePriceOracle is IPriceOracle, PrimaryProdDataServiceConsumerBase, Ownable {
    mapping(string => bool) public supportedSymbols;

    event SymbolSupportUpdated(string symbol, bool supported);
    error UnsupportedSymbol(string symbol);

    constructor() {
        _transferOwnership(msg.sender);
        supportedSymbols["ETH"] = true;
        supportedSymbols["BTC"] = true;
        supportedSymbols["USDC"] = true;
        supportedSymbols["USDT"] = true;
        supportedSymbols["WETH"] = true;
    }

    function getPrice(string memory tokenSymbol) external view override returns (uint256) {
        if (!supportedSymbols[tokenSymbol]) revert UnsupportedSymbol(tokenSymbol);
        return getOracleNumericValueFromTxMsg(bytes32(bytes(tokenSymbol)));
    }

    function getPrices(string[] memory tokenSymbols) external view override returns (uint256[] memory prices) {
        prices = new uint256[](tokenSymbols.length);
        for (uint256 i = 0; i < tokenSymbols.length; i++) {
            if (!supportedSymbols[tokenSymbols[i]]) revert UnsupportedSymbol(tokenSymbols[i]);
            prices[i] = getOracleNumericValueFromTxMsg(bytes32(bytes(tokenSymbols[i])));
        }
    }

    function isHealthy() external view override returns (bool) {
        try this.getPrice("ETH") returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }

    function addSupportedSymbol(string memory symbol) external onlyOwner {
        supportedSymbols[symbol] = true;
        emit SymbolSupportUpdated(symbol, true);
    }

    function removeSupportedSymbol(string memory symbol) external onlyOwner {
        supportedSymbols[symbol] = false;
        emit SymbolSupportUpdated(symbol, false);
    }
}
