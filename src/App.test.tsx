import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('TrustRail console', () => {
  it('runs a blocked bridge preflight from the operator console', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('scenario-blocked'))
    fireEvent.click(screen.getByTestId('run-preflight'))

    expect((await screen.findByTestId('current-decision')).textContent).toBe('BLOCK')
    expect(screen.getAllByText('COUNTERPARTY_BLOCKED').length).toBeGreaterThan(0)
  })
})
