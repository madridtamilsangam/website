import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDiscussionTopics } from '../services/api'
import type { DiscussionTopic } from '../types/api'

export function useDiscussionTopics() {
  const { i18n } = useTranslation()
  const [topics, setTopics] = useState<DiscussionTopic[]>([])

  useEffect(() => {
    let cancelled = false
    getDiscussionTopics()
      .then((data) => {
        if (!cancelled) setTopics(data)
      })
      .catch(() => {
        // Topic labels are cosmetic; fall back to the raw key.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isTamil = i18n.language.startsWith('ta')
  const labelFor = (key: string) => {
    const topic = topics.find((t) => t.key === key)
    if (!topic) return key
    return (isTamil ? topic.label_ta : topic.label_en) || topic.label_en
  }

  return { topics, labelFor }
}
