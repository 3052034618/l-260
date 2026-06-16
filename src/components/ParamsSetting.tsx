import { useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { DEPRECIATION_METHODS, ASSET_CATEGORIES, DEPARTMENTS } from '../types'
import type { DepreciationMethod } from '../types'
import { saveParamsAsJson, loadParamsFromJson } from '../utils/export'

export default function ParamsSetting() {
  const { params, updateParams, assets, setAssets } = useApp()

  const handleSaveParams = useCallback(async () => {
    const success = await saveParamsAsJson({ params, assets }, '折旧参数配置.json')
    if (success) {
      alert('参数保存成功')
    }
  }, [params, assets])

  const handleLoadParams = useCallback(async () => {
    const data = await loadParamsFromJson()
    if (data) {
      if (data.params) updateParams(data.params)
      if (data.assets) setAssets(data.assets)
      alert('参数加载成功')
    }
  }, [updateParams, setAssets])

  const handleApplyToAll = () => {
    if (confirm('确定要将当前参数应用到所有资产吗？这将覆盖现有资产的折旧方式、残值率和使用年限。')) {
      setAssets(assets.map(asset => ({
        ...asset,
        method: params.method,
        salvageRate: params.defaultSalvageRate,
        usefulLife: params.defaultUsefulLife
      })))
      alert('已应用到所有资产')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">参数设置</h2>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={handleLoadParams}>
            加载参数
          </button>
          <button className="btn-primary" onClick={handleSaveParams}>
            保存常用参数
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-700 mb-4">折旧计算参数</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">默认折旧方式</label>
                <select
                  className="select-field"
                  value={params.method}
                  onChange={(e) => updateParams({ method: e.target.value as DepreciationMethod })}
                >
                  {DEPRECIATION_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {params.method === 'straight-line' && '按年限平均分配折旧额，适用于使用较均衡的资产'}
                  {params.method === 'double-declining' && '前期折旧多，后期折旧少，适用于技术更新快的资产'}
                  {params.method === 'sum-of-years' && '按年数总和计算折旧，前期折旧多，后期少'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  默认使用年限（年）
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={params.defaultUsefulLife}
                  onChange={(e) => updateParams({ defaultUsefulLife: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  参考：房屋20年、机器设备10年、运输工具4年、电子设备3年
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  默认残值率（%）
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={params.defaultSalvageRate * 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    updateParams({ defaultSalvageRate: val / 100 })
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  通常为原值的3%-5%，外资企业为10%
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button className="btn-secondary w-full" onClick={handleApplyToAll}>
                应用默认参数到所有资产
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-700 mb-4">预算范围设置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预算开始日期
                </label>
                <input
                  type="month"
                  className="input-field"
                  value={params.budgetStartDate}
                  onChange={(e) => updateParams({ budgetStartDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预算年度数
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="input-field"
                  value={params.budgetYears}
                  onChange={(e) => updateParams({ budgetYears: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  即将到期预警（月）
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="input-field"
                  value={params.nearEndMonths}
                  onChange={(e) => updateParams({ nearEndMonths: parseInt(e.target.value) || 6 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  当资产剩余折旧月份小于等于该值时，将被标记为"即将到期"
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-700 mb-4">折旧方式说明</h3>
            
            <div className="space-y-4 text-sm">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">直线法 (平均年限法)</h4>
                <p className="text-blue-700 mb-2">
                  年折旧额 = (原值 - 残值) / 使用年限
                </p>
                <p className="text-blue-600 text-xs">
                  特点：每年折旧额相等，计算简便。适用于使用情况比较均衡的固定资产。
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">双倍余额递减法</h4>
                <p className="text-green-700 mb-2">
                  年折旧率 = 2 / 使用年限 × 100%
                </p>
                <p className="text-green-700 mb-2">
                  年折旧额 = 期初账面净值 × 年折旧率
                </p>
                <p className="text-green-600 text-xs">
                  特点：前期折旧多，后期折旧少。最后两年改用直线法。适用于技术进步快、使用强度大的资产。
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">年数总和法</h4>
                <p className="text-purple-700 mb-2">
                  年折旧率 = 尚可使用年限 / 年数总和 × 100%
                </p>
                <p className="text-purple-700 mb-2">
                  年折旧额 = (原值 - 残值) × 年折旧率
                </p>
                <p className="text-purple-600 text-xs">
                  特点：前期折旧多，后期折旧少。适用于更新换代较快或受技术影响较大的资产。
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-700 mb-4">常用分类参考</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">资产类别</h4>
                <div className="space-y-1">
                  {ASSET_CATEGORIES.slice(0, 6).map(cat => (
                    <div key={cat} className="text-xs text-gray-600 flex justify-between py-1 border-b border-gray-50">
                      <span>{cat}</span>
                      <span className="text-gray-400">
                        {cat === '房屋及建筑物' && '20年'}
                        {cat === '机器设备' && '10年'}
                        {cat === '运输设备' && '4年'}
                        {cat === '电子设备' && '3年'}
                        {cat === '办公设备' && '5年'}
                        {cat === '家具器具' && '5年'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">部门列表</h4>
                <div className="space-y-1">
                  {DEPARTMENTS.slice(0, 6).map(dept => (
                    <div key={dept} className="text-xs text-gray-600 py-1 border-b border-gray-50">
                      {dept}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
