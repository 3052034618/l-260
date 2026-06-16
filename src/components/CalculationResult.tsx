import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency, formatNumber } from '../utils/depreciation'
import { exportToExcel, exportBudgetSummary, generateDepreciationChartData } from '../utils/export'
import type { AssetDepreciationResult } from '../types'

export default function CalculationResult() {
  const { results, budgetSummary, calculateResults, assets, params } = useApp()
  const [selectedAsset, setSelectedAsset] = useState<AssetDepreciationResult | null>(null)
  const [viewMode, setViewMode] = useState<'assets' | 'department' | 'category' | 'chart'>('assets')
  const [filterNearEnd, setFilterNearEnd] = useState(false)

  useEffect(() => {
    if (assets.length > 0) {
      calculateResults()
    }
  }, [assets, calculateResults])

  const handleExportDetails = useCallback(async () => {
    if (results.length === 0) {
      alert('暂无测算数据')
      return
    }
    const success = await exportToExcel(results)
    if (success) {
      alert('导出成功')
    }
  }, [results])

  const handleExportSummary = useCallback(async () => {
    if (!budgetSummary) {
      alert('暂无预算摘要数据')
      return
    }
    const success = await exportBudgetSummary(budgetSummary)
    if (success) {
      alert('导出成功')
    }
  }, [budgetSummary])

  const filteredResults = filterNearEnd ? results.filter(r => r.isNearEnd) : results

  const chartData = results.length > 0 && params
    ? generateDepreciationChartData(results, params.budgetStartDate, params.budgetYears)
    : null

  const maxDepreciation = chartData?.depreciationData.length
    ? Math.max(...chartData.depreciationData) * 1.1
    : 100

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">测算结果</h2>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={calculateResults}>
            重新测算
          </button>
          <button className="btn-secondary" onClick={handleExportSummary}>
            导出预算摘要
          </button>
          <button className="btn-primary" onClick={handleExportDetails}>
            导出测算明细
          </button>
        </div>
      </div>

      {budgetSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">资产总数</p>
            <p className="text-2xl font-bold text-gray-800">{budgetSummary.totalAssets}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">原值总额</p>
            <p className="text-lg font-bold text-gray-800">
              {formatCurrency(budgetSummary.totalOriginalValue)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">折旧总额</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(budgetSummary.totalDepreciation)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">残值总额</p>
            <p className="text-lg font-bold text-gray-800">
              {formatCurrency(budgetSummary.totalSalvageValue)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">即将到期</p>
            <p className="text-2xl font-bold text-orange-500">
              {budgetSummary.nearEndAssets}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">首年折旧</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(budgetSummary.yearSummaries[0]?.depreciation || 0)}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          className={`tab-btn ${viewMode === 'assets' ? 'active' : ''}`}
          onClick={() => setViewMode('assets')}
        >
          资产明细
        </button>
        <button
          className={`tab-btn ${viewMode === 'department' ? 'active' : ''}`}
          onClick={() => setViewMode('department')}
        >
          部门汇总
        </button>
        <button
          className={`tab-btn ${viewMode === 'category' ? 'active' : ''}`}
          onClick={() => setViewMode('category')}
        >
          类别汇总
        </button>
        <button
          className={`tab-btn ${viewMode === 'chart' ? 'active' : ''}`}
          onClick={() => setViewMode('chart')}
        >
          趋势图表
        </button>
      </div>

      {viewMode === 'assets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterNearEnd}
                onChange={(e) => setFilterNearEnd(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-600">只显示即将到期资产</span>
            </label>
            <span className="text-sm text-gray-500">共 {filteredResults.length} 条记录</span>
          </div>

          <div className="card">
            <div className="table-container max-h-[500px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th>状态</th>
                    <th>资产编码</th>
                    <th>资产名称</th>
                    <th>部门</th>
                    <th className="text-right">原值</th>
                    <th>折旧方式</th>
                    <th>启用日期</th>
                    <th>结束日期</th>
                    <th>剩余月份</th>
                    <th className="text-right">首年折旧</th>
                    <th className="text-right">总折旧</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-gray-500">
                        {results.length === 0 ? '暂无测算数据，请先导入资产' : '没有符合条件的记录'}
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.assetId}>
                        <td>
                          {r.isNearEnd ? (
                            <span className="badge badge-warning">即将到期</span>
                          ) : r.remainingMonths === 0 ? (
                            <span className="badge badge-danger">已到期</span>
                          ) : (
                            <span className="badge badge-success">正常</span>
                          )}
                        </td>
                        <td>{r.assetCode || '-'}</td>
                        <td className="font-medium">{r.assetName}</td>
                        <td>{r.department}</td>
                        <td className="text-right">{formatNumber(r.originalValue)}</td>
                        <td>{r.methodName}</td>
                        <td>{r.startDate}</td>
                        <td>{r.endDate}</td>
                        <td className={r.remainingMonths <= 6 ? 'text-orange-600 font-medium' : ''}>
                          {r.remainingMonths}个月
                        </td>
                        <td className="text-right">{formatNumber(r.firstYearDepreciation)}</td>
                        <td className="text-right">{formatNumber(r.totalDepreciation)}</td>
                        <td>
                          <button
                            className="text-primary-600 hover:text-primary-800 text-sm"
                            onClick={() => setSelectedAsset(r)}
                          >
                            查看明细
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'department' && budgetSummary && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>部门</th>
                  <th className="text-right">资产数量</th>
                  <th className="text-right">原值总额</th>
                  <th className="text-right">年度折旧</th>
                  <th className="text-right">月度平均折旧</th>
                  <th className="text-right">累计折旧</th>
                  <th className="text-right">账面净值</th>
                </tr>
              </thead>
              <tbody>
                {budgetSummary.departmentSummaries.map((d, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{d.department}</td>
                    <td className="text-right">{d.assetCount}</td>
                    <td className="text-right">{formatNumber(d.totalOriginalValue)}</td>
                    <td className="text-right text-blue-600 font-medium">{formatNumber(d.yearDepreciation)}</td>
                    <td className="text-right">{formatNumber(d.monthDepreciation)}</td>
                    <td className="text-right">{formatNumber(d.accumulatedDepreciation)}</td>
                    <td className="text-right">{formatNumber(d.netValue)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td>合计</td>
                  <td className="text-right">
                    {budgetSummary.departmentSummaries.reduce((s, d) => s + d.assetCount, 0)}
                  </td>
                  <td className="text-right">
                    {formatNumber(budgetSummary.departmentSummaries.reduce((s, d) => s + d.totalOriginalValue, 0))}
                  </td>
                  <td className="text-right text-blue-600">
                    {formatNumber(budgetSummary.departmentSummaries.reduce((s, d) => s + d.yearDepreciation, 0))}
                  </td>
                  <td className="text-right">
                    {formatNumber(budgetSummary.departmentSummaries.reduce((s, d) => s + d.monthDepreciation, 0))}
                  </td>
                  <td className="text-right">
                    {formatNumber(budgetSummary.departmentSummaries.reduce((s, d) => s + d.accumulatedDepreciation, 0))}
                  </td>
                  <td className="text-right">
                    {formatNumber(budgetSummary.departmentSummaries.reduce((s, d) => s + d.netValue, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'category' && budgetSummary && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>资产类别</th>
                  <th className="text-right">资产数量</th>
                  <th className="text-right">原值总额</th>
                  <th className="text-right">年度折旧</th>
                  <th className="text-right">月度平均折旧</th>
                </tr>
              </thead>
              <tbody>
                {budgetSummary.categorySummaries.map((c, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{c.category}</td>
                    <td className="text-right">{c.assetCount}</td>
                    <td className="text-right">{formatNumber(c.totalOriginalValue)}</td>
                    <td className="text-right text-blue-600 font-medium">{formatNumber(c.yearDepreciation)}</td>
                    <td className="text-right">{formatNumber(c.monthDepreciation)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td>合计</td>
                  <td className="text-right">
                    {budgetSummary.categorySummaries.reduce((s, c) => s + c.assetCount, 0)}
                  </td>
                  <td className="text-right">
                    {formatNumber(budgetSummary.categorySummaries.reduce((s, c) => s + c.totalOriginalValue, 0))}
                  </td>
                  <td className="text-right text-blue-600">
                    {formatNumber(budgetSummary.categorySummaries.reduce((s, c) => s + c.yearDepreciation, 0))}
                  </td>
                  <td className="text-right">
                    {formatNumber(budgetSummary.categorySummaries.reduce((s, c) => s + c.monthDepreciation, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'chart' && chartData && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-700 mb-4">月度折旧趋势</h3>
          <div className="h-80 flex items-end gap-1">
            {chartData.monthLabels.map((label, idx) => {
              const height = maxDepreciation > 0 
                ? (chartData.depreciationData[idx] / maxDepreciation) * 100 
                : 0
              return (
                <div key={label} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all group relative"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  >
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {label}: {formatNumber(chartData.depreciationData[idx])}
                    </div>
                  </div>
                  {idx % 6 === 0 && (
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {label}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {budgetSummary?.yearSummaries.map((y, idx) => (
              <div key={y.year} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">{y.year}年折旧</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(y.depreciation)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {selectedAsset.assetName} - 折旧明细
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => setSelectedAsset(null)}
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">资产编码</p>
                <p className="font-medium">{selectedAsset.assetCode || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">资产原值</p>
                <p className="font-medium">{formatCurrency(selectedAsset.originalValue)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">残值</p>
                <p className="font-medium">{formatCurrency(selectedAsset.salvageValue)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">使用年限</p>
                <p className="font-medium">{selectedAsset.usefulLife}年</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">折旧方式</p>
                <p className="font-medium">{selectedAsset.methodName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">折旧总额</p>
                <p className="font-medium">{formatCurrency(selectedAsset.totalDepreciation)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="table text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th>年度</th>
                    <th>月份</th>
                    <th className="text-right">月度折旧</th>
                    <th className="text-right">累计折旧</th>
                    <th className="text-right">账面净值</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAsset.monthDepreciations.map((m, idx) => (
                    <tr key={idx} className={m.month === 1 ? 'bg-blue-50' : ''}>
                      <td className={m.month === 1 ? 'font-semibold' : ''}>{m.year}</td>
                      <td>{m.month}月</td>
                      <td className="text-right">{formatNumber(m.depreciation)}</td>
                      <td className="text-right">{formatNumber(m.accumulatedDepreciation)}</td>
                      <td className="text-right">{formatNumber(m.netValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
