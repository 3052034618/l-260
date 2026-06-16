import { useState, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { comparePlans, generatePlanConclusion } from '../utils/depreciation'
import { formatNumber } from '../utils/depreciation'
import { exportPlanComparison, exportPlanConclusion } from '../utils/export'
import type { PlanComparison, PlanConclusion } from '../types'

export default function PlanComparisonView() {
  const { plans, saveCurrentAsPlan, deletePlan, loadPlan, assets, params } = useApp()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [comparisons, setComparisons] = useState<PlanComparison[]>([])
  const [conclusion, setConclusion] = useState<PlanConclusion | null>(null)

  const handleSavePlan = useCallback(() => {
    if (!planName.trim()) {
      alert('请输入方案名称')
      return
    }
    if (assets.length === 0) {
      alert('当前没有资产数据，无法保存方案')
      return
    }
    saveCurrentAsPlan(planName, planDescription)
    setPlanName('')
    setPlanDescription('')
    setShowSaveModal(false)
    alert('方案保存成功')
  }, [planName, planDescription, assets, saveCurrentAsPlan])

  const handleToggleSelect = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    )
  }

  const handleCompare = () => {
    if (selectedPlans.length < 2) {
      alert('请至少选择两个方案进行对比')
      return
    }
    const selectedPlanData = plans.filter(p => selectedPlans.includes(p.id))
    const result = comparePlans(selectedPlanData)
    const conclusionResult = generatePlanConclusion(selectedPlanData, 0)
    setComparisons(result)
    setConclusion(conclusionResult)
  }

  const handleLoadPlan = (planId: string) => {
    if (confirm('加载方案将覆盖当前资产和参数设置，确定继续？')) {
      loadPlan(planId)
      alert('方案加载成功')
    }
  }

  const handleDeletePlan = (planId: string) => {
    if (confirm('确定删除该方案？')) {
      deletePlan(planId)
      setSelectedPlans(prev => prev.filter(id => id !== planId))
      setComparisons(prev => prev.filter(c => c.planId !== planId))
      setConclusion(null)
    }
  }

  const handleExportComparison = async () => {
    if (comparisons.length === 0) {
      alert('请先进行方案对比')
      return
    }
    const success = await exportPlanComparison(comparisons)
    if (success) {
      alert('导出成功')
    }
  }

  const handleExportConclusion = async () => {
    if (!conclusion) {
      alert('请先进行方案对比')
      return
    }
    const success = await exportPlanConclusion(conclusion)
    if (success) {
      alert('方案结论摘要导出成功')
    }
  }

  const maxFirstYear = comparisons.length > 0
    ? Math.max(...comparisons.map(c => c.firstYearDepreciation))
    : 100

  const maxTotal = comparisons.length > 0
    ? Math.max(...comparisons.map(c => c.totalDepreciation))
    : 100

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">方案对比</h2>
        <div className="flex gap-3">
          {comparisons.length > 0 && (
            <>
              <button className="btn-secondary" onClick={handleExportConclusion}>
                导出方案结论摘要
              </button>
              <button className="btn-secondary" onClick={handleExportComparison}>
                导出详细对比表
              </button>
            </>
          )}
          <button className="btn-primary" onClick={() => setShowSaveModal(true)}>
            保存当前方案
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">已保存方案</h3>
              {selectedPlans.length > 0 && (
                <button 
                  className="btn-primary text-sm py-1 px-3"
                  onClick={handleCompare}
                >
                  对比选中 ({selectedPlans.length})
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {plans.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>暂无保存的方案</p>
                  <p className="text-sm mt-2">
                    请先在"资产导入"中添加资产，然后保存为方案
                  </p>
                </div>
              ) : (
                plans.map(plan => (
                  <div 
                    key={plan.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      selectedPlans.includes(plan.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPlans.includes(plan.id)}
                        onChange={() => handleToggleSelect(plan.id)}
                        className="mt-1 w-4 h-4 text-primary-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-800 truncate">{plan.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{plan.description || '无描述'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>资产: {plan.assets.length}项</span>
                          <span>原值: {formatNumber(plan.assets.reduce((s, a) => s + a.originalValue, 0))}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            className="text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => handleLoadPlan(plan.id)}
                          >
                            加载
                          </button>
                          <button
                            className="text-xs text-red-600 hover:text-red-800"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-4 mt-4">
            <h3 className="font-semibold text-gray-700 mb-3">采购方案分析建议</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">●</span>
                <p><strong>首年成本</strong>：关注第一年折旧对利润的影响，选择前期折旧较少的方案可提高首年利润</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">●</span>
                <p><strong>现金流</strong>：加速折旧法可提前抵扣税款，改善前期现金流</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">●</span>
                <p><strong>更新换代</strong>：技术更新快的资产建议使用加速折旧法</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">●</span>
                <p><strong>均衡性</strong>：直线法折旧均衡，便于成本预测和预算编制</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {comparisons.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">选择方案进行对比</h3>
              <p className="text-gray-500 mb-6">
                从左侧列表中选择至少两个方案，点击"对比选中"按钮查看详细对比
              </p>
              <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 text-left">
                <h4 className="font-medium text-gray-700 mb-3">对比内容包括：</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 资产数量和原值总额对比</li>
                  <li>• 各年度折旧额对比</li>
                  <li>• 折旧总额和年均折旧对比</li>
                  <li>• 单月最大/最小折旧对比</li>
                  <li>• 可视化柱状图对比</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-700">对比结果汇总</h3>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>方案名称</th>
                        <th className="text-right">资产数量</th>
                        <th className="text-right">原值总额</th>
                        <th className="text-right">第1年折旧</th>
                        <th className="text-right">第2年折旧</th>
                        <th className="text-right">第3年折旧</th>
                        <th className="text-right">折旧总额</th>
                        <th className="text-right">年均折旧</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((c, idx) => (
                        <tr key={c.planId} className={idx === 0 ? 'bg-green-50' : ''}>
                          <td className="font-medium">
                            {c.planName}
                            {idx === 0 && <span className="ml-2 badge badge-success">最优</span>}
                          </td>
                          <td className="text-right">{c.assetCount}</td>
                          <td className="text-right">{formatNumber(c.totalOriginalValue)}</td>
                          <td className="text-right">{formatNumber(c.firstYearDepreciation)}</td>
                          <td className="text-right">{formatNumber(c.secondYearDepreciation)}</td>
                          <td className="text-right">{formatNumber(c.thirdYearDepreciation)}</td>
                          <td className="text-right font-medium text-blue-600">{formatNumber(c.totalDepreciation)}</td>
                          <td className="text-right">{formatNumber(c.averageYearDepreciation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-700 mb-4">首年折旧对比</h3>
                <div className="space-y-4">
                  {comparisons.map((c) => {
                    const width = maxFirstYear > 0 ? (c.firstYearDepreciation / maxFirstYear) * 100 : 0
                    return (
                      <div key={c.planId}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{c.planName}</span>
                          <span className="text-sm text-gray-500">{formatNumber(c.firstYearDepreciation)}</span>
                        </div>
                        <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-700 mb-4">折旧总额对比</h3>
                <div className="space-y-4">
                  {comparisons.map((c) => {
                    const width = maxTotal > 0 ? (c.totalDepreciation / maxTotal) * 100 : 0
                    return (
                      <div key={c.planId}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{c.planName}</span>
                          <span className="text-sm text-gray-500">{formatNumber(c.totalDepreciation)}</span>
                        </div>
                        <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">单月最大折旧</h3>
                  <div className="space-y-3">
                    {comparisons.map((c) => (
                      <div key={c.planId} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{c.planName}</span>
                        <span className="font-semibold text-red-600">{formatNumber(c.maxMonthDepreciation)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">单月最小折旧</h3>
                  <div className="space-y-3">
                    {comparisons.map((c) => (
                      <div key={c.planId} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{c.planName}</span>
                        <span className="font-semibold text-green-600">{formatNumber(c.minMonthDepreciation)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-700 mb-4">年度折旧趋势对比</h3>
                <div className="h-64 flex items-end justify-around gap-4">
                  {comparisons.map((c, planIdx) => (
                    <div key={c.planId} className="flex-1 flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-2 text-center">{c.planName}</p>
                      <div className="flex items-end gap-1 h-48">
                        <div 
                          className="w-8 bg-blue-400 rounded-t relative group"
                          style={{ height: `${maxFirstYear > 0 ? (c.firstYearDepreciation / maxFirstYear) * 100 : 0}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            第1年: {formatNumber(c.firstYearDepreciation)}
                          </div>
                        </div>
                        <div 
                          className="w-8 bg-green-400 rounded-t relative group"
                          style={{ height: `${maxFirstYear > 0 ? (c.secondYearDepreciation / maxFirstYear) * 100 : 0}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            第2年: {formatNumber(c.secondYearDepreciation)}
                          </div>
                        </div>
                        <div 
                          className="w-8 bg-purple-400 rounded-t relative group"
                          style={{ height: `${maxFirstYear > 0 ? (c.thirdYearDepreciation / maxFirstYear) * 100 : 0}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            第3年: {formatNumber(c.thirdYearDepreciation)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-blue-400 rounded"></span>第1年
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-green-400 rounded"></span>第2年
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-purple-400 rounded"></span>第3年
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {conclusion && (
                <>
                  <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">💡</div>
                      <div>
                        <h3 className="font-bold text-gray-800 mb-2">方案建议</h3>
                        <p className="text-gray-700 leading-relaxed">{conclusion.recommendation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="font-semibold text-gray-700 mb-4">关键要点</h3>
                    <ul className="space-y-2">
                      {conclusion.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {conclusion.maxPressureDepartments && Object.keys(conclusion.maxPressureDepartments).length > 0 && (
                    <div className="card p-6">
                      <h3 className="font-semibold text-gray-700 mb-4">
                        🚨 首年预算压力最大部门
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(conclusion.maxPressureDepartments).map(([planName, data]) => (
                            <div key={planName} className={`p-4 rounded-lg border-2 ${
                              data.percentageOfTotal >= 40 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                            }`}>
                              <p className="text-xs text-gray-500 mb-1">{planName}</p>
                              <p className="text-lg font-bold text-gray-800">
                                {data.department || '无数据'}
                              </p>
                              {data.department && (
                                <p className="text-sm mt-1">
                                  <span className="font-medium">{formatNumber(data.firstYearDepreciation)} 元</span>
                                  <span className="text-gray-500">，占首年总额 {data.percentageOfTotal}%</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                    </div>
                  )}

                  {conclusion.departmentYearDiffs && conclusion.departmentYearDiffs.length > 0 && (
                    <div className="card">
                      <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-700">
                          📊 部门年度费用差异分析
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            （与基准方案对比）
                          </span>
                        </h3>
                      </div>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>部门</th>
                              <th className="text-right">第一年差异</th>
                              <th className="text-right">第二年差异</th>
                              <th className="text-right">第三年差异</th>
                              <th className="text-right">三年合计</th>
                            </tr>
                          </thead>
                          <tbody>
                            {conclusion.departmentYearDiffs.map((d, idx) => (
                              <tr key={d.department}>
                                <td className="font-medium">{d.department}</td>
                                <td className={`text-right ${d.year1Diff > 0 ? 'text-red-600' : d.year1Diff < 0 ? 'text-green-600' : ''}`}>
                                  {d.year1Diff > 0 ? '+' : ''}{formatNumber(d.year1Diff)}
                                </td>
                                <td className={`text-right ${d.year2Diff > 0 ? 'text-red-600' : d.year2Diff < 0 ? 'text-green-600' : ''}`}>
                                  {d.year2Diff > 0 ? '+' : ''}{formatNumber(d.year2Diff)}
                                </td>
                                <td className={`text-right ${d.year3Diff > 0 ? 'text-red-600' : d.year3Diff < 0 ? 'text-green-600' : ''}`}>
                                  {d.year3Diff > 0 ? '+' : ''}{formatNumber(d.year3Diff)}
                                </td>
                                <td className={`text-right font-medium ${d.totalDiff > 0 ? 'text-red-600' : d.totalDiff < 0 ? 'text-green-600' : ''}`}>
                                  {d.totalDiff > 0 ? '+' : ''}{formatNumber(d.totalDiff)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">保存方案</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方案名称 *</label>
                <input
                  className="input-field"
                  placeholder="如：2024年设备采购方案A"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方案描述</label>
                <textarea
                  className="input-field h-24 resize-none"
                  placeholder="简要描述该方案的特点..."
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p>将保存当前 {assets.length} 项资产及参数设置</p>
                <p className="text-xs text-blue-600 mt-1">原值总额：{formatNumber(assets.reduce((s, a) => s + a.originalValue, 0))}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowSaveModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSavePlan}>保存方案</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
