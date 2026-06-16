import type {
  Asset,
  MonthDepreciation,
  AssetDepreciationResult,
  DepartmentSummary,
  CategorySummary,
  YearSummary,
  BudgetSummary,
  Plan,
  PlanComparison,
  DepreciationMethod
} from '../types'
import { DEPRECIATION_METHODS } from '../types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function parseDate(dateStr: string): Date {
  const [year, month] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

export function getMethodName(method: DepreciationMethod): string {
  return DEPRECIATION_METHODS.find(m => m.value === method)?.label || method
}

export function calculateStraightLine(
  originalValue: number,
  salvageValue: number,
  usefulLifeMonths: number,
  startDate: Date,
  accumulatedDepreciation: number = 0
): MonthDepreciation[] {
  const monthlyDepreciation = (originalValue - salvageValue) / usefulLifeMonths
  const result: MonthDepreciation[] = []
  
  let currentNetValue = originalValue - accumulatedDepreciation
  let currentAccumulated = accumulatedDepreciation
  
  for (let i = 0; i < usefulLifeMonths; i++) {
    const currentDate = addMonths(startDate, i)
    const depreciation = i === usefulLifeMonths - 1 
      ? currentNetValue - salvageValue 
      : monthlyDepreciation
    
    currentAccumulated += depreciation
    currentNetValue -= depreciation
    
    result.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      depreciation: Math.round(depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(currentAccumulated * 100) / 100,
      netValue: Math.round(currentNetValue * 100) / 100
    })
  }
  
  return result
}

export function calculateDoubleDeclining(
  originalValue: number,
  salvageValue: number,
  usefulLifeMonths: number,
  startDate: Date,
  accumulatedDepreciation: number = 0
): MonthDepreciation[] {
  const result: MonthDepreciation[] = []
  const straightLineRate = 1 / (usefulLifeMonths / 12)
  const doubleRate = straightLineRate * 2
  const monthlyRate = doubleRate / 12
  
  let currentNetValue = originalValue - accumulatedDepreciation
  let currentAccumulated = accumulatedDepreciation
  let switchToStraightLine = false
  
  for (let i = 0; i < usefulLifeMonths; i++) {
    const currentDate = addMonths(startDate, i)
    const remainingMonths = usefulLifeMonths - i
    let depreciation: number
    
    if (!switchToStraightLine) {
      const doubleDecliningDep = currentNetValue * monthlyRate
      const straightLineDep = (currentNetValue - salvageValue) / remainingMonths
      
      if (doubleDecliningDep < straightLineDep || remainingMonths <= 24) {
        switchToStraightLine = true
        depreciation = (currentNetValue - salvageValue) / remainingMonths
      } else {
        depreciation = doubleDecliningDep
      }
    } else {
      depreciation = (currentNetValue - salvageValue) / remainingMonths
    }
    
    if (i === usefulLifeMonths - 1) {
      depreciation = currentNetValue - salvageValue
    }
    
    currentAccumulated += depreciation
    currentNetValue -= depreciation
    
    result.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      depreciation: Math.round(depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(currentAccumulated * 100) / 100,
      netValue: Math.round(currentNetValue * 100) / 100
    })
  }
  
  return result
}

export function calculateSumOfYears(
  originalValue: number,
  salvageValue: number,
  usefulLifeMonths: number,
  startDate: Date,
  accumulatedDepreciation: number = 0
): MonthDepreciation[] {
  const result: MonthDepreciation[] = []
  const usefulYears = usefulLifeMonths / 12
  const sumOfYears = (usefulYears * (usefulYears + 1)) / 2
  const depreciableBase = originalValue - salvageValue
  
  let currentAccumulated = accumulatedDepreciation
  let currentNetValue = originalValue - accumulatedDepreciation
  
  for (let i = 0; i < usefulLifeMonths; i++) {
    const currentDate = addMonths(startDate, i)
    const currentYear = Math.floor(i / 12)
    const remainingYears = usefulYears - currentYear
    const yearlyRate = remainingYears / sumOfYears
    const yearlyDepreciation = depreciableBase * yearlyRate
    const monthlyDepreciation = yearlyDepreciation / 12
    
    let depreciation = monthlyDepreciation
    
    if (i === usefulLifeMonths - 1) {
      depreciation = currentNetValue - salvageValue
    }
    
    currentAccumulated += depreciation
    currentNetValue -= depreciation
    
    result.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      depreciation: Math.round(depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(currentAccumulated * 100) / 100,
      netValue: Math.round(currentNetValue * 100) / 100
    })
  }
  
  return result
}

export function calculateAssetDepreciation(
  asset: Asset,
  nearEndMonths: number = 6
): AssetDepreciationResult {
  const startDate = parseDate(asset.startDate)
  const usefulLifeMonths = asset.usefulLife * 12
  const salvageValue = asset.originalValue * asset.salvageRate
  const endDate = addMonths(startDate, usefulLifeMonths)
  
  let monthDepreciations: MonthDepreciation[]
  
  switch (asset.method) {
    case 'double-declining':
      monthDepreciations = calculateDoubleDeclining(
        asset.originalValue,
        salvageValue,
        usefulLifeMonths,
        startDate,
        asset.accumulatedDepreciation
      )
      break
    case 'sum-of-years':
      monthDepreciations = calculateSumOfYears(
        asset.originalValue,
        salvageValue,
        usefulLifeMonths,
        startDate,
        asset.accumulatedDepreciation
      )
      break
    case 'straight-line':
    default:
      monthDepreciations = calculateStraightLine(
        asset.originalValue,
        salvageValue,
        usefulLifeMonths,
        startDate,
        asset.accumulatedDepreciation
      )
  }
  
  const totalDepreciation = monthDepreciations.reduce((sum, m) => sum + m.depreciation, 0)
  
  const startYear = startDate.getFullYear()
  const firstYearDepreciation = monthDepreciations
    .filter(m => m.year === startYear)
    .reduce((sum, m) => sum + m.depreciation, 0)
  
  const endYear = endDate.getFullYear()
  const lastYearDepreciation = monthDepreciations
    .filter(m => m.year === endYear)
    .reduce((sum, m) => sum + m.depreciation, 0)
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), 1)
  const remainingMonths = Math.max(0, monthsBetween(today, endDate))
  const isNearEnd = remainingMonths > 0 && remainingMonths <= nearEndMonths
  
  return {
    assetId: asset.id,
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    category: asset.category,
    department: asset.department,
    originalValue: asset.originalValue,
    usefulLife: asset.usefulLife,
    salvageRate: asset.salvageRate,
    salvageValue,
    startDate: asset.startDate,
    method: asset.method,
    methodName: getMethodName(asset.method),
    monthDepreciations,
    totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    firstYearDepreciation: Math.round(firstYearDepreciation * 100) / 100,
    lastYearDepreciation: Math.round(lastYearDepreciation * 100) / 100,
    isNearEnd,
    remainingMonths,
    endDate: formatDate(endDate)
  }
}

export function calculateAllAssetsDepreciation(
  assets: Asset[],
  nearEndMonths: number = 6
): AssetDepreciationResult[] {
  return assets.map(asset => calculateAssetDepreciation(asset, nearEndMonths))
}

export function calculateDepartmentSummaries(
  results: AssetDepreciationResult[],
  budgetStartDate: string,
  budgetYears: number
): DepartmentSummary[] {
  const budgetStart = parseDate(budgetStartDate)
  const budgetEnd = addMonths(budgetStart, budgetYears * 12)
  
  const departmentMap = new Map<string, {
    assetCount: number
    totalOriginalValue: number
    yearDepreciation: number
    monthDepreciation: number
    accumulatedDepreciation: number
    netValue: number
  }>()
  
  for (const result of results) {
    const relevantDepreciations = result.monthDepreciations.filter(m => {
      const date = new Date(m.year, m.month - 1, 1)
      return date >= budgetStart && date < budgetEnd
    })
    
    const yearDepreciation = relevantDepreciations.reduce((sum, m) => sum + m.depreciation, 0)
    const monthDepreciation = relevantDepreciations.length > 0
      ? yearDepreciation / relevantDepreciations.length
      : 0
    
    const latest = result.monthDepreciations[result.monthDepreciations.length - 1]
    
    if (!departmentMap.has(result.department)) {
      departmentMap.set(result.department, {
        assetCount: 0,
        totalOriginalValue: 0,
        yearDepreciation: 0,
        monthDepreciation: 0,
        accumulatedDepreciation: 0,
        netValue: 0
      })
    }
    
    const dept = departmentMap.get(result.department)!
    dept.assetCount += 1
    dept.totalOriginalValue += result.originalValue
    dept.yearDepreciation += yearDepreciation
    dept.monthDepreciation += monthDepreciation
    dept.accumulatedDepreciation += result.monthDepreciations[0]?.accumulatedDepreciation || 0
    dept.netValue += latest?.netValue || 0
  }
  
  return Array.from(departmentMap.entries()).map(([department, data]) => ({
    department,
    ...data,
    yearDepreciation: Math.round(data.yearDepreciation * 100) / 100,
    monthDepreciation: Math.round(data.monthDepreciation * 100) / 100,
    totalOriginalValue: Math.round(data.totalOriginalValue * 100) / 100,
    accumulatedDepreciation: Math.round(data.accumulatedDepreciation * 100) / 100,
    netValue: Math.round(data.netValue * 100) / 100
  }))
}

export function calculateCategorySummaries(
  results: AssetDepreciationResult[],
  budgetStartDate: string,
  budgetYears: number
): CategorySummary[] {
  const budgetStart = parseDate(budgetStartDate)
  const budgetEnd = addMonths(budgetStart, budgetYears * 12)
  
  const categoryMap = new Map<string, {
    assetCount: number
    totalOriginalValue: number
    yearDepreciation: number
    monthDepreciation: number
  }>()
  
  for (const result of results) {
    const relevantDepreciations = result.monthDepreciations.filter(m => {
      const date = new Date(m.year, m.month - 1, 1)
      return date >= budgetStart && date < budgetEnd
    })
    
    const yearDepreciation = relevantDepreciations.reduce((sum, m) => sum + m.depreciation, 0)
    const monthDepreciation = relevantDepreciations.length > 0
      ? yearDepreciation / relevantDepreciations.length
      : 0
    
    if (!categoryMap.has(result.category)) {
      categoryMap.set(result.category, {
        assetCount: 0,
        totalOriginalValue: 0,
        yearDepreciation: 0,
        monthDepreciation: 0
      })
    }
    
    const cat = categoryMap.get(result.category)!
    cat.assetCount += 1
    cat.totalOriginalValue += result.originalValue
    cat.yearDepreciation += yearDepreciation
    cat.monthDepreciation += monthDepreciation
  }
  
  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
    yearDepreciation: Math.round(data.yearDepreciation * 100) / 100,
    monthDepreciation: Math.round(data.monthDepreciation * 100) / 100,
    totalOriginalValue: Math.round(data.totalOriginalValue * 100) / 100
  }))
}

export function calculateYearSummaries(
  results: AssetDepreciationResult[],
  budgetStartDate: string,
  budgetYears: number
): YearSummary[] {
  const budgetStart = parseDate(budgetStartDate)
  const startYear = budgetStart.getFullYear()
  
  const yearMap = new Map<number, {
    depreciation: number
    accumulatedDepreciation: number
  }>()
  
  for (let y = 0; y < budgetYears; y++) {
    yearMap.set(startYear + y, { depreciation: 0, accumulatedDepreciation: 0 })
  }
  
  for (const result of results) {
    for (const m of result.monthDepreciations) {
      if (yearMap.has(m.year)) {
        const yearData = yearMap.get(m.year)!
        yearData.depreciation += m.depreciation
        yearData.accumulatedDepreciation = Math.max(yearData.accumulatedDepreciation, m.accumulatedDepreciation)
      }
    }
  }
  
  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, data]) => ({
      year,
      depreciation: Math.round(data.depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(data.accumulatedDepreciation * 100) / 100
    }))
}

export function calculateBudgetSummary(
  results: AssetDepreciationResult[],
  params: {
    budgetStartDate: string
    budgetYears: number
    nearEndMonths: number
  }
): BudgetSummary {
  const totalAssets = results.length
  const totalOriginalValue = results.reduce((sum, r) => sum + r.originalValue, 0)
  const totalSalvageValue = results.reduce((sum, r) => sum + r.salvageValue, 0)
  const totalDepreciation = results.reduce((sum, r) => sum + r.totalDepreciation, 0)
  const nearEndAssets = results.filter(r => r.isNearEnd).length
  
  const yearSummaries = calculateYearSummaries(results, params.budgetStartDate, params.budgetYears)
  const departmentSummaries = calculateDepartmentSummaries(results, params.budgetStartDate, params.budgetYears)
  const categorySummaries = calculateCategorySummaries(results, params.budgetStartDate, params.budgetYears)
  
  return {
    totalAssets,
    totalOriginalValue: Math.round(totalOriginalValue * 100) / 100,
    totalSalvageValue: Math.round(totalSalvageValue * 100) / 100,
    totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    yearSummaries,
    departmentSummaries,
    categorySummaries,
    nearEndAssets,
    params: {
      method: 'straight-line',
      defaultUsefulLife: 5,
      defaultSalvageRate: 0.05,
      ...params
    }
  }
}

export function calculatePlanComparison(plan: Plan): PlanComparison {
  const results = calculateAllAssetsDepreciation(plan.assets, plan.params.nearEndMonths)
  
  const yearSummaries = calculateYearSummaries(results, plan.params.budgetStartDate, plan.params.budgetYears)
  
  const firstYear = yearSummaries[0]?.depreciation || 0
  const secondYear = yearSummaries[1]?.depreciation || 0
  const thirdYear = yearSummaries[2]?.depreciation || 0
  
  const allMonthDepreciations = results.flatMap(r => r.monthDepreciations.map(m => m.depreciation))
  const maxMonthDepreciation = allMonthDepreciations.length > 0 ? Math.max(...allMonthDepreciations) : 0
  const minMonthDepreciation = allMonthDepreciations.length > 0 ? Math.min(...allMonthDepreciations) : 0
  
  const totalOriginalValue = results.reduce((sum, r) => sum + r.originalValue, 0)
  const totalDepreciation = results.reduce((sum, r) => sum + r.totalDepreciation, 0)
  const averageYearDepreciation = plan.params.budgetYears > 0
    ? totalDepreciation / plan.params.budgetYears
    : 0
  
  return {
    planId: plan.id,
    planName: plan.name,
    totalOriginalValue: Math.round(totalOriginalValue * 100) / 100,
    assetCount: plan.assets.length,
    firstYearDepreciation: Math.round(firstYear * 100) / 100,
    secondYearDepreciation: Math.round(secondYear * 100) / 100,
    thirdYearDepreciation: Math.round(thirdYear * 100) / 100,
    totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    averageYearDepreciation: Math.round(averageYearDepreciation * 100) / 100,
    maxMonthDepreciation: Math.round(maxMonthDepreciation * 100) / 100,
    minMonthDepreciation: Math.round(minMonthDepreciation * 100) / 100
  }
}

export function comparePlans(plans: Plan[]): PlanComparison[] {
  return plans.map(plan => calculatePlanComparison(plan))
}
