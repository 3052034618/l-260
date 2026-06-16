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
  DepreciationMethod,
  DepartmentYearDiff,
  MaxPressureDepartment,
  PlanConclusion
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
  if (!dateStr) return new Date()
  
  let year: number
  let month: number
  
  if (dateStr.includes('-') || dateStr.includes('/')) {
    const parts = dateStr.split(/[-/]/).filter(p => p)
    if (parts.length >= 2) {
      year = parseInt(parts[0])
      month = parseInt(parts[1]) - 1
      if (year < 100) year += 2000
      return new Date(year, month, 1)
    }
  }
  
  if (/^\d{6}$/.test(dateStr)) {
    year = parseInt(dateStr.slice(0, 4))
    month = parseInt(dateStr.slice(4, 6)) - 1
    return new Date(year, month, 1)
  }
  
  if (/^\d{4}\d{2}$/.test(dateStr)) {
    year = parseInt(dateStr.slice(0, 4))
    month = parseInt(dateStr.slice(4, 6)) - 1
    return new Date(year, month, 1)
  }
  
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }
  
  return new Date()
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
  const totalDepreciable = originalValue - salvageValue
  const monthlyDepreciation = totalDepreciable / usefulLifeMonths
  const result: MonthDepreciation[] = []
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const monthsDepreciated = Math.max(0, monthsBetween(startDate, today))
  const remainingMonths = Math.max(0, usefulLifeMonths - monthsDepreciated)
  
  const maxAllowedAccumulated = Math.min(accumulatedDepreciation, totalDepreciable)
  let currentAccumulated = maxAllowedAccumulated
  let currentNetValue = originalValue - currentAccumulated
  
  if (remainingMonths === 0 || currentNetValue <= salvageValue + 0.01) {
    return []
  }
  
  const remainingDepreciable = currentNetValue - salvageValue
  const adjustedMonthlyDepreciation = remainingDepreciable / remainingMonths
  
  for (let i = 0; i < remainingMonths; i++) {
    const monthIndex = monthsDepreciated + i
    const currentDate = addMonths(startDate, monthIndex)
    let depreciation: number
    
    if (i === remainingMonths - 1) {
      depreciation = currentNetValue - salvageValue
    } else {
      depreciation = adjustedMonthlyDepreciation
    }
    
    depreciation = Math.max(0, depreciation)
    
    currentAccumulated += depreciation
    currentNetValue -= depreciation
    
    result.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      depreciation: Math.round(depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(currentAccumulated * 100) / 100,
      netValue: Math.max(salvageValue, Math.round(currentNetValue * 100) / 100)
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
  const totalDepreciable = originalValue - salvageValue
  const straightLineRate = 1 / (usefulLifeMonths / 12)
  const doubleRate = straightLineRate * 2
  const monthlyRate = doubleRate / 12
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const monthsDepreciated = Math.max(0, monthsBetween(startDate, today))
  const remainingMonths = Math.max(0, usefulLifeMonths - monthsDepreciated)
  
  const maxAllowedAccumulated = Math.min(accumulatedDepreciation, totalDepreciable)
  let currentAccumulated = maxAllowedAccumulated
  let currentNetValue = originalValue - currentAccumulated
  
  if (remainingMonths === 0 || currentNetValue <= salvageValue + 0.01) {
    return []
  }
  
  let switchToStraightLine = false
  
  for (let i = 0; i < remainingMonths; i++) {
    const monthIndex = monthsDepreciated + i
    const currentDate = addMonths(startDate, monthIndex)
    const remainingMonthsNow = usefulLifeMonths - monthIndex
    let depreciation: number
    
    if (!switchToStraightLine) {
      const doubleDecliningDep = currentNetValue * monthlyRate
      const straightLineDep = (currentNetValue - salvageValue) / remainingMonthsNow
      
      if (doubleDecliningDep < straightLineDep || remainingMonthsNow <= 24) {
        switchToStraightLine = true
        depreciation = (currentNetValue - salvageValue) / remainingMonthsNow
      } else {
        depreciation = doubleDecliningDep
      }
    } else {
      depreciation = (currentNetValue - salvageValue) / remainingMonthsNow
    }
    
    if (i === remainingMonths - 1) {
      depreciation = currentNetValue - salvageValue
    }
    
    depreciation = Math.max(0, depreciation)
    
    currentAccumulated += depreciation
    currentNetValue -= depreciation
    
    result.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      depreciation: Math.round(depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(currentAccumulated * 100) / 100,
      netValue: Math.max(salvageValue, Math.round(currentNetValue * 100) / 100)
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
  const totalDepreciable = originalValue - salvageValue
  const usefulYears = usefulLifeMonths / 12
  const sumOfYears = (usefulYears * (usefulYears + 1)) / 2
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const monthsDepreciated = Math.max(0, monthsBetween(startDate, today))
  const remainingMonths = Math.max(0, usefulLifeMonths - monthsDepreciated)
  
  const maxAllowedAccumulated = Math.min(accumulatedDepreciation, totalDepreciable)
  let currentAccumulated = maxAllowedAccumulated
  let currentNetValue = originalValue - currentAccumulated
  
  if (remainingMonths === 0 || currentNetValue <= salvageValue + 0.01) {
    return []
  }
  
  for (let i = 0; i < remainingMonths; i++) {
    const monthIndex = monthsDepreciated + i
    const currentDate = addMonths(startDate, monthIndex)
    const currentYear = Math.floor(monthIndex / 12)
    const remainingYears = usefulYears - currentYear
    const yearlyRate = remainingYears / sumOfYears
    const yearlyDepreciation = totalDepreciable * yearlyRate
    const monthlyDepreciation = yearlyDepreciation / 12
    
    let depreciation = monthlyDepreciation
    
    if (i === remainingMonths - 1) {
      depreciation = currentNetValue - salvageValue
    }
    
    depreciation = Math.max(0, depreciation)
    
    currentAccumulated += depreciation
    currentNetValue -= depreciation
    
    result.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      depreciation: Math.round(depreciation * 100) / 100,
      accumulatedDepreciation: Math.round(currentAccumulated * 100) / 100,
      netValue: Math.max(salvageValue, Math.round(currentNetValue * 100) / 100)
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
  const totalDepreciable = asset.originalValue - salvageValue
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthsDepreciated = Math.max(0, monthsBetween(startDate, today))
  const remainingMonths = Math.max(0, usefulLifeMonths - monthsDepreciated)
  
  const maxAllowedAccumulated = Math.min(asset.accumulatedDepreciation, totalDepreciable)
  const adjustedAccumulated = maxAllowedAccumulated
  
  let monthDepreciations: MonthDepreciation[]
  
  switch (asset.method) {
    case 'double-declining':
      monthDepreciations = calculateDoubleDeclining(
        asset.originalValue,
        salvageValue,
        usefulLifeMonths,
        startDate,
        adjustedAccumulated
      )
      break
    case 'sum-of-years':
      monthDepreciations = calculateSumOfYears(
        asset.originalValue,
        salvageValue,
        usefulLifeMonths,
        startDate,
        adjustedAccumulated
      )
      break
    case 'straight-line':
    default:
      monthDepreciations = calculateStraightLine(
        asset.originalValue,
        salvageValue,
        usefulLifeMonths,
        startDate,
        adjustedAccumulated
      )
  }
  
  const futureDepreciation = monthDepreciations.reduce((sum, m) => sum + m.depreciation, 0)
  const totalDepreciation = adjustedAccumulated + futureDepreciation
  
  const firstCalendarYear = monthDepreciations.length > 0 ? monthDepreciations[0].year : startDate.getFullYear()
  const firstYearDepreciation = monthDepreciations
    .filter(m => m.year === firstCalendarYear)
    .reduce((sum, m) => sum + m.depreciation, 0)
  
  const endYear = endDate.getFullYear()
  const lastYearDepreciation = monthDepreciations
    .filter(m => m.year === endYear)
    .reduce((sum, m) => sum + m.depreciation, 0)
  
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
  const budgetStartYear = budgetStart.getFullYear()
  const budgetEndYear = budgetEnd.getFullYear()
  
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
    
    const openingAccumulated = result.monthDepreciations.length > 0 
      ? (result.monthDepreciations[0].accumulatedDepreciation - result.monthDepreciations[0].depreciation)
      : (result.originalValue - result.salvageValue)
    
    const closingAccumulated = openingAccumulated + yearDepreciation
    const closingNetValue = result.originalValue - closingAccumulated
    
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
    dept.accumulatedDepreciation += closingAccumulated
    dept.netValue += Math.max(result.salvageValue, closingNetValue)
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
  
  const yearDepreciationMap = new Map<number, number>()
  const assetOpeningAccumulated = new Map<string, number>()
  
  for (let y = 0; y < budgetYears; y++) {
    yearDepreciationMap.set(startYear + y, 0)
  }
  
  for (const result of results) {
    const firstMonth = result.monthDepreciations[0]
    const openingAccumulated = firstMonth 
      ? (firstMonth.accumulatedDepreciation - firstMonth.depreciation)
      : (result.originalValue - result.salvageValue)
    assetOpeningAccumulated.set(result.assetId, openingAccumulated)
    
    for (const m of result.monthDepreciations) {
      if (yearDepreciationMap.has(m.year)) {
        const current = yearDepreciationMap.get(m.year)!
        yearDepreciationMap.set(m.year, current + m.depreciation)
      }
    }
  }
  
  const totalOpeningAccumulated = Array.from(assetOpeningAccumulated.values())
    .reduce((sum, v) => sum + v, 0)
  
  let runningAccumulated = totalOpeningAccumulated
  
  return Array.from(yearDepreciationMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, depreciation]) => {
      runningAccumulated += depreciation
      return {
        year,
        depreciation: Math.round(depreciation * 100) / 100,
        accumulatedDepreciation: Math.round(runningAccumulated * 100) / 100
      }
    })
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

export function calculateDepartmentYearDiff(
  results: AssetDepreciationResult[],
  baseResults: AssetDepreciationResult[],
  budgetStartDate: string,
  budgetYears: number
): DepartmentYearDiff[] {
  const budgetStart = parseDate(budgetStartDate)
  const startYear = budgetStart.getFullYear()
  
  const deptYearMap = new Map<string, {
    year1: number
    year2: number
    year3: number
    baseYear1: number
    baseYear2: number
    baseYear3: number
  }>()
  
  const addToMap = (
    result: AssetDepreciationResult,
    isBase: boolean
  ) => {
    const dept = result.department
    if (!deptYearMap.has(dept)) {
      deptYearMap.set(dept, { year1: 0, year2: 0, year3: 0, baseYear1: 0, baseYear2: 0, baseYear3: 0 })
    }
    const entry = deptYearMap.get(dept)!
    
    for (const m of result.monthDepreciations) {
      if (m.year === startYear) {
        if (isBase) entry.baseYear1 += m.depreciation
        else entry.year1 += m.depreciation
      } else if (m.year === startYear + 1) {
        if (isBase) entry.baseYear2 += m.depreciation
        else entry.year2 += m.depreciation
      } else if (m.year === startYear + 2) {
        if (isBase) entry.baseYear3 += m.depreciation
        else entry.year3 += m.depreciation
      }
    }
  }
  
  for (const result of results) addToMap(result, false)
  for (const result of baseResults) addToMap(result, true)
  
  return Array.from(deptYearMap.entries()).map(([department, data]) => ({
    department,
    year1Diff: Math.round((data.year1 - data.baseYear1) * 100) / 100,
    year2Diff: Math.round((data.year2 - data.baseYear2) * 100) / 100,
    year3Diff: Math.round((data.year3 - data.baseYear3) * 100) / 100,
    totalDiff: Math.round((data.year1 + data.year2 + data.year3 - data.baseYear1 - data.baseYear2 - data.baseYear3) * 100) / 100
  })).sort((a, b) => Math.abs(b.totalDiff) - Math.abs(a.totalDiff))
}

export function findMaxPressureDepartment(
  results: AssetDepreciationResult[],
  budgetStartDate: string
): MaxPressureDepartment {
  const budgetStart = parseDate(budgetStartDate)
  const startYear = budgetStart.getFullYear()
  
  const deptMap = new Map<string, number>()
  
  for (const result of results) {
    const dept = result.department
    if (!deptMap.has(dept)) deptMap.set(dept, 0)
    
    const year1Depreciation = result.monthDepreciations
      .filter(m => m.year === startYear)
      .reduce((sum, m) => sum + m.depreciation, 0)
    
    deptMap.set(dept, deptMap.get(dept)! + year1Depreciation)
  }
  
  const totalFirstYear = Array.from(deptMap.values()).reduce((sum, v) => sum + v, 0)
  
  let maxDept = ''
  let maxValue = 0
  
  for (const [dept, value] of deptMap.entries()) {
    if (value > maxValue) {
      maxValue = value
      maxDept = dept
    }
  }
  
  return {
    department: maxDept,
    firstYearDepreciation: Math.round(maxValue * 100) / 100,
    percentageOfTotal: totalFirstYear > 0 ? Math.round((maxValue / totalFirstYear) * 10000) / 100 : 0
  }
}

export function generatePlanConclusion(
  plans: Plan[],
  basePlanIndex: number = 0
): PlanConclusion {
  const basePlan = plans[basePlanIndex]
  if (!basePlan || plans.length < 2) {
    return {
      planNames: plans.map(p => p.name),
      basePlanName: basePlan?.name || '',
      totalOriginalValueByPlan: {},
      firstYearDepreciationByPlan: {},
      totalDepreciationByPlan: {},
      departmentYearDiffs: [],
      maxPressureDepartments: {},
      recommendation: '请至少选择两个方案进行对比分析',
      keyPoints: [],
      generatedAt: new Date().toLocaleString('zh-CN')
    }
  }
  
  const planNames = plans.map(p => p.name)
  const totalOriginalValueByPlan: { [key: string]: number } = {}
  const firstYearDepreciationByPlan: { [key: string]: number } = {}
  const totalDepreciationByPlan: { [key: string]: number } = {}
  const maxPressureDepartments: { [key: string]: MaxPressureDepartment } = {}
  
  const allResults: AssetDepreciationResult[][] = []
  const allComparisons: PlanComparison[] = []
  
  for (const plan of plans) {
    const results = calculateAllAssetsDepreciation(plan.assets, plan.params.nearEndMonths)
    const comparison = calculatePlanComparison(plan)
    const maxPressure = findMaxPressureDepartment(results, plan.params.budgetStartDate)
    
    allResults.push(results)
    allComparisons.push(comparison)
    maxPressureDepartments[plan.name] = maxPressure
    totalOriginalValueByPlan[plan.name] = comparison.totalOriginalValue
    firstYearDepreciationByPlan[plan.name] = comparison.firstYearDepreciation
    totalDepreciationByPlan[plan.name] = comparison.totalDepreciation
  }
  
  const departmentYearDiffs = calculateDepartmentYearDiff(
    allResults[1],
    allResults[0],
    basePlan.params.budgetStartDate,
    basePlan.params.budgetYears
  )
  
  const baseComparison = allComparisons[0]
  const otherComparisons = allComparisons.slice(1)
  
  let recommendation = ''
  const keyPoints: string[] = []
  
  const minTotalDepreciation = Math.min(...allComparisons.map(c => c.totalDepreciation))
  const minFirstYearDepreciation = Math.min(...allComparisons.map(c => c.firstYearDepreciation))
  
  const lowestTotalPlan = allComparisons.find(c => c.totalDepreciation === minTotalDepreciation)
  const lowestFirstYearPlan = allComparisons.find(c => c.firstYearDepreciation === minFirstYearDepreciation)
  
  keyPoints.push(`方案共涉及资产 ${basePlan.assets.length} 项，原值合计 ${formatNumber(baseComparison.totalOriginalValue)} 元`)
  
  if (lowestTotalPlan && lowestFirstYearPlan) {
    if (lowestTotalPlan.planName === lowestFirstYearPlan.planName) {
      recommendation = `综合来看，「${lowestTotalPlan.planName}」在折旧总额和首年压力方面均表现最优，建议优先考虑。`
    } else {
      const totalDiff = baseComparison.totalDepreciation - lowestTotalPlan.totalDepreciation
      const firstYearDiff = baseComparison.firstYearDepreciation - lowestFirstYearPlan.firstYearDepreciation
      
      if (Math.abs(totalDiff) > Math.abs(firstYearDiff) * 2) {
        recommendation = `「${lowestTotalPlan.planName}」长期成本更低（三年合计节省 ${formatNumber(Math.abs(totalDiff))} 元），若预算周期较长建议优先选择；若首年预算紧张，可考虑「${lowestFirstYearPlan.planName}」。`
      } else {
        recommendation = `「${lowestFirstYearPlan.planName}」首年预算压力最小（节省 ${formatNumber(Math.abs(firstYearDiff))} 元），适合当期预算有限的情况；「${lowestTotalPlan.planName}」则在全周期成本上更有优势。`
      }
    }
  }
  
  const maxPressure = maxPressureDepartments[basePlan.name]
  if (maxPressure && maxPressure.department) {
    keyPoints.push(`首年预算压力最大的部门是「${maxPressure.department}」，占首年折旧总额的 ${maxPressure.percentageOfTotal}%（${formatNumber(maxPressure.firstYearDepreciation)} 元）`)
  }
  
  const significantDiffs = departmentYearDiffs.filter(d => Math.abs(d.totalDiff) >= 1000)
  if (significantDiffs.length > 0) {
    const topDiff = significantDiffs[0]
    const direction = topDiff.totalDiff > 0 ? '增加' : '减少'
    keyPoints.push(`两方案差异最大的部门是「${topDiff.department}」，三年折旧合计${direction} ${formatNumber(Math.abs(topDiff.totalDiff))} 元`)
  }
  
  keyPoints.push(`首年折旧最高方案为 ${formatNumber(Math.max(...allComparisons.map(c => c.firstYearDepreciation)))} 元，最低为 ${formatNumber(minFirstYearDepreciation)} 元，差距 ${formatNumber(Math.max(...allComparisons.map(c => c.firstYearDepreciation)) - minFirstYearDepreciation)} 元`)
  
  return {
    planNames,
    basePlanName: basePlan.name,
    totalOriginalValueByPlan,
    firstYearDepreciationByPlan,
    totalDepreciationByPlan,
    departmentYearDiffs,
    maxPressureDepartments,
    recommendation,
    keyPoints,
    generatedAt: new Date().toLocaleString('zh-CN')
  }
}
