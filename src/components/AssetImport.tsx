import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useApp } from '../contexts/AppContext'
import { parsePasteData, parseExcelData } from '../utils/storage'
import { generateId } from '../utils/depreciation'
import { ASSET_CATEGORIES, DEPARTMENTS, DEPRECIATION_METHODS } from '../types'
import type { Asset, DepreciationMethod } from '../types'

export default function AssetImport() {
  const { assets, addAsset, updateAsset, deleteAsset, batchUpdateAssets, clearAssets, setAssets, params } = useApp()
  const [pasteText, setPasteText] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [batchField, setBatchField] = useState<keyof Asset | ''>('')
  const [batchValue, setBatchValue] = useState('')
  const [searchText, setSearchText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    assetCode: '',
    assetName: '',
    category: '电子设备',
    department: '其他',
    originalValue: 0,
    usefulLife: params.defaultUsefulLife,
    salvageRate: params.defaultSalvageRate,
    startDate: params.budgetStartDate,
    method: params.method,
    accumulatedDepreciation: 0,
    remark: ''
  })

  const handlePaste = useCallback(() => {
    const parsed = parsePasteData(pasteText)
    if (parsed.length === 0) {
      alert('未解析到有效数据，请检查粘贴格式')
      return
    }
    
    const newAssets: Asset[] = parsed.map(p => ({
      id: generateId(),
      assetCode: p.assetCode || '',
      assetName: p.assetName || '',
      category: p.category || '电子设备',
      department: p.department || '其他',
      originalValue: p.originalValue || 0,
      usefulLife: p.usefulLife || params.defaultUsefulLife,
      salvageRate: p.salvageRate ?? params.defaultSalvageRate,
      startDate: p.startDate || params.budgetStartDate,
      method: p.method || params.method,
      accumulatedDepreciation: p.accumulatedDepreciation || 0,
      netValue: (p.originalValue || 0) - (p.accumulatedDepreciation || 0),
      remark: p.remark || ''
    }))
    
    setAssets([...assets, ...newAssets])
    setPasteText('')
    alert(`成功导入 ${newAssets.length} 条资产`)
  }, [pasteText, assets, setAssets, params])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      const parsed = parseExcelData(jsonData as any[][])
      if (parsed.length === 0) {
        alert('未解析到有效数据，请检查Excel格式')
        return
      }
      
      const newAssets: Asset[] = parsed.map(p => ({
        id: generateId(),
        assetCode: p.assetCode || '',
        assetName: p.assetName || '',
        category: p.category || '电子设备',
        department: p.department || '其他',
        originalValue: p.originalValue || 0,
        usefulLife: p.usefulLife || params.defaultUsefulLife,
        salvageRate: p.salvageRate ?? params.defaultSalvageRate,
        startDate: p.startDate || params.budgetStartDate,
        method: p.method || params.method,
        accumulatedDepreciation: p.accumulatedDepreciation || 0,
        netValue: (p.originalValue || 0) - (p.accumulatedDepreciation || 0),
        remark: p.remark || ''
      }))
      
      setAssets([...assets, ...newAssets])
      alert(`成功导入 ${newAssets.length} 条资产`)
    }
    reader.readAsArrayBuffer(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [assets, setAssets, params])

  const handleAddAsset = useCallback(() => {
    if (newAsset.assetName?.trim() === '' && newAsset.assetCode?.trim() === '') {
      alert('请填写资产编码或名称')
      return
    }
    addAsset(newAsset)
    setNewAsset({
      assetCode: '',
      assetName: '',
      category: '电子设备',
      department: '其他',
      originalValue: 0,
      usefulLife: params.defaultUsefulLife,
      salvageRate: params.defaultSalvageRate,
      startDate: params.budgetStartDate,
      method: params.method,
      accumulatedDepreciation: 0,
      remark: ''
    })
    setShowAddModal(false)
  }, [newAsset, addAsset, params])

  const handleEditAsset = useCallback(() => {
    if (!editingAsset || !editingAsset.id) return
    updateAsset(editingAsset.id, editingAsset)
    setEditingAsset(null)
  }, [editingAsset, updateAsset])

  const handleBatchUpdate = useCallback(() => {
    if (!batchField) {
      alert('请选择要批量修改的字段')
      return
    }
    
    let value: any = batchValue
    if (batchField === 'originalValue' || batchField === 'usefulLife' || batchField === 'accumulatedDepreciation') {
      value = parseFloat(batchValue) || 0
    } else if (batchField === 'salvageRate') {
      const num = parseFloat(batchValue)
      value = num > 1 ? num / 100 : num
    }
    
    batchUpdateAssets({ [batchField]: value })
    setBatchField('')
    setBatchValue('')
    alert('批量更新完成')
  }, [batchField, batchValue, batchUpdateAssets])

  const handleDownloadTemplate = () => {
    const template = [
      ['资产编码', '资产名称', '资产类别', '使用部门', '原值', '使用年限', '残值率', '启用日期', '累计折旧', '备注']
    ]
    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    XLSX.writeFile(wb, '资产导入模板.xlsx')
  }

  const filteredAssets = assets.filter(a => 
    a.assetCode.toLowerCase().includes(searchText.toLowerCase()) ||
    a.assetName.toLowerCase().includes(searchText.toLowerCase()) ||
    a.department.includes(searchText)
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">资产导入</h2>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={handleDownloadTemplate}>
            下载模板
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            导入Excel
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            新增资产
          </button>
          <button className="btn-danger" onClick={() => {
            if (confirm('确定要清空所有资产吗？')) clearAssets()
          }}>
            清空
          </button>
        </div>
      </div>

      <input 
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-700 mb-3">粘贴导入</h3>
            <p className="text-sm text-gray-500 mb-3">
              支持从Excel或其他表格软件中复制数据粘贴到此处（支持Tab或逗号分隔）
            </p>
            <textarea
              className="input-field h-40 resize-none"
              placeholder="资产编码	资产名称	资产类别	使用部门	原值	使用年限..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex justify-end mt-3">
              <button className="btn-primary" onClick={handlePaste}>
                解析并导入
              </button>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-gray-700 mb-3">批量调整</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select
                className="select-field"
                value={batchField}
                onChange={(e) => setBatchField(e.target.value as keyof Asset | '')}
              >
                <option value="">选择字段</option>
                <option value="category">资产类别</option>
                <option value="department">使用部门</option>
                <option value="usefulLife">使用年限</option>
                <option value="salvageRate">残值率</option>
                <option value="method">折旧方式</option>
              </select>
              <input
                className="input-field"
                placeholder="新值"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
              />
            </div>
            {batchField === 'category' && (
              <select
                className="select-field mb-3"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
              >
                <option value="">选择类别</option>
                {ASSET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            {batchField === 'department' && (
              <select
                className="select-field mb-3"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
              >
                <option value="">选择部门</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}
            {batchField === 'method' && (
              <select
                className="select-field mb-3"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
              >
                <option value="">选择方式</option>
                {DEPRECIATION_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}
            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleBatchUpdate} disabled={!batchField}>
                批量更新
              </button>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-gray-700 mb-3">统计信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">资产总数</span>
                <span className="font-medium">{assets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">原值总额</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('zh-CN').format(
                    assets.reduce((sum, a) => sum + a.originalValue, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">累计折旧</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('zh-CN').format(
                    assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">账面净值</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('zh-CN').format(
                    assets.reduce((sum, a) => sum + a.netValue, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <input
                className="input-field max-w-sm"
                placeholder="搜索资产编码、名称或部门"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="table-container max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th>资产编码</th>
                    <th>资产名称</th>
                    <th>类别</th>
                    <th>部门</th>
                    <th className="text-right">原值</th>
                    <th>年限</th>
                    <th>残值率</th>
                    <th>启用日期</th>
                    <th>折旧方式</th>
                    <th className="text-right">累计折旧</th>
                    <th className="text-right">净值</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-gray-500">
                        暂无资产数据，请导入或添加资产
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td>{asset.assetCode || '-'}</td>
                        <td className="font-medium">{asset.assetName}</td>
                        <td>{asset.category}</td>
                        <td>{asset.department}</td>
                        <td className="text-right">{new Intl.NumberFormat('zh-CN').format(asset.originalValue)}</td>
                        <td>{asset.usefulLife}年</td>
                        <td>{(asset.salvageRate * 100).toFixed(2)}%</td>
                        <td>{asset.startDate}</td>
                        <td>{DEPRECIATION_METHODS.find(m => m.value === asset.method)?.label}</td>
                        <td className="text-right">{new Intl.NumberFormat('zh-CN').format(asset.accumulatedDepreciation)}</td>
                        <td className="text-right">{new Intl.NumberFormat('zh-CN').format(asset.netValue)}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="text-primary-600 hover:text-primary-800"
                              onClick={() => setEditingAsset(asset)}
                            >
                              编辑
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => {
                                if (confirm('确定删除该资产？')) deleteAsset(asset.id)
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">新增资产</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产编码</label>
                <input
                  className="input-field"
                  value={newAsset.assetCode}
                  onChange={(e) => setNewAsset({ ...newAsset, assetCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产名称 *</label>
                <input
                  className="input-field"
                  value={newAsset.assetName}
                  onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产类别</label>
                <select
                  className="select-field"
                  value={newAsset.category}
                  onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                >
                  {ASSET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用部门</label>
                <select
                  className="select-field"
                  value={newAsset.department}
                  onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">原值</label>
                <input
                  type="number"
                  className="input-field"
                  value={newAsset.originalValue}
                  onChange={(e) => setNewAsset({ ...newAsset, originalValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用年限（年）</label>
                <input
                  type="number"
                  className="input-field"
                  value={newAsset.usefulLife}
                  onChange={(e) => setNewAsset({ ...newAsset, usefulLife: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">残值率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={(newAsset.salvageRate ?? 0) * 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setNewAsset({ ...newAsset, salvageRate: val / 100 })
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">启用日期</label>
                <input
                  type="month"
                  className="input-field"
                  value={newAsset.startDate}
                  onChange={(e) => setNewAsset({ ...newAsset, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">折旧方式</label>
                <select
                  className="select-field"
                  value={newAsset.method}
                  onChange={(e) => setNewAsset({ ...newAsset, method: e.target.value as DepreciationMethod })}
                >
                  {DEPRECIATION_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">累计折旧</label>
                <input
                  type="number"
                  className="input-field"
                  value={newAsset.accumulatedDepreciation}
                  onChange={(e) => setNewAsset({ ...newAsset, accumulatedDepreciation: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  className="input-field"
                  value={newAsset.remark}
                  onChange={(e) => setNewAsset({ ...newAsset, remark: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleAddAsset}>确定添加</button>
            </div>
          </div>
        </div>
      )}

      {editingAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">编辑资产</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产编码</label>
                <input
                  className="input-field"
                  value={editingAsset.assetCode}
                  onChange={(e) => setEditingAsset({ ...editingAsset, assetCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产名称</label>
                <input
                  className="input-field"
                  value={editingAsset.assetName}
                  onChange={(e) => setEditingAsset({ ...editingAsset, assetName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产类别</label>
                <select
                  className="select-field"
                  value={editingAsset.category}
                  onChange={(e) => setEditingAsset({ ...editingAsset, category: e.target.value })}
                >
                  {ASSET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用部门</label>
                <select
                  className="select-field"
                  value={editingAsset.department}
                  onChange={(e) => setEditingAsset({ ...editingAsset, department: e.target.value })}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">原值</label>
                <input
                  type="number"
                  className="input-field"
                  value={editingAsset.originalValue}
                  onChange={(e) => setEditingAsset({ ...editingAsset, originalValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用年限（年）</label>
                <input
                  type="number"
                  className="input-field"
                  value={editingAsset.usefulLife}
                  onChange={(e) => setEditingAsset({ ...editingAsset, usefulLife: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">残值率 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={(editingAsset.salvageRate ?? 0) * 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setEditingAsset({ ...editingAsset, salvageRate: val / 100 })
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">启用日期</label>
                <input
                  type="month"
                  className="input-field"
                  value={editingAsset.startDate}
                  onChange={(e) => setEditingAsset({ ...editingAsset, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">折旧方式</label>
                <select
                  className="select-field"
                  value={editingAsset.method}
                  onChange={(e) => setEditingAsset({ ...editingAsset, method: e.target.value as DepreciationMethod })}
                >
                  {DEPRECIATION_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">累计折旧</label>
                <input
                  type="number"
                  className="input-field"
                  value={editingAsset.accumulatedDepreciation}
                  onChange={(e) => setEditingAsset({ ...editingAsset, accumulatedDepreciation: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  className="input-field"
                  value={editingAsset.remark}
                  onChange={(e) => setEditingAsset({ ...editingAsset, remark: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setEditingAsset(null)}>取消</button>
              <button className="btn-primary" onClick={handleEditAsset}>保存修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
