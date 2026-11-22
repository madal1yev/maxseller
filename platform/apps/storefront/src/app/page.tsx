import { Hero } from '@/components/sections/hero'
import { FeaturedProducts } from '@/components/sections/featured'
import { CategoriesSection } from '@/components/sections/categories'
import { PopularProducts, NewProducts, BestSellers } from '@/components/sections/product-carousels'
import { SpecialOffer } from '@/components/sections/special-offer'
import { WhyUs } from '@/components/sections/why-us'
import { ReviewsSection } from '@/components/sections/reviews'
import { FaqSection } from '@/components/sections/faq-section'

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <CategoriesSection />
      <PopularProducts />
      <SpecialOffer />
      <NewProducts />
      <WhyUs />
      <BestSellers />
      <ReviewsSection />
      <FaqSection />
    </>
  )
}
