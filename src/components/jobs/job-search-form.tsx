import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { JobFilters } from '@/domain/jobs/search'

export function JobSearchForm({ filters }: { filters: JobFilters }) {
  return (
    <form action="/jobs" className="flex w-full max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={filters.q ?? ''}
          placeholder="Search titles, companies, skills"
          className="rounded-full pl-9"
        />
      </div>
      {filters.region?.length ? <input type="hidden" name="region" value={filters.region.join(',')} /> : null}
      {filters.locations?.length ? <input type="hidden" name="loc" value={filters.locations.join(',')} /> : null}
      {filters.workplaceType?.length ? (
        <input type="hidden" name="workplace" value={filters.workplaceType.join(',')} />
      ) : null}
      {filters.skills?.length ? <input type="hidden" name="skills" value={filters.skills.join(',')} /> : null}
      <input type="hidden" name="sort" value="relevance" />
      <Button type="submit" className="rounded-full">
        Search
      </Button>
    </form>
  )
}
