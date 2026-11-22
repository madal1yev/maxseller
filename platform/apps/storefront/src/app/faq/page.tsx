import type { Metadata } from 'next'
import { PageHero } from '@/components/common/page-hero'
import { FaqView } from '@/components/pages/faq-view'

export const metadata: Metadata = {
  title: 'Ko\'p so\'raladigan savollar',
  description: 'Xarid, to\'lov, chek yuklash va yuklamalar haqida eng ko\'p beriladigan savollar.',
}

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Yordam markazi"
        title="Ko'p so'raladigan savollar"
        description="Xarid jarayoni va to'lov haqidagi eng ko'p beriladigan savollarga javoblar."
      />
      <FaqView />
    </>
  )
}
