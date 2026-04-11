// src/__tests__/score.test.js
// Testes unitários para cálculo de score e helpers

import { calcScore, aggregateLancamentos, toDateKey, getWeeksOfMonth } from '../lib/helpers.js'

// ─── calcScore ───────────────────────────────────────────────

describe('calcScore — pesos padrão (40/30/30)', () => {
  const pesos = { peso_venda: 40, peso_ticket: 30, peso_pa: 30 }

  test('100% em tudo → score 100', () => {
    const result = calcScore(
      { vendas: 1000, ticket: 50, pa: 2 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 2 },
      pesos
    )
    expect(result.score).toBe(100)
    expect(result.pv).toBe(100)
    expect(result.pt).toBe(100)
    expect(result.pp).toBe(100)
  })

  test('50% em tudo → score 50', () => {
    const result = calcScore(
      { vendas: 500, ticket: 25, pa: 1 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 2 },
      pesos
    )
    expect(result.score).toBe(50)
  })

  test('200% venda, 100% ticket/PA → score 140', () => {
    const result = calcScore(
      { vendas: 2000, ticket: 50, pa: 2 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 2 },
      pesos
    )
    // pv=200 * 0.4 + pt=100 * 0.3 + pp=100 * 0.3 = 80 + 30 + 30 = 140
    expect(result.score).toBe(140)
  })

  test('sem meta_ticket → peso redistribuído para venda (40+30=70)', () => {
    const result = calcScore(
      { vendas: 1000, ticket: 50, pa: 2 },
      { meta_venda: 1000, meta_ticket: 0, meta_pa: 2 },
      pesos
    )
    // pesoV=70, pesoT=0, pesoP=30
    // pv=100 * 70/100 + pp=100 * 30/100 = 70 + 30 = 100
    expect(result.score).toBe(100)
    expect(result.pt).toBe(0)
  })

  test('sem meta_pa → peso redistribuído para venda (40+30=70)', () => {
    const result = calcScore(
      { vendas: 1000, ticket: 50, pa: 2 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 0 },
      pesos
    )
    expect(result.score).toBe(100)
    expect(result.pp).toBe(0)
  })

  test('sem nenhuma meta de ticket/PA → 100% peso para venda', () => {
    const result = calcScore(
      { vendas: 800, ticket: 0, pa: 0 },
      { meta_venda: 1000, meta_ticket: 0, meta_pa: 0 },
      pesos
    )
    // pesoV=100, pv=80
    expect(result.score).toBe(80)
  })

  test('sem meta_venda → pv = 0', () => {
    const result = calcScore(
      { vendas: 1000, ticket: 50, pa: 2 },
      { meta_venda: 0, meta_ticket: 50, meta_pa: 2 },
      pesos
    )
    expect(result.pv).toBe(0)
    expect(result.score).toBe(60) // 0*0.4 + 100*0.3 + 100*0.3 = 60
  })

  test('vendas zero → score zero', () => {
    const result = calcScore(
      { vendas: 0, ticket: 0, pa: 0 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 2 },
      pesos
    )
    expect(result.score).toBe(0)
  })
})

describe('calcScore — pesos customizados', () => {
  test('pesos 60/20/20', () => {
    const pesos = { peso_venda: 60, peso_ticket: 20, peso_pa: 20 }
    const result = calcScore(
      { vendas: 1000, ticket: 50, pa: 2 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 2 },
      pesos
    )
    expect(result.score).toBe(100)
  })

  test('pesos faltando → usa defaults 40/30/30', () => {
    const result = calcScore(
      { vendas: 1000, ticket: 50, pa: 2 },
      { meta_venda: 1000, meta_ticket: 50, meta_pa: 2 },
      {}
    )
    expect(result.score).toBe(100)
  })
})

// ─── aggregateLancamentos ─────────────────────────────────────

describe('aggregateLancamentos', () => {
  test('agregação básica', () => {
    const lcs = [
      { vendas: 1000, atendimentos: 10, pecas: 20 },
      { vendas: 500,  atendimentos: 5,  pecas: 8  },
    ]
    const r = aggregateLancamentos(lcs)
    expect(r.vendas).toBe(1500)
    expect(r.atendimentos).toBe(15)
    expect(r.pecas).toBe(28)
    expect(r.ticket).toBe(100)   // 1500 / 15
    expect(r.pa).toBeCloseTo(1.87, 1)  // 28 / 15
  })

  test('sem atendimentos → ticket e pa = 0', () => {
    const r = aggregateLancamentos([{ vendas: 500, atendimentos: 0, pecas: 0 }])
    expect(r.ticket).toBe(0)
    expect(r.pa).toBe(0)
  })

  test('lista vazia → zeros', () => {
    const r = aggregateLancamentos([])
    expect(r.vendas).toBe(0)
    expect(r.atendimentos).toBe(0)
    expect(r.pecas).toBe(0)
    expect(r.ticket).toBe(0)
    expect(r.pa).toBe(0)
  })

  test('lança com campos null/undefined → trata como 0', () => {
    const r = aggregateLancamentos([{ vendas: null, atendimentos: undefined, pecas: 5 }])
    expect(r.vendas).toBe(0)
    expect(r.pecas).toBe(5)
  })
})

// ─── toDateKey ────────────────────────────────────────────────

describe('toDateKey', () => {
  test('Date object → YYYY-MM-DD sem desvio de UTC', () => {
    const d = new Date(2024, 0, 15) // 15 jan 2024 local
    expect(toDateKey(d)).toBe('2024-01-15')
  })

  test('string ISO → retorna slice(0,10)', () => {
    expect(toDateKey('2024-06-30T03:00:00+00:00')).toBe('2024-06-30')
    expect(toDateKey('2024-06-30')).toBe('2024-06-30')
  })

  test('último dia do mês', () => {
    const d = new Date(2024, 1, 29) // 29 fev 2024
    expect(toDateKey(d)).toBe('2024-02-29')
  })
})

// ─── getWeeksOfMonth ──────────────────────────────────────────

describe('getWeeksOfMonth', () => {
  test('retorna array de semanas (cada semana tem 6 dias)', () => {
    const weeks = getWeeksOfMonth(2024, 0) // jan 2024
    expect(Array.isArray(weeks)).toBe(true)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    weeks.forEach(w => expect(w).toHaveLength(6))
  })

  test('todos os dias de uma semana têm key YYYY-MM-DD', () => {
    const weeks = getWeeksOfMonth(2024, 0)
    const keyRegex = /^\d{4}-\d{2}-\d{2}$/
    weeks.flat().forEach(d => expect(d.key).toMatch(keyRegex))
  })

  test('dias fora do mês têm inMonth = false', () => {
    const weeks = getWeeksOfMonth(2024, 0)
    const outOfMonth = weeks.flat().filter(d => !d.inMonth)
    outOfMonth.forEach(d => {
      const month = new Date(d.key).getUTCMonth()
      expect(month).not.toBe(0) // não é janeiro
    })
  })

  test('fevereiro 2024 (ano bissexto) tem 29 dias', () => {
    const weeks = getWeeksOfMonth(2024, 1)
    const daysInMonth = weeks.flat().filter(d => d.inMonth)
    expect(daysInMonth).toHaveLength(29)
  })
})
