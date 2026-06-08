'use server'

import { signIn } from '@/lib/auth/config'

export async function loginWithGoogle() {
  await signIn('google', { redirectTo: '/dashboard' })
}
