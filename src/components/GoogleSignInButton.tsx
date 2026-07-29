import type { RefObject } from 'react'

export default function GoogleSignInButton({
  buttonRef,
}: {
  buttonRef: RefObject<HTMLDivElement | null>
}) {
  return <div ref={buttonRef} className="google-signin-button" />
}
