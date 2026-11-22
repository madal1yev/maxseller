'use client'

import { ProductCarousel } from '@/components/sections/product-carousel'
import {
  getBestSellers,
  getNewProducts,
  getPopularProducts,
  queryKeys,
} from '@/lib/api-queries'

export function PopularProducts() {
  return (
    <ProductCarousel
      eyebrow="Eng ommabop"
      title="Eng ko'p xarid qilinganlar"
      description="Mijozlar orasida eng mashhur bo'lgan mahsulotlar."
      href="/products?sort=popular"
      queryKey={queryKeys.popular}
      queryFn={getPopularProducts}
    />
  )
}

export function NewProducts() {
  return (
    <ProductCarousel
      eyebrow="Yangi"
      title="Yangi qo'shilgan mahsulotlar"
      description="Katalogdagi eng so'nggi mahsulotlar bilan tanishing."
      href="/products?sort=new"
      queryKey={queryKeys.newest}
      queryFn={getNewProducts}
    />
  )
}

export function BestSellers() {
  return (
    <ProductCarousel
      eyebrow="Top sotuvchilar"
      title="Eng yaxshi sotilayotganlar"
      description="Sotuvlar bo'yicha yetakchilar — ishonchli tanlov."
      href="/products?sort=popular"
      queryKey={queryKeys.bestSellers}
      queryFn={getBestSellers}
    />
  )
}
