import type { Metadata } from 'next'
import { ContactView } from '@/components/pages/contact-view'
import { PageHero } from '@/components/common/page-hero'

export const metadata: Metadata = {
  title: 'Bog\'lanish',
  description: 'MaxSeller jamoasi bilan bog\'lanish: email, Telegram va kontakt formasi.',
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Yordam"
        title="Biz bilan bog'lanish"
        description="Savollaringiz bormi? Bizga yozing — sizga yordam beramiz."
      />
      <ContactView />
    </>
  )
}
