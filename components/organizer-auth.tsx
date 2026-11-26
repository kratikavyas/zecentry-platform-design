"use client"

import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type OrganizerAuthProps = {
  onBack: () => void
  audience?: "organizer" | "attendee"
}

export function OrganizerAuth({ onBack, audience = "organizer" }: OrganizerAuthProps) {
  const isAttendee = audience === "attendee"
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    setError("")
    setSubmitting(true)

    try {
      const supabase = createClient()

      if (mode === "sign-up") {
        if (password.length < 8) {
          setError("Use a password with at least 8 characters.")
          return
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          },
        })

        if (authError) {
          const detail = authError.message.toLowerCase()
          setError(detail.includes("rate limit") || detail.includes("too many")
            ? "Too many attempts. Please wait a little before trying again."
            : detail.includes("weak password")
              ? "Choose a stronger password with at least 8 characters."
              : detail.includes("invalid email")
                ? "Enter a valid email address and try again."
                : "We couldn’t create your organizer account. Check your details and try again.")
          return
        }

        if (data.session) {
          setMessage(isAttendee ? "Your account is ready. Opening your tickets…" : "Your account is ready. Opening your organizer workspace…")
        } else {
          setMessage(isAttendee ? "Check your inbox for the confirmation link, then sign in to continue." : "Check your inbox for the confirmation link, then sign in to manage events.")
          setMode("sign-in")
        }
        return
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        const detail = authError.message.toLowerCase()
        setError(detail.includes("not confirmed")
          ? "Please confirm your email using the link we sent before signing in."
          : detail.includes("rate limit") || detail.includes("too many")
            ? "Too many attempts. Please wait a little before trying again."
            : "We couldn’t sign you in. Check your email and password and try again.")
      }
    } catch {
      setError("We couldn’t connect to the account service. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="organizer-auth wrap">
      <button className="back-link" onClick={onBack} type="button"><ArrowLeft size={15} /> Back to experiences</button>
      <section className="organizer-auth-card" aria-labelledby="organizer-auth-title">
        <span className="auth-mark"><ShieldCheck size={19} /></span>
        <span className="eyebrow">{isAttendee ? "YOUR PASSES, SECURELY KEPT" : "A PRIVATE SPACE FOR YOUR GATHERINGS"}</span>
        <h1 id="organizer-auth-title">{mode === "sign-in" ? "Welcome back." : isAttendee ? "Keep your place." : "Start gathering."}</h1>
        <p className="auth-description">{isAttendee ? "Sign in or create an account to reserve passes and keep them in your wallet." : "Sign in to host and manage your gatherings. Discovering public experiences stays open to everyone."}</p>
        <form className="organizer-auth-form" onSubmit={submit}>
          <label className="form-label" htmlFor="organizer-email">Email address
            <input id="organizer-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <label className="form-label" htmlFor="organizer-password">Password
            <input id="organizer-password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={mode === "sign-up" ? 8 : 1} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"} />
          </label>
          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="button button-dark buy-button" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : isAttendee ? "Create account" : "Create organizer account"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-switch">
          {mode === "sign-in" ? "New to ZecEntry?" : "Already have an account?"}
          <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setMessage("") }}>
            {mode === "sign-in" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="auth-footnote"><ShieldCheck size={14} /> {isAttendee ? "Your passes are private to your account." : "Event ownership is enforced by Supabase row-level security."}</p>
      </section>
    </main>
  )
}
