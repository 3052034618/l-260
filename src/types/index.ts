export type DepreciationMethod = 'straight-line' | 'double-declining' | 'sum-of-years'

export interface Asset {
  id: string
  assetCode: string
  assetName: string
  category: string
  department: string
  originalValue: number
  usefulLife: number
  salvageRate: number
  startDate: string
  method: DepreciationMethod
  accumulatedDepreciation: number
  netValue: number
  remark?: string
}

export interface MonthDepreciation {
  year: number
  month: number
  depreciation: number
  accumulatedDepreciation: number
  netValue: number
}

export interface AssetDepreciationResult {
  assetId: string
  assetCode: string
  assetName: string
  category: string
  department: string
  originalValue: number
  usefulLife: number
  salvageRate: number
  salvageValue: number
  startDate: string
  method: DepreciationMethod
  methodName: string
  monthDepreciations: MonthDepreciation[]
  totalDepreciation: number
  firstYearDepreciation: number
  lastYearDepreciation: number
  isNearEnd: boolean
  remainingMonths: number
  endDate: string
}

export interface DepartmentSummary {
  department: string
  assetCount: number
  totalOriginalValue: number
  yearDepreciation: number
  monthDepreciation: number
  accumulatedDepreciation: number
  netValue: number
}

export interface CategorySummary {
  category: string
  assetCount: number
  totalOriginalValue: number
  yearDepreciation: number
  monthDepreciation: number
}

export interface YearSummary {
  year: number
  depreciation: number
  accumulatedDepreciation: number
}

export interface DepreciationParams {
  method: DepreciationMethod
  defaultUsefulLife: number
  defaultSalvageRate: number
  budgetStartDate: string
  budgetYears: number
  nearEndMonths: number
}

export interface Plan {
  id: string
  name: string
  description: string
  assets: Asset[]
  params: DepreciationParams
  createdAt: string
  updatedAt: string
}

export interface PlanComparison {
  planId: string
  planName: string
  assetCount: number
  totalOriginalValue: number
  firstYearDepreciation: number
  secondYearDepreciation: number
  thirdYearDepreciation: number
  totalDepreciation: number
  averageYearDepreciation: number
  maxMonthDepreciation: number
  minMonthDepreciation: number
}

export interface DepartmentYearDiff {
  department: string
  year1Diff: number
  year2Diff: number
  year3Diff: number
  totalDiff: number
}

export interface MaxPressureDepartment {
  department: string
  firstYearDepreciation: number
  percentageOfTotal: number
}

export interface PlanConclusion {
  planNames: string[]
  basePlanName: string
  totalOriginalValueByPlan: { [planName: string]: number }
  firstYearDepreciationByPlan: { [planName: string]: number }
  totalDepreciationByPlan: { [planName: string]: number }
  departmentYearDiffs: DepartmentYearDiff[]
  maxPressureDepartments: { [planName: string]: MaxPressureDepartment }
  recommendation: string
  keyPoints: string[]
  generatedAt: string
}

export interface BudgetSummary {
  totalAssets: number
  totalOriginalValue: number
  totalSalvageValue: number
  totalDepreciation: number
  yearSummaries: YearSummary[]
  departmentSummaries: DepartmentSummary[]
  categorySummaries: CategorySummary[]
  nearEndAssets: number
  params: DepreciationParams
}

export const DEPRECIATION_METHODS: { value: DepreciationMethod; label: string }[] = [
  { value: 'straight-line', label: '直线法' },
  { value: 'double-declining', label: '双倍余额递减法' },
  { value: 'sum-of-years', label: '年数总和法' }
]

export const ASSET_CATEGORIES = [
  '房屋及建筑物',
  '机器设备',
  '运输设备',
  '电子设备',
  '办公设备',
  '家具器具',
  '无形资产',
  '其他'
]

export const DEPARTMENTS = [
  '财务部',
  '人事部',
  '市场部',
  '销售部',
  '研发部',
  '生产部',
  '采购部',
  '行政部',
  'IT部',
  '质量部',
  '仓储部',
  '其他'
]
