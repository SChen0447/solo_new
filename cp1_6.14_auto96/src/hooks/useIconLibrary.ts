import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface IconItem {
  id: string
  name: string
  svgContent: string
  size: number
  color: string
  isSelected: boolean
}

export type LayoutMode = 'grid' | 'flex' | 'waterfall'

export interface LayoutState {
  mode: LayoutMode
  gap: number
  backgroundColor: string
}

interface IconLibraryState {
  icons: IconItem[]
  layout: LayoutState
  addIcons: (files: File[]) => Promise<void>
  removeIcon: (id: string) => void
  updateIconSize: (id: string, size: number) => void
  updateIconColor: (id: string, color: string) => void
  toggleIconSelection: (id: string) => void
  setLayoutMode: (mode: LayoutMode) => void
  setGap: (gap: number) => void
  setBackgroundColor: (color: string) => void
}

function parseSvgFile(file: File): Promise<{ name: string; svgContent: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'image/svg+xml')
      const svgEl = doc.querySelector('svg')
      if (!svgEl) {
        reject(new Error(`Invalid SVG file: ${file.name}`))
        return
      }
      svgEl.removeAttribute('width')
      svgEl.removeAttribute('height')
      svgEl.setAttribute('fill', 'currentColor')
      const innerSvg = svgEl.innerHTML
      const viewBox = svgEl.getAttribute('viewBox') || ''
      const preserveAspectRatio = svgEl.getAttribute('preserveAspectRatio') || 'xMidYMid meet'
      let svgTag = `<svg viewBox="${viewBox}" preserveAspectRatio="${preserveAspectRatio}" fill="currentColor"`
      for (const attr of Array.from(svgEl.attributes)) {
        if (attr.name !== 'width' && attr.name !== 'height' && attr.name !== 'fill' && attr.name !== 'viewBox' && attr.name !== 'preserveAspectRatio') {
          svgTag += ` ${attr.name}="${attr.value}"`
        }
      }
      svgTag += `>${innerSvg}</svg>`

      const name = file.name.replace(/\.svg$/i, '').slice(0, 15) + (file.name.replace(/\.svg$/i, '').length > 15 ? '...' : '')
      resolve({ name, svgContent: svgTag })
    }
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsText(file)
  })
}

export const useIconLibrary = create<IconLibraryState>((set) => ({
  icons: [],
  layout: {
    mode: 'grid',
    gap: 16,
    backgroundColor: '#f0f4f8',
  },
  addIcons: async (files: File[]) => {
    const results = await Promise.allSettled(files.map(parseSvgFile))
    const newIcons: IconItem[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newIcons.push({
          id: uuidv4(),
          name: result.value.name,
          svgContent: result.value.svgContent,
          size: 48,
          color: '#000000',
          isSelected: false,
        })
      }
    }
    set((state) => ({ icons: [...state.icons, ...newIcons] }))
  },
  removeIcon: (id: string) => {
    set((state) => ({ icons: state.icons.filter((icon) => icon.id !== id) }))
  },
  updateIconSize: (id: string, size: number) => {
    set((state) => ({
      icons: state.icons.map((icon) => (icon.id === id ? { ...icon, size } : icon)),
    }))
  },
  updateIconColor: (id: string, color: string) => {
    set((state) => ({
      icons: state.icons.map((icon) => (icon.id === id ? { ...icon, color } : icon)),
    }))
  },
  toggleIconSelection: (id: string) => {
    set((state) => ({
      icons: state.icons.map((icon) =>
        icon.id === id ? { ...icon, isSelected: !icon.isSelected } : icon
      ),
    }))
  },
  setLayoutMode: (mode: LayoutMode) => {
    set((state) => ({ layout: { ...state.layout, mode } }))
  },
  setGap: (gap: number) => {
    set((state) => ({ layout: { ...state.layout, gap } }))
  },
  setBackgroundColor: (backgroundColor: string) => {
    set((state) => ({ layout: { ...state.layout, backgroundColor } }))
  },
}))
