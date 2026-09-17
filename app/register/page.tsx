import { redirect } from 'next/navigation';

export default function LegacyRegisterRedirect() {
  redirect('/en/auth/register');
}
