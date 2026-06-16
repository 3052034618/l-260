import type { Asset, DepreciationParams, Plan } from '../types'
import { generateId } from './depreciation'

const STORAGE_KEYS = {
  ASSETS: 'depreciation_assets',
  PARAMS: 'depreciation_params',
  PLANS: 'depreciation_plans',
  CURRENT_PLAN: 'depreciation_current_plan'
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  }
  return defaultValue
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error('删除数据失败:', e)
  }
}

export function saveAssets(assets: Asset[]): void {
  saveToStorage(STORAGE_KEYS.ASSETS, assets)
}

export function loadAssets(): Asset[] {
  return loadFromStorage<Asset[]>(STORAGE_KEYS.ASSETS, [])
}

export function saveParams(params: DepreciationParams): void {
  saveToStorage(STORAGE_KEYS.PARAMS, params)
}

export function loadParams(): DepreciationParams {
  return loadFromStorage<DepreciationParams>(STORAGE_KEYS.PARAMS, {
    method: 'straight-line',
    defaultUsefulLife: 5,
    defaultSalvageRate: 0.05,
    budgetStartDate: new Date().toISOString().slice(0, 7),
    budgetYears: 5,
    nearEndMonths: 6
  })
}

export function savePlans(plans: Plan[]): void {
  saveToStorage(STORAGE_KEYS.PLANS, plans)
}

export function loadPlans(): Plan[] {
  return loadFromStorage<Plan[]>(STORAGE_KEYS.PLANS, [])
}

export function saveCurrentPlanId(planId: string): void {
  saveToStorage(STORAGE_KEYS.CURRENT_PLAN, planId)
}

export function loadCurrentPlanId(): string | null {
  return loadFromStorage<string | null>(STORAGE_KEYS.CURRENT_PLAN, null)
}

export function createPlanFromAssets(
  name: string,
  description: string,
  assets: Asset[],
  params: DepreciationParams
): Plan {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    description,
    assets: JSON.parse(JSON.stringify(assets)),
    params: JSON.parse(JSON.stringify(params)),
    createdAt: now,
    updatedAt: now
  }
}

export function parsePasteData(text: string): Partial<Asset>[] {
  const lines = text.trim().split('\n')
  if (lines.length === 0) return []
  
  const result: Partial<Asset>[] = []
  const headers = lines[0].split(/[\t,，]/).map(h => h.trim())
  
  const headerMap: Record<string, string[]> = {
    assetCode: ['资产编码', '编码', 'code', 'assetCode', '编号'],
    assetName: ['资产名称', '名称', 'name', 'assetName'],
    category: ['资产类别', '类别', 'category', '类型'],
    department: ['使用部门', '部门', 'department', 'dept'],
    originalValue: ['原值', '原价', '金额', 'value', 'originalValue', '价格'],
    usefulLife: ['使用年限', '年限', 'usefulLife', 'life'],
    salvageRate: ['残值率', '残值', 'salvageRate', 'rate'],
    startDate: ['启用日期', '开始日期', '入账日期', 'startDate', 'date'],
    accumulatedDepreciation: ['累计折旧', '已提折旧', 'accumulatedDepreciation'],
    remark: ['备注', '说明', 'remark', 'note']
  }
  
  const getFieldIndex = (field: string): number => {
    const aliases = headerMap[field] || []
    for (const alias of aliases) {
      const idx = headers.findIndex(h => 
        h.toLowerCase() === alias.toLowerCase()
      )
      if (idx !== -1) return idx
    }
    return -1
  }
  
  const fieldIndices: Record<string, number> = {}
  for (const field of Object.keys(headerMap)) {
    fieldIndices[field] = getFieldIndex(field)
  }
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[\t,，]/).map(v => v.trim())
    if (values.every(v => v === '')) continue
    
    const asset: Partial<Asset> = {}
    
    for (const [field, idx] of Object.entries(fieldIndices)) {
      if (idx !== -1 && idx < values.length) {
        const value = values[idx]
        if (value === '') continue
        
        switch (field) {
          case 'originalValue':
          case 'accumulatedDepreciation':
            asset[field] = parseFloat(value.replace(/[,\s￥¥]/g, '')) || 0
            break
          case 'usefulLife':
            asset[field] = parseFloat(value) || 0
            break
          case 'salvageRate':
            const rate = parseFloat(value)
            asset[field] = rate > 1 ? rate / 100 : rate
            break
          default:
            asset[field as keyof Asset] = value as any
        }
      }
    }
    
    if (asset.assetCode || asset.assetName) {
      result.push(asset)
    }
  }
  
  return result
}

export function parseExcelData(data: any[][]): Partial<Asset>[] {
  if (data.length === 0) return []
  
  const result: Partial<Asset>[] = []
  const headers = data[0].map((h: any) => String(h || '').trim())
  
  const headerMap: Record<string, string[]> = {
    assetCode: ['资产编码', '编码', 'code', 'assetCode', '编号'],
    assetName: ['资产名称', '名称', 'name', 'assetName'],
    category: ['资产类别', '类别', 'category', '类型'],
    department: ['使用部门', '部门', 'department', 'dept'],
    originalValue: ['原值', '原价', '金额', 'value', 'originalValue', '价格'],
    usefulLife: ['使用年限', '年限', 'usefulLife', 'life'],
    salvageRate: ['残值率', '残值', 'salvageRate', 'rate'],
    startDate: ['启用日期', '开始日期', '入账日期', 'startDate', 'date'],
    accumulatedDepreciation: ['累计折旧', '已提折旧', 'accumulatedDepreciation'],
    remark: ['备注', '说明', 'remark', 'note']
  }
  
  const getFieldIndex = (field: string): number => {
    const aliases = headerMap[field] || []
    for (const alias of aliases) {
      const idx = headers.findIndex((h: string) => 
        h.toLowerCase() === alias.toLowerCase()
      )
      if (idx !== -1) return idx
    }
    return -1
  }
  
  const fieldIndices: Record<string, number> = {}
  for (const field of Object.keys(headerMap)) {
    fieldIndices[field] = getFieldIndex(field)
  }
  
  for (let i = 1; i < data.length; i++) {
    const values = data[i].map((v: any) => v != null ? String(v).trim() : '')
    if (values.every((v: string) => v === '')) continue
    
    const asset: Partial<Asset> = {}
    
    for (const [field, idx] of Object.entries(fieldIndices)) {
      if (idx !== -1 && idx < values.length) {
        const value = values[idx]
        if (value === '' || value === 'undefined' || value === 'null') continue
        
        switch (field) {
          case 'originalValue':
          case 'accumulatedDepreciation':
            asset[field] = parseFloat(value.replace(/[,\s￥¥]/g, '')) || 0
            break
          case 'usefulLife':
            asset[field] = parseFloat(value) || 0
            break
          case 'salvageRate':
            const rate = parseFloat(value)
            asset[field] = rate > 1 ? rate / 100 : rate
            break
          case 'startDate':
            if (typeof data[i][idx] === 'number') {
              const date = new Date(Math.round((data[i][idx] - 25569) * 86400 * 1000))
              asset[field] = date.toISOString().slice(0, 7)
            } else {
              const dateStr = value
              if (dateStr.includes('-') || dateStr.includes('/')) {
                const parts = dateStr.split(/[-/]/)
                if (parts.length >= 2) {
                  asset[field] = `${parts[0]}-${parts[1].padStart(2, '0')}`
                }
              }
            }
            break
          default:
            asset[field as keyof Asset] = value as any
        }
      }
    }
    
    if (asset.assetCode || asset.assetName) {
      result.push(asset)
    }
  }
  
  return result
}
