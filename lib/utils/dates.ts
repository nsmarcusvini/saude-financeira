export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function currentYear(): number {
  return new Date().getFullYear()
}

export function getYearRange(from = 2020): number[] {
  const current = currentYear()
  const years: number[] = []
  for (let y = current + 1; y >= from; y--) {
    years.push(y)
  }
  return years
}
