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

export interface CommitteeMember {
  name: string
  role: string
  year: string
  email?: string
  phone?: string
  imageUrl: string
  socialLinks?: Record<string, string>
}

export interface CommitteeYear {
  year: string
  members: CommitteeMember[]
}

export interface CommitteeData {
  years: CommitteeYear[]
}

export interface FooterContact {
  address?: string
  phone?: string
  email?: string
}

export interface FooterData {
  about: string
  contact: FooterContact
  socials: Record<string, string>
}

export interface HighlightItem {
  title: string
  description: string
  imageUrl: string
  date: string
  link?: string
}

export interface YouTubeVideo {
  videoId: string
  title: string
}

export interface AboutUsSection {
  order: number
  en_title: string
  ta_title: string
  en_content: string
  ta_content: string
  image_id?: string
}

export interface AboutUsData {
  sections: AboutUsSection[]
  pdfFileId: string
  pdfTitle_en?: string
  pdfTitle_ta?: string
}

export interface PdfContent {
  base64: string
  mimeType: string
}
