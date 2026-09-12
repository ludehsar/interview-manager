import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function JobNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">This job is no longer listed</h1>
      <p className="text-muted-foreground">
        The posting was closed or removed by its source. Browse the current listings instead.
      </p>
      <Button asChild>
        <Link href="/jobs">Browse jobs</Link>
      </Button>
    </div>
  )
}
