import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import { Input, Label, Textarea } from "@/components/ui/Field"
import { api } from "@/lib/api"

/**
 * Opens the email a task wants the clinician to send, pre-filled from the
 * template. The clinician can edit anything before sending.
 */
export function ModalSendEmail({
  taskId,
  children,
}: {
  taskId: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const utils = api.useUtils()

  const draft = api.emails.draftForTask.useQuery({ taskId }, { enabled: open })

  // Seed the form once per open from the draft. Later refetches must not
  // clobber the clinician's edits.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!open) {
      seededRef.current = false
      return
    }
    if (draft.data && !seededRef.current) {
      seededRef.current = true
      setTo(draft.data.to)
      setSubject(draft.data.subject)
      setBody(draft.data.body)
    }
  }, [open, draft.data])

  const send = api.emails.sendForTask.useMutation({
    onSuccess: () => {
      toast.success("Email sent")
      utils.tasks.invalidate()
      utils.emails.invalidate()
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Send email</DialogTitle>
        <DialogDescription>
          Review the draft, edit if needed, then send.
        </DialogDescription>
        {draft.isPending ? (
          <div className="py-10 text-center text-muted-foreground">
            Preparing draft…
          </div>
        ) : draft.isError ? (
          <div className="py-10 text-center text-danger">
            {draft.error.message}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email-body">Body</Label>
              <Textarea
                id="email-body"
                className="min-h-72 font-mono text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={!draft.data}
            loading={send.isPending}
            onClick={() => send.mutate({ taskId, to, subject, body })}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
