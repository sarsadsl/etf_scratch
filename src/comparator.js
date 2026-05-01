/**
 * 比對今日與前一日的持股狀態，計算差額
 * @param {Array} currentHoldings - 今日前十大持股明細
 * @param {Array} previousHoldings - 前一次執行記錄的持股明細
 * @returns {Array} 包含增減差異的持股陣列
 */
export function compareHoldings(currentHoldings, previousHoldings) {
  if (!currentHoldings) return [];
  if (!previousHoldings || previousHoldings.length === 0) {
    // 首次執行，全部視為新增
    return currentHoldings.map(item => ({
      ...item,
      diffShares: item.shares,
      diffWeight: item.weight,
      isNew: true
    }));
  }

  // 建立前一日的查詢字典，提升比對效率
  const prevMap = new Map();
  previousHoldings.forEach(item => {
    prevMap.set(item.stockCode, item);
  });

  const result = currentHoldings.map(current => {
    const prev = prevMap.get(current.stockCode);
    
    if (!prev) {
      // 這是新進榜前十大的持股
      return {
        ...current,
        diffShares: current.shares,
        diffWeight: current.weight,
        isNew: true
      };
    }

    // 計算差額 (保留到小數第二位)
    const diffShares = current.shares - prev.shares;
    const diffWeight = parseFloat((current.weight - prev.weight).toFixed(2));
    const diffSharesPercent = prev.shares > 0 ? parseFloat(((diffShares / prev.shares) * 100).toFixed(2)) : 0;

    return {
      ...current,
      diffShares,
      diffSharesPercent,
      diffWeight,
      isNew: false
    };
  });

  // 偵測被完全出清的持股：前一日存在但今日消失的標的
  const currentCodes = new Set(currentHoldings.map(h => h.stockCode));
  previousHoldings.forEach(prev => {
    if (!currentCodes.has(prev.stockCode)) {
      result.push({
        stockCode: prev.stockCode,
        stockName: prev.stockName,
        shares: 0,
        weight: 0,
        diffShares: -(prev.shares || 0),
        diffWeight: -(prev.weight || 0),
        diffSharesPercent: -100,
        isNew: false,
        isSoldOut: true,
      });
    }
  });

  return result;
}
