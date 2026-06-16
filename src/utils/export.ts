import * as XLSX from 'xlsx'
import type { AssetDepreciationResult, BudgetSummary, PlanComparison } from '../types'
import { formatCurrency, formatNumber } from './depreciation'

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null }

export async function exportToExcel(
  results: AssetDepreciationResult[],
  filename: string = '折旧测算明细.xlsx'
): Promise<boolean> {
  const wb = XLSX.utils.book_new()
  
  const assetData = results.map(r => ({
    '资产编码': r.assetCode,
    '资产名称': r.assetName,
    '资产类别': r.category,
    '使用部门': r.department,
    '资产原值': r.originalValue,
    '使用年限': r.usefulLife,
    '残值率': `${formatNumber(r.salvageRate * 100, 2)}%`,
    '残值': r.salvageValue,
    '启用日期': r.startDate,
    '折旧方式': r.methodName,
    '预计折旧总额': r.totalDepreciation,
    '首年折旧': r.firstYearDepreciation,
    '末年折旧': r.lastYearDepreciation,
    '剩余月份': r.remainingMonths,
    '折旧结束日期': r.endDate,
    '是否即将到期': r.isNearEnd ? '是' : '否'
  }))
  
  const ws1 = XLSX.utils.json_to_sheet(assetData)
  XLSX.utils.book_append_sheet(wb, ws1, '资产清单')
  
  const monthData: any[] = []
  for (const r of results) {
    for (const m of r.monthDepreciations) {
      monthData.push({
        '资产编码': r.assetCode,
        '资产名称': r.assetName,
        '使用部门': r.department,
        '年度': m.year,
        '月份': m.month,
        '月度折旧': m.depreciation,
        '累计折旧': m.accumulatedDepreciation,
        '账面净值': m.netValue
      })
    }
  }
  
  const ws2 = XLSX.utils.json_to_sheet(monthData)
  XLSX.utils.book_append_sheet(wb, ws2, '月度明细')
  
  if (ipcRenderer) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const buffer = Buffer.from(wbout)
    
    const result = await ipcRenderer.invoke('save-file', {
      content: buffer,
      filename,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })
    
    return result.success
  } else {
    XLSX.writeFile(wb, filename)
    return true
  }
}

export async function exportBudgetSummary(
  summary: BudgetSummary,
  filename: string = '预算摘要.xlsx'
): Promise<boolean> {
  const wb = XLSX.utils.book_new()
  
  const overviewData = [
    { '项目': '资产总数', '数值': summary.totalAssets },
    { '项目': '资产原值总额', '数值': summary.totalOriginalValue },
    { '项目': '残值总额', '数值': summary.totalSalvageValue },
    { '项目': '折旧总额', '数值': summary.totalDepreciation },
    { '项目': '即将到期资产数', '数值': summary.nearEndAssets },
    { '项目': '预算开始日期', '数值': summary.params.budgetStartDate },
    { '项目': '预算年度', '数值': `${summary.params.budgetYears}年` },
    { '项目': '默认折旧方式', '数值': summary.params.method === 'straight-line' ? '直线法' : 
             summary.params.method === 'double-declining' ? '双倍余额递减法' : '年数总和法' },
    { '项目': '默认残值率', '数值': `${formatNumber(summary.params.defaultSalvageRate * 100, 2)}%` }
  ]
  
  const ws1 = XLSX.utils.json_to_sheet(overviewData)
  XLSX.utils.book_append_sheet(wb, ws1, '预算概览')
  
  const yearData = summary.yearSummaries.map(y => ({
    '年度': y.year,
    '年度折旧': y.depreciation,
    '累计折旧': y.accumulatedDepreciation
  }))
  
  const ws2 = XLSX.utils.json_to_sheet(yearData)
  XLSX.utils.book_append_sheet(wb, ws2, '年度汇总')
  
  const deptData = summary.departmentSummaries.map(d => ({
    '部门': d.department,
    '资产数量': d.assetCount,
    '原值总额': d.totalOriginalValue,
    '年度折旧': d.yearDepreciation,
    '月度平均折旧': d.monthDepreciation,
    '累计折旧': d.accumulatedDepreciation,
    '账面净值': d.netValue
  }))
  
  const ws3 = XLSX.utils.json_to_sheet(deptData)
  XLSX.utils.book_append_sheet(wb, ws3, '部门汇总')
  
  const catData = summary.categorySummaries.map(c => ({
    '资产类别': c.category,
    '资产数量': c.assetCount,
    '原值总额': c.totalOriginalValue,
    '年度折旧': c.yearDepreciation,
    '月度平均折旧': c.monthDepreciation
  }))
  
  const ws4 = XLSX.utils.json_to_sheet(catData)
  XLSX.utils.book_append_sheet(wb, ws4, '类别汇总')
  
  if (ipcRenderer) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const buffer = Buffer.from(wbout)
    
    const result = await ipcRenderer.invoke('save-file', {
      content: buffer,
      filename,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })
    
    return result.success
  } else {
    XLSX.writeFile(wb, filename)
    return true
  }
}

export async function exportPlanComparison(
  comparisons: PlanComparison[],
  filename: string = '方案对比.xlsx'
): Promise<boolean> {
  const wb = XLSX.utils.book_new()
  
  const data = comparisons.map(c => ({
    '方案名称': c.planName,
    '资产数量': c.assetCount,
    '原值总额': c.totalOriginalValue,
    '第一年折旧': c.firstYearDepreciation,
    '第二年折旧': c.secondYearDepreciation,
    '第三年折旧': c.thirdYearDepreciation,
    '折旧总额': c.totalDepreciation,
    '年均折旧': c.averageYearDepreciation,
    '单月最大折旧': c.maxMonthDepreciation,
    '单月最小折旧': c.minMonthDepreciation
  }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '方案对比')
  
  if (ipcRenderer) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const buffer = Buffer.from(wbout)
    
    const result = await ipcRenderer.invoke('save-file', {
      content: buffer,
      filename,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })
    
    return result.success
  } else {
    XLSX.writeFile(wb, filename)
    return true
  }
}

export async function saveParamsAsJson(data: any, filename: string = '折旧参数.json'): Promise<boolean> {
  if (ipcRenderer) {
    const result = await ipcRenderer.invoke('save-json', { data, filename })
    return result.success
  } else {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return true
  }
}

export async function loadParamsFromJson(): Promise<any | null> {
  if (ipcRenderer) {
    const result = await ipcRenderer.invoke('load-json')
    return result.success ? result.data : null
  } else {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e: any) => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            try {
              const data = JSON.parse(ev.target?.result as string)
              resolve(data)
            } catch {
              resolve(null)
            }
          }
          reader.readAsText(file)
        } else {
          resolve(null)
        }
      }
      input.click()
    })
  }
}

export function generateDepreciationChartData(results: AssetDepreciationResult[], budgetStartDate: string, budgetYears: number) {
  const startYear = parseInt(budgetStartDate.split('-')[0])
  const monthLabels: string[] = []
  const depreciationData: number[] = []
  const accumulatedData: number[] = []
  
  const monthMap = new Map<string, { depreciation: number; accumulated: number }>()
  
  for (let y = 0; y < budgetYears; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = `${startYear + y}-${String(m).padStart(2, '0')}`
      monthMap.set(key, { depreciation: 0, accumulated: 0 })
    }
  }
  
  for (const result of results) {
    for (const md of result.monthDepreciations) {
      const key = `${md.year}-${String(md.month).padStart(2, '0')}`
      if (monthMap.has(key)) {
        const data = monthMap.get(key)!
        data.depreciation += md.depreciation
        data.accumulated = Math.max(data.accumulated, md.accumulatedDepreciation)
      }
    }
  }
  
  for (const [key, data] of Array.from(monthMap.entries()).sort()) {
    monthLabels.push(key)
    depreciationData.push(Math.round(data.depreciation * 100) / 100)
    accumulatedData.push(Math.round(data.accumulated * 100) / 100)
  }
  
  return { monthLabels, depreciationData, accumulatedData }
}
