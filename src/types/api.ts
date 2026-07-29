export interface HomeItem {
  name: string
  details: string
  imageUrl: string
}

export interface GalleryFolder {
  id: string
  name: string
}

export interface GalleryPhoto {
  id: string
  name: string
  url: string
}

export interface EventForm {
  id: string
  title: string
  formUrl: string
}

export interface ContactEntry {
  name: string
  phone: string
  email: string
  role?: string
}
