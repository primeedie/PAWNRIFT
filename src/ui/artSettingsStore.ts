import { create } from 'zustand'

// Presentation only. Never included in run saves, practice snapshots or gameplay RNG.
export const useArtSettings = create<{
  outlines:boolean; lighting:'diorama'|'neutral'; viewerOpen:boolean
}>()(()=>({outlines:true,lighting:'diorama',viewerOpen:false}))
