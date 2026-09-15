'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveBasics } from '@/lib/actions/profile'

type Link = { label: string; url: string }

export function ProfileBasicsForm({
  initial,
}: {
  initial: {
    fullName: string | null
    headline: string | null
    location: string | null
    email: string | null
    phone: string | null
    links: Link[]
  }
}) {
  const [links, setLinks] = useState<Link[]>(initial.links)
  const [pending, startTransition] = useTransition()

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      fullName: String(form.get('fullName') ?? ''),
      headline: String(form.get('headline') ?? ''),
      location: String(form.get('location') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      links: links.filter((link) => link.label.trim() !== '' && link.url.trim() !== ''),
    }

    startTransition(async () => {
      try {
        await saveBasics(input)
        toast.success('Profile saved')
      } catch {
        toast.error('Could not save your profile, try again')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" defaultValue={initial.fullName ?? ''} placeholder="Rashedul Alam" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            name="headline"
            defaultValue={initial.headline ?? ''}
            placeholder="Senior Backend Engineer"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={initial.location ?? ''} placeholder="Dhaka, Bangladesh" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={initial.phone ?? ''} placeholder="+880 1XXX XXXXXX" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email">Contact email</Label>
          <Input id="email" name="email" type="email" defaultValue={initial.email ?? ''} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Links</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLinks((current) => [...current, { label: '', url: '' }])}
          >
            <Plus className="size-4" />
            Add link
          </Button>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No links yet. GitHub and LinkedIn are the usual two.</p>
        ) : (
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  aria-label="Link label"
                  value={link.label}
                  placeholder="GitHub"
                  className="max-w-40"
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                />
                <Input
                  aria-label="Link url"
                  value={link.url}
                  placeholder="https://github.com/you"
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, position) => (position === index ? { ...item, url: event.target.value } : item)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove link"
                  onClick={() => setLinks((current) => current.filter((_, position) => position !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
