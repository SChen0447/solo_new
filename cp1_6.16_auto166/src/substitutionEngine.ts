import type { Ingredient, SubstitutionRule, SubstitutionResult, TasteChange } from './types'
import { substitutionRules } from './ruleData'

export function findSubstitutions(
  ingredientName: string,
  rules: SubstitutionRule[] = substitutionRules
): SubstitutionRule[] {
  const normalizedName = ingredientName.trim()
  return rules.filter(
    (rule) =>
      rule.originalName === normalizedName ||
      normalizedName.includes(rule.originalName) ||
      rule.originalName.includes(normalizedName)
  )
}

export function calculateSubstitutionAmount(
  originalAmount: number,
  ratioValue: number
): number {
  return Math.round(originalAmount * ratioValue * 100) / 100
}

export function formatTasteChange(tasteChange: TasteChange): string {
  const changes: string[] = []
  const tasteNames: Record<keyof TasteChange, string> = {
    sour: '酸味',
    sweet: '甜味',
    bitter: '苦味',
    spicy: '辣味',
    salty: '咸味'
  }

  for (const key of Object.keys(tasteNames) as (keyof TasteChange)[]) {
    const change = tasteChange[key]
    if (change && change !== '不变') {
      changes.push(`${tasteNames[key]}${change}`)
    }
  }

  return changes.length > 0 ? changes.join('、') : '口味基本不变'
}

export function getSubstitutionResults(
  ingredient: Ingredient,
  rules: SubstitutionRule[] = substitutionRules
): SubstitutionResult[] {
  const matchedRules = findSubstitutions(ingredient.name, rules)
  return matchedRules.map((rule) => ({
    rule,
    convertedAmount: calculateSubstitutionAmount(ingredient.amount, rule.ratioValue),
    unit: ingredient.unit
  }))
}

export function applySubstitution(
  ingredient: Ingredient,
  result: SubstitutionResult
): Ingredient {
  return {
    ...ingredient,
    name: result.rule.substituteName,
    amount: result.convertedAmount,
    isReplaced: true,
    originalName: ingredient.originalName || ingredient.name
  }
}
