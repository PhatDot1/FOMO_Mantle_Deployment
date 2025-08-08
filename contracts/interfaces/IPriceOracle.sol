// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    function getPrice(string memory tokenSymbol) external view returns (uint256 price);
    function getPrices(string[] memory tokenSymbols) external view returns (uint256[] memory prices);
    function isHealthy() external view returns (bool healthy);
}
