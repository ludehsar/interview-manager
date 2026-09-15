'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MessageCircleQuestion } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { GapQuestion } from '@/ai/schemas/interview'
import { beginInterview, submitAnswer } from '@/lib/actions/interview'

type Outcome = { grounded: boolean; text: string; note: string | null }

export function GapInterview({ gaps }: { gaps: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [questions, setQuestions] = useState<GapQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [pending, startTransition] = useTransition()

  const current = questions[index]

  const start = () => {
    startTransition(async () => {
      try {
        const next = await beginInterview()
        if (next.length === 0) {
          toast.success('Nothing left to quantify')
          return
        }
        setQuestions(next)
        setIndex(0)
        setAnswer('')
        setOutcome(null)
        setOpen(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not start the interview')
      }
    })
  }

  const send = () => {
    if (!current || answer.trim().length < 2) return
    startTransition(async () => {
      try {
        const result = await submitAnswer({
          bulletId: current.bulletId,
          question: current.question,
          answer,
        })
        setOutcome({ grounded: result.grounded, text: result.text, note: result.note })
        router.refresh()
      } catch {
        toast.error('Could not save that answer, try again')
      }
    })
  }

  const next = () => {
    setAnswer('')
    setOutcome(null)
    if (index + 1 >= questions.length) {
      setOpen(false)
      return
    }
    setIndex(index + 1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {gaps === 0
            ? 'Every bullet carries a measurement.'
            : `${gaps} ${gaps === 1 ? 'bullet has' : 'bullets have'} no metric yet. The interview asks for the missing numbers and writes them back.`}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={pending || gaps === 0} onClick={start}>
          <MessageCircleQuestion className="size-4" />
          {pending && !open ? 'Preparing…' : 'Fill the gaps'}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Question {index + 1} of {questions.length}
            </DialogTitle>
            <DialogDescription>
              Answer in your own words. Nothing you do not say here will ever appear on a resume.
            </DialogDescription>
          </DialogHeader>

          {current ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Badge variant="outline" className="font-normal">
                  {current.expects.toLowerCase()}
                </Badge>
                <p className="font-medium">{current.question}</p>
                <p className="text-sm text-muted-foreground">{current.why}</p>
              </div>

              {outcome ? (
                <Alert>
                  {outcome.grounded ? <CheckCircle2 className="size-4" /> : null}
                  <AlertTitle>{outcome.grounded ? 'Bullet updated' : 'Kept as an estimate'}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{outcome.text}</p>
                    {outcome.note ? <p className="text-muted-foreground">{outcome.note}</p> : null}
                  </AlertDescription>
                </Alert>
              ) : (
                <Textarea
                  rows={4}
                  value={answer}
                  placeholder="We cut it from 40 minutes to 6 minutes, across all 60 services."
                  onChange={(event) => setAnswer(event.target.value)}
                />
              )}

              <div className="flex justify-end gap-2">
                {outcome ? (
                  <Button type="button" onClick={next}>
                    {index + 1 >= questions.length ? 'Done' : 'Next question'}
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="ghost" onClick={next}>
                      Skip
                    </Button>
                    <Button type="button" disabled={pending || answer.trim().length < 2} onClick={send}>
                      {pending ? 'Saving…' : 'Save answer'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
