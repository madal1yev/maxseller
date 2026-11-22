import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container-page py-12">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="mb-3 h-12 w-2/3" />
      <Skeleton className="mb-10 h-5 w-full max-w-xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
