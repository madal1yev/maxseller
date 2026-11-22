import {
  BadgeCheck,
  BookOpen,
  Box,
  Code2,
  FileText,
  Globe2,
  Palette,
  Video,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  globe: Globe2,
  palette: Palette,
  badge: BadgeCheck,
  book: BookOpen,
  file: FileText,
  video: Video,
  code: Code2,
  box: Box,
}

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && icons[name]) || LayoutGrid
}
