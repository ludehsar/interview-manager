'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { savePreferences } from '@/lib/actions/profile'
import { TokenInput } from './token-input'

const REMOTE_REGIONS = ['WORLDWIDE', 'APAC', 'BANGLADESH']
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP']
const SENIORITY = ['JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'LEAD']

function Choices({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() =>
                onChange(active ? selected.filter((value) => value !== option) : [...selected, option])
              }
            >
              {option.replace(/_/g, ' ').toLowerCase()}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function PreferencesForm({
  initial,
}: {
  initial: {
    targetTitles: string[]
    seniority: string[]
    remoteRegions: string[]
    employmentTypes: string[]
    salaryMinUsdMonth: number | null
    excludedCompanies: string[]
  }
}) {
  const [state, setState] = useState(initial)
  const [pending, startTransition] = useTransition()

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      try {
        await savePreferences(state)
        toast.success('Preferences saved')
      } catch {
        toast.error('Could not save preferences, try again')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <TokenInput
        id="targetTitles"
        label="Target titles"
        values={state.targetTitles}
        placeholder="Backend Engineer, then Enter"
        onChange={(targetTitles) => setState((current) => ({ ...current, targetTitles }))}
      />

      <Choices
        label="Seniority"
        options={SENIORITY}
        selected={state.seniority}
        onChange={(seniority) => setState((current) => ({ ...current, seniority }))}
      />

      <Choices
        label="Remote regions"
        options={REMOTE_REGIONS}
        selected={state.remoteRegions}
        onChange={(remoteRegions) => setState((current) => ({ ...current, remoteRegions }))}
      />

      <Choices
        label="Employment types"
        options={EMPLOYMENT_TYPES}
        selected={state.employmentTypes}
        onChange={(employmentTypes) => setState((current) => ({ ...current, employmentTypes }))}
      />

      <div className="space-y-1.5">
        <Label htmlFor="salaryMinUsdMonth">Salary floor, USD per month</Label>
        <Input
          id="salaryMinUsdMonth"
          type="number"
          min={0}
          step={100}
          className="max-w-48"
          value={state.salaryMinUsdMonth ?? ''}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              salaryMinUsdMonth: event.target.value === '' ? null : Number(event.target.value),
            }))
          }
        />
      </div>

      <TokenInput
        id="excludedCompanies"
        label="Never show these companies"
        values={state.excludedCompanies}
        placeholder="Company name, then Enter"
        onChange={(excludedCompanies) => setState((current) => ({ ...current, excludedCompanies }))}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  )
}
