import { redirect } from 'next/navigation';

export default function LegacyLoginRedirect() {
  redirect('/en/auth/sign-in');
}
